import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import type { NestCrow } from "../target/types/nest_crow";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256Mock(input: string): number[] {
    // Deterministic fake hash for tests — not a real SHA-256.
    const bytes = Buffer.alloc(32, 0);
    for (let i = 0; i < Math.min(input.length, 32); i++) {
        bytes[i] = input.charCodeAt(i);
    }
    return Array.from(bytes);
}

async function expectError(promise: Promise<unknown>, errorCode: string): Promise<void> {
    try {
        await promise;
        assert.fail(`Expected error "${errorCode}" but instruction succeeded`);
    } catch (err: unknown) {
        const logs =
            err && typeof err === "object" && "logs" in err
                ? ((err as { logs?: string[] }).logs?.join("\n") ?? "")
                : "";
        const msg = `${err instanceof Error ? err.message : String(err)}\n${logs}`;
        assert.include(msg, errorCode, `Expected "${errorCode}" in error message`);
    }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("nest-crow: dispute & arbitration (Sections 4-6)", () => {
    const provider = AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.NestCrow as Program<NestCrow>;
    const connection = provider.connection;

    // Actors
    const landlord = Keypair.generate();
    const tenant = Keypair.generate();
    const arbitrator = Keypair.generate();
    const oracle = Keypair.generate();
    const outsider = Keypair.generate();
    const panelists = [Keypair.generate(), Keypair.generate(), Keypair.generate()];

    // Lease economics (6-decimal USDC base units).
    const DEPOSIT = new BN(1_000_000); // 1 USDC
    const DEDUCTION = new BN(400_000); // disputed remainder locked at open_dispute
    const UNDISPUTED = DEPOSIT.sub(DEDUCTION); // released to tenant on dispute
    const LANDLORD_EST = new BN(300_000);
    const TENANT_EST = new BN(100_000);
    const MAX_FINE = LANDLORD_EST.add(TENANT_EST).divn(2); // 200_000
    const JURISDICTION = Array.from(Buffer.from("OR\0\0\0\0\0\0"));
    const DEADLINE_FUTURE = new BN(Math.floor(Date.now() / 1000) + 86400 * 365);
    const THRESHOLD = 15;

    const ARB_FEE = new BN(50_000_000); // $50

    let usdcMint: PublicKey;
    let landlordToken: PublicKey;
    let tenantToken: PublicKey;
    let arbitratorToken: PublicKey;

    // ── PDA derivation ──────────────────────────────────────────────────────────

    function pda(seed: string, leaseId: PublicKey): PublicKey {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(seed), leaseId.toBuffer()],
            program.programId,
        )[0];
    }

    interface LeasePdas {
        leaseId: PublicKey;
        escrowState: PublicKey;
        leaseConfig: PublicKey;
        claimRecord: PublicKey;
        vault: PublicKey;
        arbEscrow: PublicKey;
        arbVault: PublicKey;
        arbPanel: PublicKey;
    }

    function derive(leaseId: PublicKey): LeasePdas {
        return {
            leaseId,
            escrowState: pda("escrow", leaseId),
            leaseConfig: pda("lease-config", leaseId),
            claimRecord: pda("claim-record", leaseId),
            vault: pda("vault", leaseId),
            arbEscrow: pda("arb-escrow", leaseId),
            arbVault: pda("arb-vault", leaseId),
            arbPanel: pda("arb-panel", leaseId),
        };
    }

    // ── Flow helpers ────────────────────────────────────────────────────────────

    /** Initialize → sign → fund → photos (ACTIVE) → propose (PENDING_APPROVAL). */
    async function bringToPendingApproval(): Promise<LeasePdas> {
        const p = derive(Keypair.generate().publicKey);

        await program.methods
            .initializeEscrow(
                p.leaseId,
                tenant.publicKey,
                DEPOSIT,
                DEADLINE_FUTURE,
                JURISDICTION,
                THRESHOLD,
            )
            .accounts({
                landlord: landlord.publicKey,
                tokenMint: usdcMint,
                escrowState: p.escrowState,
                leaseConfig: p.leaseConfig,
                claimRecord: p.claimRecord,
                vault: p.vault,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([landlord])
            .rpc();

        const hash = sha256Mock("lease.pdf");
        for (const kp of [landlord, tenant]) {
            await program.methods
                .recordContractHash(hash)
                .accounts({
                    caller: kp.publicKey,
                    escrowState: p.escrowState,
                    leaseConfig: p.leaseConfig,
                    systemProgram: SystemProgram.programId,
                })
                .signers([kp])
                .rpc();
        }

        await program.methods
            .fundEscrow()
            .accounts({
                tenant: tenant.publicKey,
                escrowState: p.escrowState,
                leaseConfig: p.leaseConfig,
                tenantTokenAccount: tenantToken,
                vault: p.vault,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([tenant])
            .rpc();

        for (const kp of [landlord, tenant]) {
            await program.methods
                .recordPhotoHash(sha256Mock(`${kp.publicKey.toBase58()}-photos`))
                .accounts({
                    caller: kp.publicKey,
                    escrowState: p.escrowState,
                    claimRecord: p.claimRecord,
                    systemProgram: SystemProgram.programId,
                })
                .signers([kp])
                .rpc();
        }

        await program.methods
            .proposeRelease(DEDUCTION)
            .accounts({
                landlord: landlord.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();

        return p;
    }

    /** Initialize → sign → fund → photos (ACTIVE) → propose → open_dispute (DISPUTED). */
    async function bringToDisputed(): Promise<LeasePdas> {
        const p = await bringToPendingApproval();

        await program.methods
            .openDispute(arbitrator.publicKey, oracle.publicKey)
            .accounts({
                tenant: tenant.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                vault: p.vault,
                tenantTokenAccount: tenantToken,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([tenant])
            .rpc();

        return p;
    }

    async function submitEstimate(p: LeasePdas, signer: Keypair, estimate: BN): Promise<void> {
        await program.methods
            .submitEstimate(estimate)
            .accounts({
                signer: signer.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                systemProgram: SystemProgram.programId,
            })
            .signers([signer])
            .rpc();
    }

    async function revealEstimates(p: LeasePdas): Promise<void> {
        await program.methods
            .revealEstimates()
            .accounts({
                caller: landlord.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
            })
            .signers([landlord])
            .rpc();
    }

    /** Both parties seal estimates (300k / 100k) and reveal → max_fine = 200k. */
    async function sealAndReveal(p: LeasePdas): Promise<void> {
        await submitEstimate(p, landlord, LANDLORD_EST);
        await submitEstimate(p, tenant, TENANT_EST);
        await revealEstimates(p);
    }

    async function openArbitration(p: LeasePdas): Promise<void> {
        await program.methods
            .openArbitration(arbitrator.publicKey)
            .accounts({
                signer: landlord.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbVault: p.arbVault,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();
    }

    async function payArbFee(p: LeasePdas, payer: Keypair): Promise<void> {
        await program.methods
            .payArbitrationFee()
            .accounts({
                payer: payer.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbVault: p.arbVault,
                payerTokenAccount: payer === landlord ? landlordToken : tenantToken,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([payer])
            .rpc();
    }

    async function payPanelFee(p: LeasePdas, payer: Keypair): Promise<void> {
        await program.methods
            .payPanelUpgradeFee()
            .accounts({
                payer: payer.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbVault: p.arbVault,
                payerTokenAccount: payer === landlord ? landlordToken : tenantToken,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([payer])
            .rpc();
    }

    async function submitRuling(
        p: LeasePdas,
        panelist: Keypair,
        fine: BN,
        recipient: PublicKey,
    ): Promise<void> {
        await program.methods
            .submitPanelRuling(fine, recipient, sha256Mock(`reason-${fine.toString()}`))
            .accounts({
                panelist: panelist.publicKey,
                escrowState: p.escrowState,
                arbitrationPanel: p.arbPanel,
                systemProgram: SystemProgram.programId,
            })
            .signers([panelist])
            .rpc();
    }

    async function resolvePanel(p: LeasePdas): Promise<void> {
        await program.methods
            .resolveDisputePanel()
            .accounts({
                caller: landlord.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                arbitrationPanel: p.arbPanel,
                arbitrationEscrow: p.arbEscrow,
                vault: p.vault,
                landlordTokenAccount: landlordToken,
                landlord: landlord.publicKey,
                tenantTokenAccount: tenantToken,
                tenant: tenant.publicKey,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();
    }

    /** Full path to a panel ready to resolve, with the given three ruling fines. */
    async function buildPanel(fines: [BN, BN, BN]): Promise<LeasePdas> {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        await openArbitration(p);
        await payArbFee(p, landlord);
        await payArbFee(p, tenant);
        await payPanelFee(p, landlord);
        await payPanelFee(p, tenant);
        await program.methods
            .openPanel(panelists.map((k) => k.publicKey) as [PublicKey, PublicKey, PublicKey])
            .accounts({
                signer: landlord.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbitrationPanel: p.arbPanel,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();
        for (let i = 0; i < 3; i++) {
            await submitRuling(p, panelists[i], fines[i], landlord.publicKey);
        }
        return p;
    }

    // ── Setup ───────────────────────────────────────────────────────────────────

    before(async () => {
        for (const kp of [landlord, tenant, arbitrator, oracle, outsider, ...panelists]) {
            const sig = await connection.requestAirdrop(kp.publicKey, 10e9);
            await connection.confirmTransaction(sig);
        }

        usdcMint = await createMint(connection, landlord, landlord.publicKey, null, 6);

        landlordToken = await createAccount(connection, landlord, usdcMint, landlord.publicKey);
        tenantToken = await createAccount(connection, tenant, usdcMint, tenant.publicKey);
        arbitratorToken = await createAccount(
            connection,
            arbitrator,
            usdcMint,
            arbitrator.publicKey,
        );

        // Mint plenty for deposits and fees (1000 USDC each).
        for (const acct of [landlordToken, tenantToken]) {
            await mintTo(connection, landlord, usdcMint, acct, landlord, 1_000_000_000);
        }
    });

    // ── Section 4: dispute & fine calculation ────────────────────────────────────

    it("open_dispute releases undisputed to tenant, locks disputed, sets DISPUTED", async () => {
        const p = await bringToPendingApproval();
        const beforeOpen = (await getAccount(connection, tenantToken)).amount;
        await program.methods
            .openDispute(arbitrator.publicKey, oracle.publicKey)
            .accounts({
                tenant: tenant.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                vault: p.vault,
                tenantTokenAccount: tenantToken,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([tenant])
            .rpc();
        const afterOpen = (await getAccount(connection, tenantToken)).amount;

        const escrow = await program.account.escrowState.fetch(p.escrowState);
        assert.deepEqual(Object.keys(escrow.status)[0], "disputed");

        const claim = await program.account.claimRecord.fetch(p.claimRecord);
        assert.equal(claim.disputedTotal.toString(), DEDUCTION.toString());
        assert.equal(claim.arbitrator.toString(), arbitrator.publicKey.toString());
        assert.equal(claim.oracle.toString(), oracle.publicKey.toString());

        // Tenant received only the undisputed portion from open_dispute.
        assert.equal((afterOpen - beforeOpen).toString(), UNDISPUTED.toString());
        const vault = await getAccount(connection, p.vault);
        assert.equal(vault.amount.toString(), DEDUCTION.toString());
    });

    it("reveal_estimates fails before both estimates are sealed", async () => {
        const p = await bringToDisputed();
        await submitEstimate(p, landlord, LANDLORD_EST);
        await expectError(revealEstimates(p), "EstimatesNotSubmitted");
    });

    it("a sealed estimate cannot be revised", async () => {
        const p = await bringToDisputed();
        await submitEstimate(p, tenant, TENANT_EST);
        await expectError(submitEstimate(p, tenant, new BN(999_999)), "EstimateAlreadySubmitted");
    });

    it("reveal_estimates computes max_fine = (tenant + landlord) / 2", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        const claim = await program.account.claimRecord.fetch(p.claimRecord);
        assert.equal(claim.maxFine.toString(), MAX_FINE.toString());
        assert.isTrue(claim.estimatesRevealed);
    });

    it("oracle posts the Gemini fine; non-oracle is rejected", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);

        await expectError(
            program.methods
                .postOracleFine(new BN(150_000))
                .accounts({
                    oracle: outsider.publicKey,
                    escrowState: p.escrowState,
                    claimRecord: p.claimRecord,
                })
                .signers([outsider])
                .rpc(),
            "NotOracle",
        );

        await program.methods
            .postOracleFine(new BN(150_000))
            .accounts({
                oracle: oracle.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
            })
            .signers([oracle])
            .rpc();

        const claim = await program.account.claimRecord.fetch(p.claimRecord);
        assert.equal(claim.oracleFine.toString(), "150000");
        assert.isTrue(claim.oracleFinePosted);
    });

    it("post_oracle_fine rejects a fine above max_fine", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        await expectError(
            program.methods
                .postOracleFine(MAX_FINE.addn(1))
                .accounts({
                    oracle: oracle.publicKey,
                    escrowState: p.escrowState,
                    claimRecord: p.claimRecord,
                })
                .signers([oracle])
                .rpc(),
            "FineExceedsMaxFine",
        );
    });

    async function resolveDispute(p: LeasePdas, fine: BN): Promise<void> {
        await program.methods
            .resolveDispute(fine)
            .accounts({
                arbitrator: arbitrator.publicKey,
                escrowState: p.escrowState,
                claimRecord: p.claimRecord,
                vault: p.vault,
                tenantTokenAccount: tenantToken,
                tenant: tenant.publicKey,
                landlordTokenAccount: landlordToken,
                landlord: landlord.publicKey,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([arbitrator])
            .rpc();
    }

    it("resolve_dispute rejects a fine exceeding max_fine", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        await expectError(resolveDispute(p, MAX_FINE.addn(1)), "FineExceedsMaxFine");
    });

    it("resolve_dispute rejects a non-arbitrator caller", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        await expectError(
            program.methods
                .resolveDispute(new BN(150_000))
                .accounts({
                    arbitrator: outsider.publicKey,
                    escrowState: p.escrowState,
                    claimRecord: p.claimRecord,
                    vault: p.vault,
                    tenantTokenAccount: tenantToken,
                    tenant: tenant.publicKey,
                    landlordTokenAccount: landlordToken,
                    landlord: landlord.publicKey,
                    tokenMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([outsider])
                .rpc(),
            "NotArbitrator",
        );
    });

    it("resolve_dispute pays fine to landlord, remainder to tenant, sets RESOLVED", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);

        const fine = new BN(150_000);
        const remainder = DEDUCTION.sub(fine);
        const lBefore = (await getAccount(connection, landlordToken)).amount;
        const tBefore = (await getAccount(connection, tenantToken)).amount;

        await resolveDispute(p, fine);

        const lAfter = (await getAccount(connection, landlordToken)).amount;
        const tAfter = (await getAccount(connection, tenantToken)).amount;
        assert.equal((lAfter - lBefore).toString(), fine.toString());
        assert.equal((tAfter - tBefore).toString(), remainder.toString());

        const escrow = await program.account.escrowState.fetch(p.escrowState);
        assert.deepEqual(Object.keys(escrow.status)[0], "resolved");
        const vault = await getAccount(connection, p.vault);
        assert.equal(vault.amount.toString(), "0");
    });

    // ── Section 5: arbitration fee escrow ────────────────────────────────────────

    it("both parties pay $50 → BothPaid; arbitrator consumes the pool", async () => {
        const p = await bringToDisputed();
        await openArbitration(p);
        await payArbFee(p, landlord);
        await payArbFee(p, tenant);

        let arb = await program.account.arbitrationEscrow.fetch(p.arbEscrow);
        assert.deepEqual(Object.keys(arb.status)[0], "bothPaid");
        assert.equal(arb.total.toString(), ARB_FEE.muln(2).toString());

        const aBefore = (await getAccount(connection, arbitratorToken)).amount;
        await program.methods
            .consumeArbitrationFees()
            .accounts({
                arbitrator: arbitrator.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbVault: p.arbVault,
                arbitratorTokenAccount: arbitratorToken,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([arbitrator])
            .rpc();

        const aAfter = (await getAccount(connection, arbitratorToken)).amount;
        assert.equal((aAfter - aBefore).toString(), ARB_FEE.muln(2).toString());
        arb = await program.account.arbitrationEscrow.fetch(p.arbEscrow);
        assert.deepEqual(Object.keys(arb.status)[0], "consumed");
    });

    it("paying the fee twice is rejected", async () => {
        const p = await bringToDisputed();
        await openArbitration(p);
        await payArbFee(p, landlord);
        await expectError(payArbFee(p, landlord), "FeeAlreadyPaid");
    });

    it("consume is rejected before both parties pay", async () => {
        const p = await bringToDisputed();
        await openArbitration(p);
        await payArbFee(p, landlord);
        await expectError(
            program.methods
                .consumeArbitrationFees()
                .accounts({
                    arbitrator: arbitrator.publicKey,
                    escrowState: p.escrowState,
                    arbitrationEscrow: p.arbEscrow,
                    arbVault: p.arbVault,
                    arbitratorTokenAccount: arbitratorToken,
                    tokenMint: usdcMint,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([arbitrator])
                .rpc(),
            "FeesNotBothPaid",
        );
    });

    it("one-party default: only landlord pays, refund returns $50 to landlord", async () => {
        const p = await bringToDisputed();
        await openArbitration(p);
        await payArbFee(p, landlord);

        const lBefore = (await getAccount(connection, landlordToken)).amount;
        await program.methods
            .refundArbitrationFees()
            .accounts({
                caller: landlord.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbVault: p.arbVault,
                landlordTokenAccount: landlordToken,
                landlord: landlord.publicKey,
                tenantTokenAccount: tenantToken,
                tenant: tenant.publicKey,
                tokenMint: usdcMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();

        const lAfter = (await getAccount(connection, landlordToken)).amount;
        assert.equal((lAfter - lBefore).toString(), ARB_FEE.toString());

        const arb = await program.account.arbitrationEscrow.fetch(p.arbEscrow);
        assert.deepEqual(Object.keys(arb.status)[0], "refunded");
    });

    it("panel-upgrade fee requires the base fee first; both activate the panel track", async () => {
        const p = await bringToDisputed();
        await openArbitration(p);
        // Panel fee before base fee is rejected.
        await expectError(payPanelFee(p, landlord), "BaseFeeNotPaid");

        await payArbFee(p, landlord);
        await payArbFee(p, tenant);
        await payPanelFee(p, landlord);
        let arb = await program.account.arbitrationEscrow.fetch(p.arbEscrow);
        assert.isFalse(arb.panelUpgradePaid);
        await payPanelFee(p, tenant);
        arb = await program.account.arbitrationEscrow.fetch(p.arbEscrow);
        assert.isTrue(arb.panelUpgradePaid);
    });

    // ── Section 6: arbitration panel & minority voting ───────────────────────────

    it("Case A — unanimous: adopted fine equals the agreed amount", async () => {
        const p = await buildPanel([new BN(150_000), new BN(150_000), new BN(150_000)]);
        await resolvePanel(p);
        const panel = await program.account.arbitrationPanel.fetch(p.arbPanel);
        assert.deepEqual(Object.keys(panel.outcome)[0], "unanimous");
        assert.equal(panel.adoptedFine.toString(), "150000");
        assert.isFalse(panel.minorityDissentFlag);

        const escrow = await program.account.escrowState.fetch(p.escrowState);
        assert.deepEqual(Object.keys(escrow.status)[0], "resolved");
    });

    it("Case B — 2-1 majority, dissent below 20%: no dissent flag", async () => {
        // 150k, 150k, 170k → dissent 13.3% of majority.
        const p = await buildPanel([new BN(150_000), new BN(150_000), new BN(170_000)]);
        await resolvePanel(p);
        const panel = await program.account.arbitrationPanel.fetch(p.arbPanel);
        assert.deepEqual(Object.keys(panel.outcome)[0], "majority");
        assert.equal(panel.adoptedFine.toString(), "150000");
        assert.isFalse(panel.minorityDissentFlag);
    });

    it("Case B — 2-1 majority, dissent above 20%: flags and records the minority", async () => {
        // 100k, 100k, 150k → dissent 50% of majority.
        const p = await buildPanel([new BN(100_000), new BN(100_000), new BN(150_000)]);
        await resolvePanel(p);
        const panel = await program.account.arbitrationPanel.fetch(p.arbPanel);
        assert.deepEqual(Object.keys(panel.outcome)[0], "majority");
        assert.equal(panel.adoptedFine.toString(), "100000");
        assert.isTrue(panel.minorityDissentFlag);

        const claim = await program.account.claimRecord.fetch(p.claimRecord);
        assert.isTrue(claim.minorityDissentFlag);
        assert.equal(claim.minorityPanelist.toString(), panelists[2].publicKey.toString());
    });

    it("Case C — three-way split: adopts the median fine", async () => {
        const p = await buildPanel([new BN(100_000), new BN(150_000), new BN(180_000)]);
        await resolvePanel(p);
        const panel = await program.account.arbitrationPanel.fetch(p.arbPanel);
        assert.deepEqual(Object.keys(panel.outcome)[0], "median");
        assert.equal(panel.adoptedFine.toString(), "150000");
    });

    it("resolve_dispute_panel rejects an adopted fine above max_fine", async () => {
        // All three at 250k (unanimous) but max_fine is 200k.
        const p = await buildPanel([new BN(250_000), new BN(250_000), new BN(250_000)]);
        await expectError(resolvePanel(p), "FineExceedsMaxFine");
    });

    it("a non-panelist cannot submit a ruling", async () => {
        const p = await bringToDisputed();
        await sealAndReveal(p);
        await openArbitration(p);
        await payArbFee(p, landlord);
        await payArbFee(p, tenant);
        await payPanelFee(p, landlord);
        await payPanelFee(p, tenant);
        await program.methods
            .openPanel(panelists.map((k) => k.publicKey) as [PublicKey, PublicKey, PublicKey])
            .accounts({
                signer: landlord.publicKey,
                escrowState: p.escrowState,
                arbitrationEscrow: p.arbEscrow,
                arbitrationPanel: p.arbPanel,
                systemProgram: SystemProgram.programId,
            })
            .signers([landlord])
            .rpc();

        await expectError(
            submitRuling(p, outsider, new BN(100_000), landlord.publicKey),
            "NotPanelist",
        );
    });
});
