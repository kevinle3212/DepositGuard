import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    VersionedTransaction,
    TransactionMessage,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Returns an unsigned VersionedTransaction for the tenant to fund the escrow.
// In production this is built by the on-chain service with a live blockhash.
export function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const payerParam = req.nextUrl.searchParams.get("payer");
    const payer = payerParam
        ? new PublicKey(payerParam)
        : new PublicKey("11111111111111111111111111111111");

    // Placeholder escrow PDA — replaced by the program-derived address in production
    const escrowPda = new PublicKey("11111111111111111111111111111111");

    const msg = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: "11111111111111111111111111111111", // replaced with live blockhash by service
        instructions: [
            SystemProgram.transfer({
                fromPubkey: payer,
                toPubkey: escrowPda,
                lamports: LAMPORTS_PER_SOL, // 1 SOL placeholder; real amount from deposit record
            }),
        ],
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    const base64 = Buffer.from(tx.serialize()).toString("base64");

    return NextResponse.json({ transaction: base64, depositId: params.id });
}
