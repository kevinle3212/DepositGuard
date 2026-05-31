import sgMail from "@sendgrid/mail";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import type { EmailTemplate } from "./templates.js";

let _secretClient: SecretManagerServiceClient | null = null;
let _cachedApiKey: string | null = null;

function secretClient(): SecretManagerServiceClient {
    if (!_secretClient) _secretClient = new SecretManagerServiceClient();
    return _secretClient;
}

/**
 * Returns the SendGrid API key.
 * In production (GCP_PROJECT_ID set), fetches from Secret Manager and caches.
 * Falls back to SENDGRID_API_KEY env var for local dev.
 */
async function getSendGridApiKey(): Promise<string> {
    if (_cachedApiKey) return _cachedApiKey;

    const projectId = process.env.GCP_PROJECT_ID;
    if (projectId) {
        try {
            const name = `projects/${projectId}/secrets/sendgrid-api-key/versions/latest`;
            const [version] = await secretClient().accessSecretVersion({ name });
            const value = version.payload?.data?.toString() ?? "";
            if (value) {
                _cachedApiKey = value;
                return value;
            }
        } catch (err) {
            console.warn(
                "[sendgrid] Could not fetch sendgrid-api-key from Secret Manager, falling back to env:",
                err,
            );
        }
    }

    const envKey = process.env.SENDGRID_API_KEY ?? "";
    _cachedApiKey = envKey;
    return envKey;
}

export async function sendEmail(recipients: string[], template: EmailTemplate): Promise<string> {
    const apiKey = await getSendGridApiKey();
    if (!apiKey) throw new Error("SENDGRID_API_KEY not set");

    sgMail.setApiKey(apiKey);

    const from = process.env.SENDGRID_FROM_EMAIL ?? "noreply@nestcrow.tech";

    const [response] = await sgMail.send({
        to: recipients,
        from,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });

    const headers = response.headers as Record<string, string | string[] | undefined>;
    const rawMessageId = headers["x-message-id"];
    const messageId =
        typeof rawMessageId === "string" && rawMessageId.length > 0
            ? rawMessageId
            : crypto.randomUUID();
    return messageId;
}
