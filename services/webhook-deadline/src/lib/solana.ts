import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const PROGRAM_ID = new PublicKey(
    process.env.NEST_CROW_PROGRAM_ID ?? "F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a",
);
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// Discriminator for `claim_timeout` from the Anchor IDL.
const CLAIM_TIMEOUT_DISC = Buffer.from([130, 234, 45, 53, 120, 90, 86, 178]);

let _secretClient: SecretManagerServiceClient | null = null;
let _cachedKeypairB58: string | null = null;

function secretClient(): SecretManagerServiceClient {
    if (!_secretClient) _secretClient = new SecretManagerServiceClient();
    return _secretClient;
}

/**
 * Returns the relayer/oracle keypair as a base58 string.
 * In production (GCP_PROJECT_ID set), fetches from Secret Manager and caches.
 * Falls back to RELAYER_KEYPAIR_BASE58 / ORACLE_KEYPAIR_BASE58 env vars.
 */
async function getRelayerKeypairB58(): Promise<string> {
    if (_cachedKeypairB58) return _cachedKeypairB58;

    const projectId = process.env.GCP_PROJECT_ID;
    if (projectId) {
        try {
            const name = `projects/${projectId}/secrets/oracle-keypair-base58/versions/latest`;
            const [version] = await secretClient().accessSecretVersion({ name });
            const value = version.payload?.data?.toString() ?? "";
            if (value) {
                _cachedKeypairB58 = value;
                return value;
            }
        } catch (err) {
            console.warn(
                "[solana] Could not fetch oracle-keypair-base58 from Secret Manager, falling back to env:",
                err,
            );
        }
    }

    const b58 = process.env.RELAYER_KEYPAIR_BASE58 ?? process.env.ORACLE_KEYPAIR_BASE58 ?? "";
    _cachedKeypairB58 = b58;
    return b58;
}

export async function loadRelayerKeypair(): Promise<Keypair> {
    const b58 = await getRelayerKeypairB58();
    if (!b58) throw new Error("RELAYER_KEYPAIR_BASE58 / oracle-keypair-base58 is not set");
    return Keypair.fromSecretKey(bs58.decode(b58));
}

export function deriveEscrowPda(leaseId: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), leaseId.toBuffer()],
        PROGRAM_ID,
    );
    return pda;
}

export function deriveVaultPda(leaseId: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), leaseId.toBuffer()],
        PROGRAM_ID,
    );
    return pda;
}

export function buildClaimTimeoutInstruction(
    relayer: PublicKey,
    leaseId: PublicKey,
    tenantTokenAccount: PublicKey,
    tokenMint: PublicKey,
): TransactionInstruction {
    const escrowState = deriveEscrowPda(leaseId);
    const vault = deriveVaultPda(leaseId);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        data: CLAIM_TIMEOUT_DISC,
        keys: [
            { pubkey: relayer, isSigner: true, isWritable: true },
            { pubkey: escrowState, isSigner: false, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: tenantTokenAccount, isSigner: false, isWritable: true },
            { pubkey: tokenMint, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
    });
}

export async function submitClaimTimeout(
    leaseId: string,
    tenantTokenAccountStr: string,
    tokenMintStr: string,
): Promise<string> {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const relayer = await loadRelayerKeypair();
    const leaseIdPubkey = new PublicKey(leaseId);
    const tenantTokenAccount = new PublicKey(tenantTokenAccountStr);
    const tokenMint = new PublicKey(tokenMintStr);

    const ix = buildClaimTimeoutInstruction(
        relayer.publicKey,
        leaseIdPubkey,
        tenantTokenAccount,
        tokenMint,
    );

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [relayer], {
        commitment: "confirmed",
    });
    return sig;
}
