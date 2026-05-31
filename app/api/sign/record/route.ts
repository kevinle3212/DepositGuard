import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

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

    initFirebaseAdmin();
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

    const sigField = role === "landlord" ? "landlordSignature" : "tenantSignature";
    const signedFlag = role === "landlord" ? "landlordSigned" : "tenantSigned";
    const leaseRef = db.doc(`leases/${leaseId}`);

    // Record the signature, flip the per-role signed flag, and advance the lease
    // to "Active" once both parties have signed. Done in a transaction so the
    // both-signed check reads a consistent view of the counterparty's flag.
    const newStatus = await db.runTransaction(async (tx) => {
        const leaseSnap = await tx.get(leaseRef);
        const data = leaseSnap.data() ?? {};

        const update: Record<string, unknown> = {
            [sigField]: { walletPubkey, signatureB64, signedMessage, signedAt: ts },
            [signedFlag]: true,
        };

        const landlordSigned = role === "landlord" || data["landlordSigned"] === true;
        const tenantSigned = role === "tenant" || data["tenantSigned"] === true;
        const currentStatus = (data["status"] as string | undefined) ?? "Created";

        let status = currentStatus;
        if (landlordSigned && tenantSigned && currentStatus === "Created") {
            status = "Active";
            update["status"] = status;
        }

        tx.set(leaseRef, update, { merge: true });
        return status;
    });

    await tokenRef.update({ used: true });

    return NextResponse.json({ recorded: true, status: newStatus });
}
