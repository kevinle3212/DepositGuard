import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

interface LeaseDoc {
    status?: string;
    depositAmount?: number;
    currency?: string;
    landlordAddress?: string;
    tenantAddress?: string;
    propertyAddress?: string;
    escrowAddress?: string;
    createdAt?: string;
    updatedAt?: string;
    leaseStart?: string;
    leaseEnd?: string;
    contractHash?: string;
    contractStorageUrl?: string;
    timeline?: unknown[];
}

// Maps a Firestore lease document to the Deposit shape used by the UI
function leaseToDeposit(id: string, raw: FirebaseFirestore.DocumentData) {
    const data = raw as LeaseDoc;
    const now = new Date().toISOString();
    return {
        id,
        status: data.status ?? "Created",
        amountSol: data.depositAmount ?? 0,
        denomination: data.currency ?? "USDC",
        landlordAddress: data.landlordAddress ?? "",
        tenantAddress: data.tenantAddress ?? "",
        propertyAddress: data.propertyAddress ?? "",
        escrowAddress: data.escrowAddress ?? "",
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? data.createdAt ?? now,
        moveInDate: data.leaseStart,
        moveOutDate: data.leaseEnd,
        contractHash: data.contractHash,
        contractStorageUrl: data.contractStorageUrl,
        timeline: data.timeline ?? [
            { status: data.status ?? "Created", timestamp: data.createdAt ?? now, actor: "System" },
        ],
    };
}

export async function GET(req: NextRequest) {
    initFirebaseAdmin();
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
        return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
    }

    const db = getFirestore();
    const [asLandlord, asTenant] = await Promise.all([
        db.collection("leases").where("landlordAddress", "==", wallet).get(),
        db.collection("leases").where("tenantAddress", "==", wallet).get(),
    ]);

    const seen = new Set<string>();
    const deposits: ReturnType<typeof leaseToDeposit>[] = [];
    for (const snap of [asLandlord, asTenant]) {
        for (const doc of snap.docs) {
            if (!seen.has(doc.id)) {
                seen.add(doc.id);
                deposits.push(leaseToDeposit(doc.id, doc.data()));
            }
        }
    }

    return NextResponse.json(deposits);
}

export async function POST(req: NextRequest) {
    initFirebaseAdmin();
    const body = (await req.json()) as {
        tenantAddress?: string;
        landlordAddress?: string;
        propertyAddress?: string;
        propertyDescription?: string;
        amountSol?: number;
        denomination?: string;
        moveInDate?: string;
    };

    if (!body.tenantAddress || !body.landlordAddress || !body.propertyAddress || !body.amountSol) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getFirestore();
    const now = new Date().toISOString();
    const ref = db.collection("leases").doc();

    const data = {
        tenantAddress: body.tenantAddress,
        landlordAddress: body.landlordAddress,
        propertyAddress: body.propertyAddress,
        depositAmount: body.amountSol,
        currency: body.denomination ?? "SOL",
        status: "Created",
        landlordSigned: false,
        tenantSigned: false,
        leaseStart: body.moveInDate ?? "",
        createdAt: now,
        updatedAt: now,
        timeline: [
            {
                status: "Created",
                timestamp: now,
                actor: "Landlord",
                note: "Awaiting tenant funding",
            },
        ],
    };

    await ref.set(data);
    return NextResponse.json(leaseToDeposit(ref.id, data), { status: 201 });
}
