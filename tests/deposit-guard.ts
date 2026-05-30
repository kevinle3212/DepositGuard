import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider, BN } from "@anchor-lang/core";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import type { DepositGuard } from "../target/types/deposit_guard";

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256Mock(input: string): number[] {
  // Deterministic fake hash for tests — not a real SHA-256.
  const bytes = Buffer.alloc(32, 0);
  for (let i = 0; i < Math.min(input.length, 32); i++) {
    bytes[i] = input.charCodeAt(i);
  }
  return Array.from(bytes);
}

async function expectError(
  promise: Promise<unknown>,
  errorCode: string
): Promise<void> {
  try {
    await promise;
    assert.fail(`Expected error "${errorCode}" but instruction succeeded`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert.include(msg, errorCode, `Expected "${errorCode}" in error message`);
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("deposit-guard", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DepositGuard as Program<DepositGuard>;
  const connection = provider.connection;

  // Test actors
  const landlord = Keypair.generate();
  const tenant = Keypair.generate();
  const outsider = Keypair.generate();

  // Lease params
  const leaseId = Keypair.generate().publicKey;
  const DEPOSIT_AMOUNT = new BN(1_000_000); // 1 USDC (6 decimals)
  const JURISDICTION = Array.from(Buffer.from("OR\0\0\0\0\0\0"));
  const DEADLINE_PAST = new BN(1); // always in the past
  const DEADLINE_FUTURE = new BN(Math.floor(Date.now() / 1000) + 86400 * 365);
  const DISPUTE_THRESHOLD = 15;

  // PDAs
  let escrowStatePda: PublicKey;
  let leaseConfigPda: PublicKey;
  let claimRecordPda: PublicKey;
  let vaultPda: PublicKey;

  // Token accounts
  let usdcMint: PublicKey;
  let landlordTokenAccount: PublicKey;
  let tenantTokenAccount: PublicKey;

  // ── Timeout test uses a separate lease ──────────────────────────────────────
  const leaseIdTimeout = Keypair.generate().publicKey;
  let escrowStateTimeout: PublicKey;
  let leaseConfigTimeout: PublicKey;
  let claimRecordTimeout: PublicKey;
  let vaultTimeout: PublicKey;

  // ── Setup ───────────────────────────────────────────────────────────────────

  before(async () => {
    // Fund test wallets
    for (const kp of [landlord, tenant, outsider]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 10e9);
      await connection.confirmTransaction(sig);
    }

    // Create USDC-like mint (6 decimals)
    usdcMint = await createMint(
      connection,
      landlord,
      landlord.publicKey,
      null,
      6
    );

    // Create token accounts and mint deposit × 2 to tenant
    landlordTokenAccount = await createAccount(
      connection,
      landlord,
      usdcMint,
      landlord.publicKey
    );
    tenantTokenAccount = await createAccount(
      connection,
      tenant,
      usdcMint,
      tenant.publicKey
    );
    await mintTo(
      connection,
      landlord,
      usdcMint,
      tenantTokenAccount,
      landlord,
      DEPOSIT_AMOUNT.toNumber() * 10
    );

    // Derive PDAs for the main lease
    [escrowStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), leaseId.toBuffer()],
      program.programId
    );
    [leaseConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease-config"), leaseId.toBuffer()],
      program.programId
    );
    [claimRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim-record"), leaseId.toBuffer()],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), leaseId.toBuffer()],
      program.programId
    );

    // Derive PDAs for the timeout lease
    [escrowStateTimeout] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), leaseIdTimeout.toBuffer()],
      program.programId
    );
    [leaseConfigTimeout] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease-config"), leaseIdTimeout.toBuffer()],
      program.programId
    );
    [claimRecordTimeout] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim-record"), leaseIdTimeout.toBuffer()],
      program.programId
    );
    [vaultTimeout] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), leaseIdTimeout.toBuffer()],
      program.programId
    );
  });

  // ── initialize_escrow ───────────────────────────────────────────────────────

  it("initializes escrow with CREATED status", async () => {
    await program.methods
      .initializeEscrow(
        leaseId,
        tenant.publicKey,
        DEPOSIT_AMOUNT,
        DEADLINE_FUTURE,
        JURISDICTION,
        DISPUTE_THRESHOLD
      )
      .accounts({
        landlord: landlord.publicKey,
        tokenMint: usdcMint,
        escrowState: escrowStatePda,
        leaseConfig: leaseConfigPda,
        claimRecord: claimRecordPda,
        vault: vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([landlord])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(escrow.leaseId.toString(), leaseId.toString());
    assert.deepEqual(escrow.landlord.toString(), landlord.publicKey.toString());
    assert.deepEqual(escrow.tenant.toString(), tenant.publicKey.toString());
    assert.deepEqual(Object.keys(escrow.status)[0], "created");
    assert.equal(escrow.depositAmount.toNumber(), DEPOSIT_AMOUNT.toNumber());

    const config = await program.account.leaseConfig.fetch(leaseConfigPda);
    assert.isFalse(config.landlordSigned);
    assert.isFalse(config.tenantSigned);
  });

  // ── record_contract_hash ────────────────────────────────────────────────────

  it("landlord records contract hash and becomes signed", async () => {
    const hash = sha256Mock("lease-v1.pdf");

    await program.methods
      .recordContractHash(hash)
      .accounts({
        caller: landlord.publicKey,
        escrowState: escrowStatePda,
        leaseConfig: leaseConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    const config = await program.account.leaseConfig.fetch(leaseConfigPda);
    assert.isTrue(config.landlordSigned);
    assert.isFalse(config.tenantSigned);
    assert.deepEqual(Array.from(config.contractHash), hash);
  });

  it("outsider cannot record contract hash", async () => {
    await expectError(
      program.methods
        .recordContractHash(sha256Mock("evil.pdf"))
        .accounts({
          caller: outsider.publicKey,
          escrowState: escrowStatePda,
          leaseConfig: leaseConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([outsider])
        .rpc(),
      "NotParty"
    );
  });

  it("tenant mismatched hash is rejected", async () => {
    await expectError(
      program.methods
        .recordContractHash(sha256Mock("different-file.pdf"))
        .accounts({
          caller: tenant.publicKey,
          escrowState: escrowStatePda,
          leaseConfig: leaseConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([tenant])
        .rpc(),
      "ContractHashMismatch"
    );
  });

  it("tenant confirms matching hash and becomes signed", async () => {
    const hash = sha256Mock("lease-v1.pdf");

    await program.methods
      .recordContractHash(hash)
      .accounts({
        caller: tenant.publicKey,
        escrowState: escrowStatePda,
        leaseConfig: leaseConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    const config = await program.account.leaseConfig.fetch(leaseConfigPda);
    assert.isTrue(config.landlordSigned);
    assert.isTrue(config.tenantSigned);
  });

  // ── fund_escrow ─────────────────────────────────────────────────────────────

  it("funds escrow after both parties have signed", async () => {
    const balanceBefore = (await getAccount(connection, tenantTokenAccount))
      .amount;

    await program.methods
      .fundEscrow()
      .accounts({
        tenant: tenant.publicKey,
        escrowState: escrowStatePda,
        leaseConfig: leaseConfigPda,
        tenantTokenAccount,
        vault: vaultPda,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(Object.keys(escrow.status)[0], "funded");

    const vaultAccount = await getAccount(connection, vaultPda);
    assert.equal(vaultAccount.amount.toString(), DEPOSIT_AMOUNT.toString());

    const balanceAfter = (await getAccount(connection, tenantTokenAccount))
      .amount;
    assert.equal(
      (balanceBefore - balanceAfter).toString(),
      DEPOSIT_AMOUNT.toString()
    );
  });

  it("rejects double-funding", async () => {
    await expectError(
      program.methods
        .fundEscrow()
        .accounts({
          tenant: tenant.publicKey,
          escrowState: escrowStatePda,
          leaseConfig: leaseConfigPda,
          tenantTokenAccount,
          vault: vaultPda,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([tenant])
        .rpc(),
      "NotCreated"
    );
  });

  // ── record_photo_hash ───────────────────────────────────────────────────────

  it("landlord submits photo hash → status becomes PENDING_DOCUMENTATION", async () => {
    await program.methods
      .recordPhotoHash(sha256Mock("landlord-photos.zip"))
      .accounts({
        caller: landlord.publicKey,
        escrowState: escrowStatePda,
        claimRecord: claimRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(Object.keys(escrow.status)[0], "pendingDocumentation");

    const claim = await program.account.claimRecord.fetch(claimRecordPda);
    assert.isTrue(claim.landlordPhotosSubmitted);
    assert.isFalse(claim.tenantPhotosSubmitted);
  });

  it("landlord cannot submit photo hash twice", async () => {
    await expectError(
      program.methods
        .recordPhotoHash(sha256Mock("landlord-photos-v2.zip"))
        .accounts({
          caller: landlord.publicKey,
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "LandlordPhotosAlreadySubmitted"
    );
  });

  it("tenant submits photo hash → status becomes ACTIVE", async () => {
    await program.methods
      .recordPhotoHash(sha256Mock("tenant-photos.zip"))
      .accounts({
        caller: tenant.publicKey,
        escrowState: escrowStatePda,
        claimRecord: claimRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(Object.keys(escrow.status)[0], "active");

    const claim = await program.account.claimRecord.fetch(claimRecordPda);
    assert.isTrue(claim.landlordPhotosSubmitted);
    assert.isTrue(claim.tenantPhotosSubmitted);
  });

  it("outsider cannot submit photo hash", async () => {
    await expectError(
      program.methods
        .recordPhotoHash(sha256Mock("evil-photos.zip"))
        .accounts({
          caller: outsider.publicKey,
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([outsider])
        .rpc(),
      "NotParty"
    );
  });

  // ── propose_release ─────────────────────────────────────────────────────────

  it("tenant cannot propose release", async () => {
    await expectError(
      program.methods
        .proposeRelease(new BN(100_000))
        .accounts({
          landlord: tenant.publicKey, // tenant trying to pose as landlord
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([tenant])
        .rpc(),
      "NotLandlord"
    );
  });

  it("rejects deduction exceeding deposit", async () => {
    await expectError(
      program.methods
        .proposeRelease(DEPOSIT_AMOUNT.addn(1))
        .accounts({
          landlord: landlord.publicKey,
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "DeductionExceedsDeposit"
    );
  });

  it("landlord proposes deduction → status becomes PENDING_APPROVAL", async () => {
    const deduction = new BN(200_000); // $0.20

    await program.methods
      .proposeRelease(deduction)
      .accounts({
        landlord: landlord.publicKey,
        escrowState: escrowStatePda,
        claimRecord: claimRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(Object.keys(escrow.status)[0], "pendingApproval");

    const claim = await program.account.claimRecord.fetch(claimRecordPda);
    assert.equal(claim.landlordEstimate.toNumber(), deduction.toNumber());
    assert.equal(
      claim.undisputed_total?.toNumber() ?? claim.undisputedTotal?.toNumber(),
      DEPOSIT_AMOUNT.toNumber() - deduction.toNumber()
    );
  });

  // ── approve_release ─────────────────────────────────────────────────────────

  it("landlord cannot call approve_release", async () => {
    await expectError(
      program.methods
        .approveRelease()
        .accounts({
          tenant: landlord.publicKey, // landlord posing as tenant
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          vault: vaultPda,
          tenantTokenAccount,
          landlordTokenAccount,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "NotTenant"
    );
  });

  it("tenant approves release → funds disbursed, status = RELEASED", async () => {
    const deduction = 200_000;
    const undisputed = DEPOSIT_AMOUNT.toNumber() - deduction;

    const tenantBefore = (await getAccount(connection, tenantTokenAccount))
      .amount;
    const landlordBefore = (
      await getAccount(connection, landlordTokenAccount)
    ).amount;

    await program.methods
      .approveRelease()
      .accounts({
        tenant: tenant.publicKey,
        escrowState: escrowStatePda,
        claimRecord: claimRecordPda,
        vault: vaultPda,
        tenantTokenAccount,
        landlordTokenAccount,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowStatePda);
    assert.deepEqual(Object.keys(escrow.status)[0], "released");

    const tenantAfter = (await getAccount(connection, tenantTokenAccount))
      .amount;
    const landlordAfter = (
      await getAccount(connection, landlordTokenAccount)
    ).amount;

    assert.equal(
      (tenantAfter - tenantBefore).toString(),
      undisputed.toString()
    );
    assert.equal(
      (landlordAfter - landlordBefore).toString(),
      deduction.toString()
    );

    const vault = await getAccount(connection, vaultPda);
    assert.equal(vault.amount.toString(), "0");
  });

  it("rejects approve_release after funds are already released", async () => {
    await expectError(
      program.methods
        .approveRelease()
        .accounts({
          tenant: tenant.publicKey,
          escrowState: escrowStatePda,
          claimRecord: claimRecordPda,
          vault: vaultPda,
          tenantTokenAccount,
          landlordTokenAccount,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([tenant])
        .rpc(),
      "NotPendingApproval"
    );
  });

  // ── close_escrow ────────────────────────────────────────────────────────────

  it("closes escrow and reclaims rent", async () => {
    await program.methods
      .closeEscrow()
      .accounts({
        landlord: landlord.publicKey,
        escrowState: escrowStatePda,
        leaseConfig: leaseConfigPda,
        claimRecord: claimRecordPda,
        vault: vaultPda,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    const escrowInfo = await connection.getAccountInfo(escrowStatePda);
    assert.isNull(escrowInfo, "EscrowState account should be closed");

    const vaultInfo = await connection.getAccountInfo(vaultPda);
    assert.isNull(vaultInfo, "Vault token account should be closed");
  });

  // ── claim_timeout ────────────────────────────────────────────────────────────

  it("claim_timeout: rejects if deadline has not passed", async () => {
    // Initialize a second escrow with a future deadline.
    await program.methods
      .initializeEscrow(
        leaseIdTimeout,
        tenant.publicKey,
        DEPOSIT_AMOUNT,
        DEADLINE_FUTURE,
        JURISDICTION,
        DISPUTE_THRESHOLD
      )
      .accounts({
        landlord: landlord.publicKey,
        tokenMint: usdcMint,
        escrowState: escrowStateTimeout,
        leaseConfig: leaseConfigTimeout,
        claimRecord: claimRecordTimeout,
        vault: vaultTimeout,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([landlord])
      .rpc();

    // Both parties sign
    const hash = sha256Mock("lease-timeout.pdf");
    await program.methods
      .recordContractHash(hash)
      .accounts({
        caller: landlord.publicKey,
        escrowState: escrowStateTimeout,
        leaseConfig: leaseConfigTimeout,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();
    await program.methods
      .recordContractHash(hash)
      .accounts({
        caller: tenant.publicKey,
        escrowState: escrowStateTimeout,
        leaseConfig: leaseConfigTimeout,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    // Fund
    await program.methods
      .fundEscrow()
      .accounts({
        tenant: tenant.publicKey,
        escrowState: escrowStateTimeout,
        leaseConfig: leaseConfigTimeout,
        tenantTokenAccount,
        vault: vaultTimeout,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    // Both parties submit photos → ACTIVE
    await program.methods
      .recordPhotoHash(sha256Mock("landlord-timeout.zip"))
      .accounts({
        caller: landlord.publicKey,
        escrowState: escrowStateTimeout,
        claimRecord: claimRecordTimeout,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();
    await program.methods
      .recordPhotoHash(sha256Mock("tenant-timeout.zip"))
      .accounts({
        caller: tenant.publicKey,
        escrowState: escrowStateTimeout,
        claimRecord: claimRecordTimeout,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    // Attempt early timeout — must fail.
    await expectError(
      program.methods
        .claimTimeout()
        .accounts({
          relayer: landlord.publicKey,
          escrowState: escrowStateTimeout,
          vault: vaultTimeout,
          tenantTokenAccount,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "DeadlineNotPassed"
    );
  });

  it("claim_timeout: releases full balance to tenant after deadline", async () => {
    // Re-initialize a fresh escrow with DEADLINE_PAST (timestamp = 1).
    const leaseIdPast = Keypair.generate().publicKey;
    const [escrowPast] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), leaseIdPast.toBuffer()],
      program.programId
    );
    const [configPast] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease-config"), leaseIdPast.toBuffer()],
      program.programId
    );
    const [claimPast] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim-record"), leaseIdPast.toBuffer()],
      program.programId
    );
    const [vaultPast] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), leaseIdPast.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeEscrow(
        leaseIdPast,
        tenant.publicKey,
        DEPOSIT_AMOUNT,
        DEADLINE_PAST,
        JURISDICTION,
        DISPUTE_THRESHOLD
      )
      .accounts({
        landlord: landlord.publicKey,
        tokenMint: usdcMint,
        escrowState: escrowPast,
        leaseConfig: configPast,
        claimRecord: claimPast,
        vault: vaultPast,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([landlord])
      .rpc();

    const hash = sha256Mock("lease-past.pdf");
    for (const [kp] of [
      [landlord],
      [tenant],
    ] as [Keypair][]) {
      await program.methods
        .recordContractHash(hash)
        .accounts({
          caller: kp.publicKey,
          escrowState: escrowPast,
          leaseConfig: configPast,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc();
    }

    await program.methods
      .fundEscrow()
      .accounts({
        tenant: tenant.publicKey,
        escrowState: escrowPast,
        leaseConfig: configPast,
        tenantTokenAccount,
        vault: vaultPast,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    // Submit photos to reach ACTIVE
    await program.methods
      .recordPhotoHash(sha256Mock("l-past.zip"))
      .accounts({
        caller: landlord.publicKey,
        escrowState: escrowPast,
        claimRecord: claimPast,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();
    await program.methods
      .recordPhotoHash(sha256Mock("t-past.zip"))
      .accounts({
        caller: tenant.publicKey,
        escrowState: escrowPast,
        claimRecord: claimPast,
        systemProgram: SystemProgram.programId,
      })
      .signers([tenant])
      .rpc();

    const tenantBefore = (await getAccount(connection, tenantTokenAccount))
      .amount;

    await program.methods
      .claimTimeout()
      .accounts({
        relayer: landlord.publicKey,
        escrowState: escrowPast,
        vault: vaultPast,
        tenantTokenAccount,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    const escrow = await program.account.escrowState.fetch(escrowPast);
    assert.deepEqual(Object.keys(escrow.status)[0], "released");

    const tenantAfter = (await getAccount(connection, tenantTokenAccount))
      .amount;
    assert.equal(
      (tenantAfter - tenantBefore).toString(),
      DEPOSIT_AMOUNT.toString()
    );

    const vault = await getAccount(connection, vaultPast);
    assert.equal(vault.amount.toString(), "0");
  });

  // ── Invalid state transition guard tests ─────────────────────────────────────

  it("rejects fund_escrow when lease is not signed", async () => {
    // Create a fresh escrow where neither party has signed.
    const leaseIdUnsigned = Keypair.generate().publicKey;
    const [escrowUnsigned] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), leaseIdUnsigned.toBuffer()],
      program.programId
    );
    const [configUnsigned] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease-config"), leaseIdUnsigned.toBuffer()],
      program.programId
    );
    const [claimUnsigned] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim-record"), leaseIdUnsigned.toBuffer()],
      program.programId
    );
    const [vaultUnsigned] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), leaseIdUnsigned.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeEscrow(
        leaseIdUnsigned,
        tenant.publicKey,
        DEPOSIT_AMOUNT,
        DEADLINE_FUTURE,
        JURISDICTION,
        DISPUTE_THRESHOLD
      )
      .accounts({
        landlord: landlord.publicKey,
        tokenMint: usdcMint,
        escrowState: escrowUnsigned,
        leaseConfig: configUnsigned,
        claimRecord: claimUnsigned,
        vault: vaultUnsigned,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([landlord])
      .rpc();

    await expectError(
      program.methods
        .fundEscrow()
        .accounts({
          tenant: tenant.publicKey,
          escrowState: escrowUnsigned,
          leaseConfig: configUnsigned,
          tenantTokenAccount,
          vault: vaultUnsigned,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([tenant])
        .rpc(),
      "LeaseNotSigned"
    );
  });

  it("rejects propose_release when not in ACTIVE status", async () => {
    // Use the timeout escrow which is now in ACTIVE status (funded + photos).
    // Advance to PENDING_APPROVAL first by proposing.
    await program.methods
      .proposeRelease(new BN(0))
      .accounts({
        landlord: landlord.publicKey,
        escrowState: escrowStateTimeout,
        claimRecord: claimRecordTimeout,
        systemProgram: SystemProgram.programId,
      })
      .signers([landlord])
      .rpc();

    // Now it is PENDING_APPROVAL; a second propose must fail.
    await expectError(
      program.methods
        .proposeRelease(new BN(0))
        .accounts({
          landlord: landlord.publicKey,
          escrowState: escrowStateTimeout,
          claimRecord: claimRecordTimeout,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "NotActive"
    );
  });

  it("rejects close_escrow when status is not final", async () => {
    await expectError(
      program.methods
        .closeEscrow()
        .accounts({
          landlord: landlord.publicKey,
          escrowState: escrowStateTimeout,
          leaseConfig: leaseConfigTimeout,
          claimRecord: claimRecordTimeout,
          vault: vaultTimeout,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([landlord])
        .rpc(),
      "NotFinalStatus"
    );
  });
});
