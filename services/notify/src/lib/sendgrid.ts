import sgMail from "@sendgrid/mail";
import type { EmailTemplate } from "./templates.js";

export async function sendEmail(recipients: string[], template: EmailTemplate): Promise<string> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey === undefined || apiKey === "") throw new Error("SENDGRID_API_KEY not set");

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
