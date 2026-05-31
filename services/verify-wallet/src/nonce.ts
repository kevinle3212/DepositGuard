import { randomBytes } from "crypto";

const store = new Map<string, { nonce: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export function issue(pubkey: string): string {
    const now = Date.now();
    for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
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
