import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { consume } from "@/lib/nonce-store";

const CLOCK_SKEW_SECS = 300;
const MSG_PREFIX = "NestCrow identity verification ";

function ensureAdminInit(): void {
    if (!getApps().length) initializeApp();
}

async function verifySolanaSignature(
    pubkey: string,
    signature: string,
    message: string,
): Promise<boolean> {
    try {
        const pubkeyBytes = new Uint8Array(new PublicKey(pubkey).toBytes());
        const sigBytes = new Uint8Array(Buffer.from(signature, "base64"));
        const msgBytes = new Uint8Array(new TextEncoder().encode(message));
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            pubkeyBytes,
            { name: "Ed25519" },
            false,
            ["verify"],
        );
        return await crypto.subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, msgBytes);
    } catch {
        return false;
    }
}

interface VerifyBody {
    signature: string;
    pubkey: string;
    message: string;
    chain: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Partial<VerifyBody>;
        const { signature, pubkey, message, chain } = body;

        if (!signature || !pubkey || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!message.startsWith(MSG_PREFIX)) {
            return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
        }

        // Expected format: "NestCrow identity verification <nonce> <unix_ts>"
        const payload = message.slice(MSG_PREFIX.length).trim();
        const parts = payload.split(" ");
        if (parts.length !== 2) {
            return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
        }

        const nonce = parts[0] ?? "";
        const ts = parseInt(parts[1] ?? "", 10);
        const now = Math.floor(Date.now() / 1000);
        if (isNaN(ts) || Math.abs(now - ts) > CLOCK_SKEW_SECS) {
            return NextResponse.json(
                { error: "Challenge expired or clock skew too large" },
                { status: 401 },
            );
        }

        // Validate that the nonce was issued by our server and hasn't been used before.
        // This prevents replay attacks: once consumed, the same nonce cannot be reused.
        if (!consume(pubkey, nonce)) {
            return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
        }

        if (chain === "solana" || chain === "hardware") {
            // Both Solana wallets and Tangem hardware cards use Ed25519 — same verification path.
            const valid = await verifySolanaSignature(pubkey, signature, message);
            if (!valid) {
                return NextResponse.json(
                    { error: "Signature verification failed" },
                    { status: 401 },
                );
            }
        }

        // Mint a Firebase Auth custom JWT with walletPubkey and chain as custom claims.
        // The client exchanges this for a Firebase ID token via signInWithCustomToken().
        ensureAdminInit();
        const customToken = await getAuth().createCustomToken(pubkey, {
            walletPubkey: pubkey,
            chain,
        });

        const response = NextResponse.json({ jwt: customToken, pubkey, chain }, { status: 200 });
        response.cookies.set("dg-session", customToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });
        return response;
    } catch (err) {
        console.error("[verify-wallet] error:", err);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
