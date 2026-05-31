import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { verify } from "jsonwebtoken";

function ensureInit() {
    if (!getApps().length) initializeApp();
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
                leases.push({ id: doc.id, ...doc.data() });
            }
        }
    }

    return NextResponse.json(leases);
}

function walletFromCookie(req: NextRequest): string | null {
    const token = req.cookies.get("dg-session")?.value;
    if (!token) return null;
    const secret = process.env["JWT_SIGNING_SECRET"];
    if (!secret) return null;
    try {
        const payload = verify(token, secret) as { walletPubkey?: string };
        return payload.walletPubkey ?? null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    ensureInit();

    const landlordAddress = walletFromCookie(req);
    if (!landlordAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;

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
