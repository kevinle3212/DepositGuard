import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

const SECRET = process.env["JWT_SIGNING_SECRET"] ?? "";

export async function POST(req: NextRequest) {
    const { token } = (await req.json()) as { token?: string };
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    if (!SECRET) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

    let payload: { leaseId: string; role: "landlord" | "tenant"; email: string; jti: string };
    try {
        payload = jwt.verify(token, SECRET) as typeof payload;
    } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        return NextResponse.json(
            {
                error: msg.includes("expired")
                    ? "Token expired"
                    : "Invalid or expired signing token",
            },
            { status: 401 },
        );
    }

    // Check whether this token has already been used in Firestore
    try {
        initFirebaseAdmin();
        const snap = await getFirestore().doc(`signingTokens/${token}`).get();
        if (snap.exists && snap.data()?.["used"] === true) {
            return NextResponse.json(
                { error: "Token already used — lease already signed" },
                { status: 409 },
            );
        }
    } catch {
        // If Firestore check fails, still allow the token if JWT signature is valid
    }

    return NextResponse.json({
        valid: true,
        leaseId: payload.leaseId,
        role: payload.role,
        email: payload.email,
    });
}
