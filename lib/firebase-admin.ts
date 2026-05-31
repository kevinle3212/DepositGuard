import { initializeApp, getApps, cert } from "firebase-admin/app";

/**
 * Idempotent Firebase Admin SDK initializer.
 * Safe to call multiple times — only initializes on the first invocation.
 *
 * Credential resolution order (first match wins):
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON env var — inline JSON of a service account key.
 *      Set this for local dev when you don't have ADC / gcloud configured.
 *      Get the JSON from: Firebase Console → Project Settings → Service Accounts
 *                         → Generate new private key → paste the full JSON here.
 *   2. Application Default Credentials (ADC) — used automatically in Firebase App
 *      Hosting, Cloud Run, and any machine where `gcloud auth application-default
 *      login` has been run. The project ID is set explicitly from GCP_PROJECT_ID
 *      so local dev doesn't depend on `gcloud config set project`.
 */
export function initFirebaseAdmin(): void {
    if (getApps().length > 0) return;

    const saJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
    if (saJson) {
        try {
            const serviceAccount = JSON.parse(saJson) as Record<string, unknown>;
            initializeApp({ credential: cert(serviceAccount) });
            return;
        } catch (e) {
            console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        }
    }

    // Fall back to ADC (works in GCP/Firebase App Hosting and after gcloud login).
    // Set projectId explicitly so local dev doesn't depend on `gcloud config set project`.
    const projectId = process.env["GCP_PROJECT_ID"];
    initializeApp(projectId ? { projectId } : undefined);
}
