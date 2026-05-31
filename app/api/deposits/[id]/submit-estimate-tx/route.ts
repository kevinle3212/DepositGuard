import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import {
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    Keypair,
} from "@solana/web3.js";

const PROGRAM_ID =
    process.env["NEST_CROW_PROGRAM_ID"] ?? "Cr81cjzduskMppdGZWBaP7GVX8H1Uqujs2Zf9dSResyi";

// Returns an unsigned VersionedTransaction for a party to submit their damage estimate.
// The estimate is stored on-chain via the submit_estimate instruction.
// If no solanaLeaseId exists for this lease, one is generated and persisted to Firestore.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const payerParam = req.nextUrl.searchParams.get("payer");
    const estimateParam = req.nextUrl.searchParams.get("estimateUsdc");

    if (!payerParam || !estimateParam) {
        return NextResponse.json(
            { error: "payer and estimateUsdc query params required" },
            { status: 400 },
        );
    }

    const estimateUsdc = parseInt(estimateParam, 10);
    if (isNaN(estimateUsdc) || estimateUsdc < 0) {
        return NextResponse.json({ error: "estimateUsdc must be a non-negative integer" }, { status: 400 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const leaseRef = db.doc(`leases/${id}`);
    const leaseSnap = await leaseRef.get();
    if (!leaseSnap.exists) {
        return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const data = leaseSnap.data() ?? {};

    // Lazily generate and persist a Solana lease ID for PDA derivation.
    let solanaLeaseId = data["solanaLeaseId"] as string | undefined;
    if (!solanaLeaseId) {
        solanaLeaseId = Keypair.generate().publicKey.toBase58();
        await leaseRef.update({ solanaLeaseId });
    }

    const programId = new PublicKey(PROGRAM_ID);
    const payer = new PublicKey(payerParam);
    const leaseIdPubkey = new PublicKey(solanaLeaseId);

    const [escrowStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), leaseIdPubkey.toBuffer()],
        programId,
    );
    const [claimRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("claim-record"), leaseIdPubkey.toBuffer()],
        programId,
    );

    // Build the submit_estimate instruction discriminator (Anchor 8-byte sha256 prefix).
    // sha256("global:submit_estimate")[0..8]
    const discriminator = Buffer.from([96, 46, 189, 5, 68, 194, 243, 119]);

    // Encode estimate as little-endian u64
    const estimateBuffer = Buffer.alloc(8);
    estimateBuffer.writeBigUInt64LE(BigInt(estimateUsdc * 1_000_000)); // USDC → micro-USDC

    const instructionData = Buffer.concat([discriminator, estimateBuffer]);

    const { Connection } = await import("@solana/web3.js");
    const rpcUrl = process.env["NEXT_PUBLIC_RPC_URL"] ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();

    const message = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions: [
            {
                programId,
                keys: [
                    { pubkey: payer, isSigner: true, isWritable: true },
                    { pubkey: escrowStatePda, isSigner: false, isWritable: false },
                    { pubkey: claimRecordPda, isSigner: false, isWritable: true },
                    {
                        pubkey: new PublicKey("11111111111111111111111111111111"),
                        isSigner: false,
                        isWritable: false,
                    },
                ],
                data: instructionData,
            },
        ],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    return NextResponse.json({
        transaction: Buffer.from(tx.serialize()).toString("base64"),
        estimateUsdc,
        solanaLeaseId,
        escrowPda: escrowStatePda.toBase58(),
        claimRecordPda: claimRecordPda.toBase58(),
    });
}
