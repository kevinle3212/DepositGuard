import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { leaseToDeposit } from "@/lib/deposit-mapper";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    // Normalize to the same `Deposit` shape the list route returns so the detail
    // page receives `amountSol`, `denomination`, and a guaranteed `timeline`.
    return NextResponse.json(leaseToDeposit(snap.id, snap.data() ?? {}));
}
