import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { verify } from "jsonwebtoken";

function ensureInit() {
    if (!getApps().length) initializeApp();
}

function normalizeLeaseDoc(id: string, data: FirebaseFirestore.DocumentData): Record<string, unknown> {
    return {
        id,
        propertyAddress: data["propertyAddress"] ?? "",
        landlordAddress: data["landlordAddress"] ?? "",
        tenantAddress: data["tenantAddress"] ?? "",
        depositAmount: typeof data["depositAmount"] === "number" ? data["depositAmount"] : 0,
        currency: data["currency"] ?? "USDC",
        status: data["status"] ?? "Created",
        propertyName: data["propertyName"] ?? null,
        leaseStart: data["leaseStart"] ?? null,
        leaseEnd: data["leaseEnd"] ?? null,
        landlordSigned: data["landlordSigned"] ?? false,
        tenantSigned: data["tenantSigned"] ?? false,
        contractHash: data["contractHash"] ?? null,
        contractStorageUrl: data["contractStorageUrl"] ?? null,
        createdAt: data["createdAt"] ?? null,
    };
}

export async function GET(req: NextRequest) {
    ensureInit();
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
        return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
    }

    const db = getFirestore();

    // Firestore doesn't support OR across different fields — run two queries and merge.
    const [asLandlord, asTenant] = await Promise.all([
        db.collection("leases").where("landlordAddress", "==", wallet).get(),
        db.collection("leases").where("tenantAddress", "==", wallet).get(),
    ]);

    const seen = new Set<string>();
    const leases: Record<string, unknown>[] = [];

    for (const snap of [asLandlord, asTenant]) {
        for (const doc of snap.docs) {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                leases.push(normalizeLeaseDoc(doc.id, doc.data()));
            }
        }
    }

    return NextResponse.json(leases);
}

function walletFromRequest(req: NextRequest, body: Record<string, unknown>): string | null {
    // 1. Try the httpOnly session cookie (set by /api/verify-wallet)
    const cookie = req.cookies.get("dg-session")?.value;
    if (cookie) {
        const secret = process.env["JWT_SIGNING_SECRET"];
        if (secret) {
            try {
                const payload = verify(cookie, secret) as { walletPubkey?: string };
                if (payload.walletPubkey) return payload.walletPubkey;
            } catch { /* fall through */ }
        }
    }

    // 2. Try the Authorization Bearer header (sent by apiClient)
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
    if (bearer) {
        const secret = process.env["JWT_SIGNING_SECRET"];
        if (secret) {
            try {
                const payload = verify(bearer, secret) as { walletPubkey?: string };
                if (payload.walletPubkey) return payload.walletPubkey;
            } catch { /* fall through */ }
        }
    }

    // 3. Accept landlordAddress directly from the request body (hackathon fallback)
    if (typeof body["landlordAddress"] === "string" && body["landlordAddress"].length > 0) {
        return body["landlordAddress"];
    }

    return null;
}

export async function POST(req: NextRequest) {
    ensureInit();

    const body = (await req.json()) as Record<string, unknown>;
    const landlordAddress = walletFromRequest(req, body);

    if (!landlordAddress) {
        return NextResponse.json({ error: "Unauthorized — no wallet identity found" }, { status: 401 });
    }

    const { propertyAddress, depositAmount, currency, tenantAddress, jurisdiction, contractHash, contractStorageUrl, leaseStart, leaseEnd } =
        body as {
            propertyAddress?: string;
            depositAmount?: number;
            currency?: string;
            tenantAddress?: string;
            jurisdiction?: string;
            contractHash?: string;
            contractStorageUrl?: string;
            leaseStart?: string;
            leaseEnd?: string;
        };

    if (!propertyAddress || !depositAmount || !currency || !tenantAddress) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getFirestore();
    const ref = db.collection("leases").doc();

    const now = new Date().toISOString();
    const data: Record<string, unknown> = {
        propertyAddress,
        depositAmount,
        currency,
        tenantAddress,
        landlordAddress,
        jurisdiction: jurisdiction ?? "",
        status: "Created",
        landlordSigned: false,
        tenantSigned: false,
        createdAt: now,
    };
    if (contractHash) data["contractHash"] = contractHash;
    if (contractStorageUrl) data["contractStorageUrl"] = contractStorageUrl;
    if (leaseStart) data["leaseStart"] = leaseStart;
    if (leaseEnd) data["leaseEnd"] = leaseEnd;

    await ref.set(data);

    return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
