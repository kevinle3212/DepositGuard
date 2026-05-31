export async function notifyTimeoutExecuted(
    leaseId: string,
    landlordEmail: string,
    tenantEmail: string,
    txSignature: string,
): Promise<void> {
    const notifyUrl = process.env.NOTIFY_SERVICE_URL;
    if (notifyUrl === undefined || notifyUrl === "") {
        console.warn("[webhook-deadline] NOTIFY_SERVICE_URL not set, skipping email");
        return;
    }

    const recipients = [landlordEmail, tenantEmail].filter(Boolean);
    if (recipients.length === 0) return;

    const res = await fetch(`${notifyUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            leaseId,
            event: "claim_timeout_executed",
            recipients,
            variables: { txSignature },
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`notify service error ${String(res.status)}: ${body}`);
    }
}
