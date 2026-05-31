import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

export interface JurorRecord {
    walletAddress: string;
    registeredAt: string;
    stakeSol: number;
    casesServed: number;
}

// GET /api/jurors — returns all registered jurors
export async function GET() {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.collection("jurors").orderBy("registeredAt", "desc").limit(100).get();
    const jurors: JurorRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
            walletAddress: d.id,
            registeredAt: (data["registeredAt"] as string | undefined) ?? new Date().toISOString(),
            stakeSol:
                (data["stakeSol"] as number | undefined) ??
                (data["stakeUsdc"] as number | undefined) ??
                0,
            casesServed: (data["casesServed"] as number | undefined) ?? 0,
        };
    });
    return NextResponse.json({ jurors });
}

// POST /api/jurors — register or update a juror's stake
// Body: { walletAddress: string, stakeSol: number }
export async function POST(req: NextRequest) {
    const body = (await req.json()) as { walletAddress?: string; stakeSol?: number };

    if (!body.walletAddress || typeof body.walletAddress !== "string") {
        return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }
    const stakeSol = typeof body.stakeSol === "number" && body.stakeSol >= 0 ? body.stakeSol : 1;

    initFirebaseAdmin();
    const db = getFirestore();
    const ref = db.doc(`jurors/${body.walletAddress}`);
    const existing = await ref.get();

    if (existing.exists) {
        await ref.update({ stakeSol, updatedAt: new Date().toISOString() });
    } else {
        await ref.set({
            walletAddress: body.walletAddress,
            registeredAt: new Date().toISOString(),
            stakeSol,
            casesServed: 0,
        });
    }

    return NextResponse.json({ ok: true, walletAddress: body.walletAddress, stakeSol });
}
