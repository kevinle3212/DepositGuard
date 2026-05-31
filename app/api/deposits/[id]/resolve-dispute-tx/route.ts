import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { PublicKey, TransactionMessage, VersionedTransaction, Connection } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const PROGRAM_ID =
    process.env["NEST_CROW_PROGRAM_ID"] ?? "Cr81cjzduskMppdGZWBaP7GVX8H1Uqujs2Zf9dSResyi";
const USDC_MINT_DEFAULT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Builds an unsigned resolve_dispute transaction for the solo arbitrator.
// Query params: arbitrator (pubkey), fineUsdc (integer USDC amount)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const arbitratorParam = req.nextUrl.searchParams.get("arbitrator");
    const fineParam = req.nextUrl.searchParams.get("fineUsdc");

    if (!arbitratorParam || !fineParam) {
        return NextResponse.json(
            { error: "arbitrator and fineUsdc query params required" },
            { status: 400 },
        );
    }

    const fineUsdc = parseInt(fineParam, 10);
    if (isNaN(fineUsdc) || fineUsdc < 0) {
        return NextResponse.json(
            { error: "fineUsdc must be a non-negative integer" },
            { status: 400 },
        );
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${id}`).get();
    if (!snap.exists) {
        return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const solanaLeaseId = data["solanaLeaseId"] as string | undefined;
    if (!solanaLeaseId) {
        return NextResponse.json({ error: "Lease has no on-chain ID yet" }, { status: 422 });
    }

    const tenantAddress = data["tenantAddress"] as string | undefined;
    const landlordAddress = data["landlordAddress"] as string | undefined;
    if (!tenantAddress || !landlordAddress) {
        return NextResponse.json({ error: "Lease missing party addresses" }, { status: 422 });
    }

    const usdcMint = new PublicKey(
        (data["usdcMint"] as string | undefined) ?? process.env["USDC_MINT"] ?? USDC_MINT_DEFAULT,
    );

    const programId = new PublicKey(PROGRAM_ID);
    const arbitrator = new PublicKey(arbitratorParam);
    const leaseIdPubkey = new PublicKey(solanaLeaseId);
    const tenant = new PublicKey(tenantAddress);
    const landlord = new PublicKey(landlordAddress);

    const [escrowStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), leaseIdPubkey.toBuffer()],
        programId,
    );
    const [claimRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("claim-record"), leaseIdPubkey.toBuffer()],
        programId,
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), leaseIdPubkey.toBuffer()],
        programId,
    );

    const tenantAta = getAssociatedTokenAddressSync(
        usdcMint,
        tenant,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const landlordAta = getAssociatedTokenAddressSync(
        usdcMint,
        landlord,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Anchor discriminator: sha256("global:resolve_dispute")[0..8]
    const discriminator = createHash("sha256")
        .update("global:resolve_dispute")
        .digest()
        .subarray(0, 8);

    // fine_amount as little-endian u64 (micro-USDC: multiply by 1_000_000)
    const fineBuffer = Buffer.alloc(8);
    fineBuffer.writeBigUInt64LE(BigInt(fineUsdc) * BigInt(1_000_000));

    const instructionData = Buffer.concat([discriminator, fineBuffer]);

    const rpcUrl = process.env["NEXT_PUBLIC_RPC_URL"] ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();

    const message = new TransactionMessage({
        payerKey: arbitrator,
        recentBlockhash: blockhash,
        instructions: [
            {
                programId,
                keys: [
                    { pubkey: arbitrator, isSigner: true, isWritable: false },
                    { pubkey: escrowStatePda, isSigner: false, isWritable: true },
                    { pubkey: claimRecordPda, isSigner: false, isWritable: true },
                    { pubkey: vaultPda, isSigner: false, isWritable: true },
                    { pubkey: tenantAta, isSigner: false, isWritable: true },
                    { pubkey: tenant, isSigner: false, isWritable: false },
                    { pubkey: landlordAta, isSigner: false, isWritable: true },
                    { pubkey: landlord, isSigner: false, isWritable: false },
                    { pubkey: usdcMint, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
        escrowPda: escrowStatePda.toBase58(),
        claimRecordPda: claimRecordPda.toBase58(),
        fineUsdc,
    });
}
