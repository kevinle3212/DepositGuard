import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    VersionedTransaction,
    TransactionMessage,
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";

// Returns an unsigned VersionedTransaction for the $50 USDC arbitration staking fee.
// In production this transfers 50 USDC from the caller's ATA to the arbitration pool PDA.
export function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const payerParam = req.nextUrl.searchParams.get("payer");
    const payer = payerParam
        ? new PublicKey(payerParam)
        : new PublicKey("11111111111111111111111111111111");

    // Placeholder arbitration pool PDA
    const arbitrationPool = new PublicKey("11111111111111111111111111111111");

    const msg = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: "11111111111111111111111111111111",
        instructions: [
            // Production: use SPL-Token transfer instruction for 50 USDC (6 decimals = 50_000_000)
            SystemProgram.transfer({
                fromPubkey: payer,
                toPubkey: arbitrationPool,
                lamports: 50_000, // placeholder
            }),
        ],
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    const base64 = Buffer.from(tx.serialize()).toString("base64");

    return NextResponse.json({ transaction: base64, depositId: params.id });
}
