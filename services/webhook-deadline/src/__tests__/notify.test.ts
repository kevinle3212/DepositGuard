import { notifyTimeoutExecuted } from "../lib/notify.js";

describe("notifyTimeoutExecuted", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.NOTIFY_SERVICE_URL = "http://notify.test";
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        delete process.env.NOTIFY_SERVICE_URL;
    });

    test("POSTs to notify service /send", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        await notifyTimeoutExecuted("lease-1", "landlord@example.com", "tenant@example.com", "sig-abc");

        expect(global.fetch).toHaveBeenCalledWith("http://notify.test/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                leaseId: "lease-1",
                event: "claim_timeout_executed",
                recipients: ["landlord@example.com", "tenant@example.com"],
                variables: { txSignature: "sig-abc" },
            }),
        });
    });

    test("skips when NOTIFY_SERVICE_URL is unset", async () => {
        delete process.env.NOTIFY_SERVICE_URL;

        await notifyTimeoutExecuted("lease-1", "a@example.com", "b@example.com", "sig");

        expect(global.fetch).not.toHaveBeenCalled();
    });

    test("throws when notify service returns non-OK", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

        await expect(
            notifyTimeoutExecuted("lease-1", "a@example.com", "b@example.com", "sig"),
        ).rejects.toThrow("notify service error 500: error");
    });
});
