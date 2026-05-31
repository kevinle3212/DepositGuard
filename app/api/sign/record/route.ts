import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

function ensureInit() {
    if (!getApps().length) initializeApp();
}

export async function POST(req: NextRequest) {
    const { leaseId, role, walletPubkey, signatureB64, signedMessage, token } =
        (await req.json()) as {
            leaseId?: string;
            role?: "landlord" | "tenant";
            walletPubkey?: string;
            signatureB64?: string;
            signedMessage?: string;
            token?: string;
        };

    if (!leaseId || !role || !walletPubkey || !signatureB64 || !signedMessage || !token) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    ensureInit();
    const db = getFirestore();
    const ts = new Date();

    const tokenRef = db.doc(`signingTokens/${token}`);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists || tokenSnap.data()?.["used"]) {
        return NextResponse.json(
            { error: "Signing token already used or invalid" },
            { status: 409 },
        );
    }

    const field = role === "landlord" ? "landlordSignature" : "tenantSignature";
    await db
        .doc(`leases/${leaseId}`)
        .set(
            { [field]: { walletPubkey, signatureB64, signedMessage, signedAt: ts } },
            { merge: true },
        );

    await tokenRef.update({ used: true });

    return NextResponse.json({ recorded: true });
}
