import { Connection, clusterApiUrl, type Cluster } from "@solana/web3.js";

const NETWORK = (process.env["NEXT_PUBLIC_SOLANA_NETWORK"] ?? "devnet") as Cluster;
const RPC_URL = process.env["NEXT_PUBLIC_SOLANA_RPC_URL"] ?? clusterApiUrl(NETWORK);

export function getConnection(): Connection {
    return new Connection(RPC_URL, "confirmed");
}

export const SOLANA_NETWORK = NETWORK;
export const SOLANA_RPC_URL = RPC_URL;

export async function getWalletBalance(publicKeyStr: string): Promise<number> {
    const { PublicKey } = await import("@solana/web3.js");
    const connection = getConnection();
    const pubkey = new PublicKey(publicKeyStr);
    const lamports = await connection.getBalance(pubkey);
    return lamports / 1_000_000_000;
}
