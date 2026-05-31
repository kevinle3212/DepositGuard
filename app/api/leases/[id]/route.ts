import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

function ensureInit() {
    if (!getApps().length) initializeApp();
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    ensureInit();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...snap.data() });
}
