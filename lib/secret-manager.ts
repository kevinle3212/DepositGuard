import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let client: SecretManagerServiceClient | null = null;

/** In-process cache: secret name → resolved value. */
const cache = new Map<string, string>();

function getClient(): SecretManagerServiceClient {
    client ??= new SecretManagerServiceClient();
    return client;
}

/**
 * Fetches the latest version of a GCP Secret Manager secret and caches the
 * result for the lifetime of the process (Cloud Run instance).
 *
 * Falls back to `process.env[envFallback]` when:
 *   - `GCP_PROJECT_ID` is not set (local dev without ADC), or
 *   - the Secret Manager call fails.
 *
 * @param secretId   The Secret Manager secret ID (not the full resource name).
 * @param envFallback  The env var to fall back to (e.g. "ELEVENLABS_API_KEY").
 */
export async function getSecret(
    secretId: string,
    envFallback: string,
): Promise<string | undefined> {
    const cached = cache.get(secretId);
    if (cached !== undefined) return cached;

    const projectId = process.env["GCP_PROJECT_ID"];
    if (!projectId) {
        return process.env[envFallback];
    }

    try {
        const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;
        const [version] = await getClient().accessSecretVersion({ name });
        const value = version.payload?.data?.toString() ?? "";
        if (value) cache.set(secretId, value);
        return value || process.env[envFallback];
    } catch (err) {
        console.warn(`[secret-manager] Could not fetch "${secretId}", falling back to env:`, err);
        return process.env[envFallback];
    }
}
