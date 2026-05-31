import { initializeApp, getApps } from "firebase-admin/app";

/**
 * Idempotent Firebase Admin SDK initializer.
 * Safe to call multiple times — only initializes on the first invocation.
 *
 * Credentials come from Application Default Credentials (ADC). The project ID
 * is set explicitly from GCP_PROJECT_ID so local dev doesn't depend on
 * `gcloud config set project`; in Firebase App Hosting the same var is present.
 */
export function initFirebaseAdmin(): void {
    if (!getApps().length) {
        const projectId = process.env["GCP_PROJECT_ID"];
        initializeApp(projectId ? { projectId } : undefined);
    }
}
