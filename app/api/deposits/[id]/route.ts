import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const data = snap.data() ?? {};
    return NextResponse.json({
        id: snap.id,
        ...data,
    });
}
