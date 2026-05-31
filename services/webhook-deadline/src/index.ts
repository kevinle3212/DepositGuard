import express, { Request, Response } from "express";
import { queryExpiredLeases, markLeaseReleased } from "./lib/firestore.js";
import { submitClaimTimeout } from "./lib/solana.js";
import { notifyTimeoutExecuted } from "./lib/notify.js";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

// Cloud Scheduler posts here every 15 minutes.
// In production, verify the OIDC token from Cloud Scheduler before processing.
app.post("/trigger", async (_req: Request, res: Response): Promise<void> => {
    let expired: Awaited<ReturnType<typeof queryExpiredLeases>>;
    try {
        expired = await queryExpiredLeases();
    } catch (err) {
        console.error("[webhook-deadline] Firestore query failed:", err);
        res.status(500).json({ error: "Firestore query failed" });
        return;
    }

    if (expired.length === 0) {
        res.json({ processed: 0 });
        return;
    }

    const results: { leaseId: string; status: "ok" | "skipped" | "error"; detail?: string }[] = [];

    for (const lease of expired) {
        // claim_timeout only accepts Active and PendingApproval (Assessed) on-chain.
        // Disputed leases use the arbitration track, not the timeout path.
        if (lease.status === "Disputed") {
            results.push({
                leaseId: lease.leaseId,
                status: "skipped",
                detail: "disputed — arbitration track",
            });
            continue;
        }

        try {
            const sig = await submitClaimTimeout(
                lease.leaseId,
                lease.tenantTokenAccount,
                lease.tokenMint,
            );
            console.log(`[webhook-deadline] claim_timeout ok leaseId=${lease.leaseId} sig=${sig}`);

            await markLeaseReleased(lease.leaseId);
            await notifyTimeoutExecuted(lease.leaseId, lease.landlordEmail, lease.tenantEmail, sig);

            results.push({ leaseId: lease.leaseId, status: "ok", detail: sig });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[webhook-deadline] claim_timeout failed leaseId=${lease.leaseId}:`, err);
            results.push({ leaseId: lease.leaseId, status: "error", detail: msg });
        }
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    res.json({ processed: expired.length, succeeded, results });
});

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => console.log(`webhook-deadline running on :${PORT}`));
