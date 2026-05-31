import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { config } from "./config.js";

function ensureFirebaseInit(): void {
    if (!admin.apps.length) admin.initializeApp();
}

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

/**
 * Lists GCS URIs for all images uploaded under photos/{leaseId}/{phase}/.
 * Returns gs:// URIs that can be passed directly to the Vertex AI multimodal API.
 */
export async function listPhotoGcsUris(
    leaseId: string,
    phase: "move-in" | "move-out",
): Promise<string[]> {
    ensureFirebaseInit();
    const bucket = getStorage().bucket(config.storageBucket);
    const [files] = await bucket.getFiles({ prefix: `photos/${leaseId}/${phase}/` });
    return files
        .filter((f) => IMAGE_RE.test(f.name))
        .map((f) => `gs://${config.storageBucket}/${f.name}`);
}
