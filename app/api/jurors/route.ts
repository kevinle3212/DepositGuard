import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

export interface JurorRecord {
    walletAddress: string;
    registeredAt: string;
    stakedAt: string;
    stakeSol: number;
    casesServed: number;
}

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/jurors — returns all registered jurors sorted by stake
export async function GET() {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.collection("jurors").orderBy("stakeSol", "desc").limit(100).get();
    const now = new Date().toISOString();
    const jurors: JurorRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
            walletAddress: d.id,
            registeredAt: (data["registeredAt"] as string | undefined) ?? now,
            stakedAt: (data["stakedAt"] as string | undefined) ?? now,
            stakeSol:
                (data["stakeSol"] as number | undefined) ??
                (data["stakeUsdc"] as number | undefined) ??
                0,
            casesServed: (data["casesServed"] as number | undefined) ?? 0,
        };
    });
    return NextResponse.json({ jurors });
}

// POST /api/jurors — register or add stake (resets the 7-day cooldown clock)
// Body: { walletAddress: string, stakeSol: number }
export async function POST(req: NextRequest) {
    const body = (await req.json()) as { walletAddress?: string; stakeSol?: number };

    if (!body.walletAddress || typeof body.walletAddress !== "string") {
        return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }
    const addSol = typeof body.stakeSol === "number" && body.stakeSol > 0 ? body.stakeSol : 1;

    initFirebaseAdmin();
    const db = getFirestore();
    const ref = db.doc(`jurors/${body.walletAddress}`);
    const existing = await ref.get();
    const now = new Date().toISOString();

    if (existing.exists) {
        const prev = (existing.data()?.["stakeSol"] as number | undefined) ?? 0;
        const newTotal = prev + addSol;
        await ref.update({ stakeSol: newTotal, stakedAt: now, updatedAt: now });
        return NextResponse.json({
            ok: true,
            walletAddress: body.walletAddress,
            stakeSol: newTotal,
            stakedAt: now,
        });
    }

    await ref.set({
        walletAddress: body.walletAddress,
        registeredAt: now,
        stakedAt: now,
        stakeSol: addSol,
        casesServed: 0,
    });
    return NextResponse.json({
        ok: true,
        walletAddress: body.walletAddress,
        stakeSol: addSol,
        stakedAt: now,
    });
}

// DELETE /api/jurors — full withdrawal; blocked within 7-day cooldown
// Body: { walletAddress: string }
export async function DELETE(req: NextRequest) {
    const body = (await req.json()) as { walletAddress?: string };

    if (!body.walletAddress || typeof body.walletAddress !== "string") {
        return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const ref = db.doc(`jurors/${body.walletAddress}`);
    const snap = await ref.get();

    if (!snap.exists) {
        return NextResponse.json({ error: "Not registered as a juror" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const stakedAt =
        (data["stakedAt"] as string | undefined) ?? (data["registeredAt"] as string | undefined);

    if (stakedAt !== undefined) {
        const elapsed = Date.now() - new Date(stakedAt).getTime();
        if (elapsed < COOLDOWN_MS) {
            const remainingDays = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
            return NextResponse.json(
                {
                    error: `Cooldown active. You can unstake in ${remainingDays} day${remainingDays !== 1 ? "s" : ""}.`,
                    cooldownDays: remainingDays,
                },
                { status: 423 },
            );
        }
    }

    await ref.delete();
    return NextResponse.json({ ok: true, walletAddress: body.walletAddress });
}
