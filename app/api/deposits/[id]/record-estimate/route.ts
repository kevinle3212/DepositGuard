import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { verify } from "jsonwebtoken";

function walletFromRequest(req: NextRequest): string | null {
    const secret = process.env["JWT_SIGNING_SECRET"];
    if (!secret) return null;
    const cookie = req.cookies.get("dg-session")?.value;
    if (cookie) {
        try {
            const p = verify(cookie, secret) as { walletPubkey?: string };
            if (p.walletPubkey) return p.walletPubkey;
        } catch {
            /* fall through */
        }
    }
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
    if (bearer) {
        try {
            const p = verify(bearer, secret) as { walletPubkey?: string };
            if (p.walletPubkey) return p.walletPubkey;
        } catch {
            /* fall through */
        }
    }
    return null;
}

// POST — record a party's damage estimate and on-chain signature in Firestore.
// Body: { estimateUsdc: number; txSignature?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const wallet = walletFromRequest(req);
    if (!wallet) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = (await req.json()) as { estimateUsdc?: number; txSignature?: string };
    if (typeof body.estimateUsdc !== "number" || body.estimateUsdc < 0) {
        return NextResponse.json({ error: "estimateUsdc required" }, { status: 400 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const leaseRef = db.doc(`leases/${id}`);
    const leaseSnap = await leaseRef.get();
    if (!leaseSnap.exists) {
        return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const data = leaseSnap.data() ?? {};
    const isLandlord = data["landlordAddress"] === wallet;
    const isTenant = data["tenantAddress"] === wallet;

    if (!isLandlord && !isTenant) {
        return NextResponse.json({ error: "Not a party to this lease" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};

    if (isLandlord) {
        update["landlordEstimateUsdc"] = body.estimateUsdc;
        update["landlordEstimateSubmittedAt"] = now;
        if (body.txSignature) update["landlordEstimateTxSig"] = body.txSignature;
    } else {
        update["tenantEstimateUsdc"] = body.estimateUsdc;
        update["tenantEstimateSubmittedAt"] = now;
        if (body.txSignature) update["tenantEstimateTxSig"] = body.txSignature;
    }

    // If both estimates are now in, compute the max_fine (average) and flag it.
    const landlordEst = isLandlord
        ? body.estimateUsdc
        : (data["landlordEstimateUsdc"] as number | undefined);
    const tenantEst = isTenant
        ? body.estimateUsdc
        : (data["tenantEstimateUsdc"] as number | undefined);

    if (typeof landlordEst === "number" && typeof tenantEst === "number") {
        update["maxFineUsdc"] = Math.round((landlordEst + tenantEst) / 2);
        update["estimatesRevealed"] = true;
    }

    await leaseRef.update(update);

    return NextResponse.json({
        recorded: true,
        role: isLandlord ? "landlord" : "tenant",
        estimateUsdc: body.estimateUsdc,
        bothSubmitted: typeof landlordEst === "number" && typeof tenantEst === "number",
        maxFineUsdc: update["maxFineUsdc"] ?? null,
    });
}
