import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

// Returns the base64-encoded unsigned record_contract_hash transaction built
// by the upload service, so the sign page can fetch it, have the wallet sign it,
// and submit it to Solana.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const data = snap.data();
    return NextResponse.json({
        contractHash: (data?.["contractHash"] as string | undefined) ?? null,
        unsignedTx: (data?.["unsignedContractHashTx"] as string | undefined) ?? null,
    });
}
