import { VersionedTransaction } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export type SolanaWalletCtx = Pick<WalletContextState, "signTransaction" | "publicKey">;

/**
 * Takes a base64 unsigned transaction from our /services API, deserializes it,
 * prompts the browser wallet for a signature, and broadcasts to RPC.
 * Returns the confirmed transaction signature.
 */
export async function deserializeAndSignSolanaTx(
    base64TxStr: string,
    wallet: SolanaWalletCtx,
    connection: Connection,
): Promise<string> {
    if (!wallet.signTransaction || !wallet.publicKey) {
        throw new Error("Wallet not connected or does not support transaction signing");
    }

    const buffer = Buffer.from(base64TxStr, "base64");
    const transaction = VersionedTransaction.deserialize(buffer);

    // Prompts the browser wallet extension — user sees the approval dialog here
    const signed = await wallet.signTransaction(transaction);

    const rawTx = signed.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
    });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

    return signature;
}

// ── EVM ──────────────────────────────────────────────────────────────────────
// Requires wagmi + viem:  npm install wagmi viem @rainbow-me/rainbowkit
// Wire via the useSendTransaction hook from wagmi; this helper normalises the
// params returned by our API into the shape wagmi expects.

export interface EvmTxParams {
    to: `0x${string}`;
    data?: `0x${string}` | undefined;
    value?: bigint | undefined;
}

/** Pass the result to wagmi's sendTransactionAsync(params) inside a component. */
export function buildEvmTxParams(raw: Record<string, unknown>): EvmTxParams {
    if (raw["to"] == null || typeof raw["to"] !== "string") {
        throw new Error("EVM tx payload missing `to` address");
    }
    const params: EvmTxParams = { to: raw["to"] as `0x${string}` };
    if (raw["data"] != null) params.data = raw["data"] as `0x${string}`;
    if (raw["value"] != null) params.value = BigInt(raw["value"] as string);
    return params;
}
