import { randomBytes } from "crypto";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Local in-memory fallback (used if Firestore is unavailable) ──────────────
const g = globalThis as typeof globalThis & {
    _nonceStore?: Map<string, { nonce: string; expiresAt: number }>;
};
g._nonceStore ??= new Map();
const memStore = g._nonceStore;

function memIssue(pubkey: string): string {
    const now = Date.now();
    memStore.forEach((v, k) => {
        if (v.expiresAt < now) memStore.delete(k);
    });
    const nonce = randomBytes(16).toString("hex");
    memStore.set(pubkey, { nonce, expiresAt: now + TTL_MS });
    return nonce;
}

function memConsume(pubkey: string, nonce: string): boolean {
    const entry = memStore.get(pubkey);
    if (!entry || entry.expiresAt < Date.now() || entry.nonce !== nonce) {
        memStore.delete(pubkey);
        return false;
    }
    memStore.delete(pubkey);
    return true;
}

// ─── Firestore-backed store (works across multiple server instances) ───────────
async function fsIssue(pubkey: string): Promise<string> {
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = Date.now() + TTL_MS;
    initFirebaseAdmin();
    await getFirestore().collection("nonces").doc(pubkey).set({ nonce, expiresAt });
    return nonce;
}

async function fsConsume(pubkey: string, nonce: string): Promise<boolean> {
    initFirebaseAdmin();
    const db = getFirestore();
    const ref = db.collection("nonces").doc(pubkey);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        const data = snap.data() ?? {};
        if (data["expiresAt"] < Date.now() || data["nonce"] !== nonce) {
            tx.delete(ref);
            return false;
        }
        tx.delete(ref);
        return true;
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function issue(pubkey: string): Promise<string> {
    try {
        return await fsIssue(pubkey);
    } catch {
        // Firestore unavailable — fall back to in-memory (works for single-instance dev)
        return memIssue(pubkey);
    }
}

export async function consume(pubkey: string, nonce: string): Promise<boolean> {
    try {
        return await fsConsume(pubkey, nonce);
    } catch {
        return memConsume(pubkey, nonce);
    }
}
