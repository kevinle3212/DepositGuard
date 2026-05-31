import { initializeApp, getApps } from "firebase-admin/app";

/**
 * Idempotent Firebase Admin SDK initializer.
 * Safe to call multiple times — only initializes on the first invocation.
 */
export function initFirebaseAdmin(): void {
    if (!getApps().length) {
        initializeApp();
    }
}
