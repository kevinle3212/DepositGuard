import { randomBytes } from "crypto";

// Persist the Map across Next.js hot reloads (module is re-evaluated on each reload in dev)
const g = globalThis as typeof globalThis & {
    _nonceStore?: Map<string, { nonce: string; expiresAt: number }>;
};
g._nonceStore ??= new Map();
const store = g._nonceStore;
const TTL_MS = 5 * 60 * 1000;

export function issue(pubkey: string): string {
    const now = Date.now();
    store.forEach((v, k) => {
        if (v.expiresAt < now) store.delete(k);
    });
    const nonce = randomBytes(16).toString("hex");
    store.set(pubkey, { nonce, expiresAt: now + TTL_MS });
    return nonce;
}

export function consume(pubkey: string, nonce: string): boolean {
    const entry = store.get(pubkey);
    if (!entry || entry.expiresAt < Date.now() || entry.nonce !== nonce) {
        store.delete(pubkey);
        return false;
    }
    store.delete(pubkey);
    return true;
}
