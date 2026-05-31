import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

const SECRET = process.env["JWT_SIGNING_SECRET"] ?? "";

export async function POST(req: NextRequest) {
    if (!SECRET) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const { leaseId, role, email } = (await req.json()) as {
        leaseId?: string;
        role?: "landlord" | "tenant";
        email?: string;
    };

    if (!leaseId || !role) {
        return NextResponse.json({ error: "leaseId and role are required" }, { status: 400 });
    }

    const jti = randomUUID();
    const token = jwt.sign({ leaseId, role, email: email ?? "", jti }, SECRET, { expiresIn: "7d" });

    // Register the token in Firestore so /api/sign/record can verify it
    initFirebaseAdmin();
    const db = getFirestore();
    await db.doc(`signingTokens/${token}`).set({
        leaseId,
        role,
        email: email ?? "",
        jti,
        used: false,
        createdAt: new Date(),
    });

    return NextResponse.json({ token });
}
