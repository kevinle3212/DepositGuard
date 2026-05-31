import { buildTemplate, type NotificationEvent } from "../lib/templates";

// ── template builder: subject presence ──────────────────────────────────────

const ALL_EVENTS: NotificationEvent[] = [
    "magic_link_invite",
    "both_parties_signed",
    "move_in_photo_required",
    "move_out_complete",
    "assessment_ready",
    "deduction_statement",
    "dispute_opened",
    "arbitration_fee_due",
    "arbitration_fee_refunded",
    "ruling_issued",
    "minority_dissent_filed",
    "deposit_released",
    "deadline_warning",
    "claim_timeout_executed",
];

describe("buildTemplate: all events produce non-empty subject/text/html", () => {
    test.each(ALL_EVENTS)("%s", (event) => {
        const tmpl = buildTemplate("lease-abc", event, {});
        expect(tmpl.subject.length).toBeGreaterThan(0);
        expect(tmpl.text.length).toBeGreaterThan(0);
        expect(tmpl.html.length).toBeGreaterThan(0);
    });
});

// ── leaseId appears in output ────────────────────────────────────────────────

describe("buildTemplate: leaseId is embedded in the output", () => {
    test.each(ALL_EVENTS)("%s contains leaseId", (event) => {
        const tmpl = buildTemplate("lease-xyz-99", event, {});
        const combined = tmpl.text + tmpl.html;
        expect(combined).toContain("lease-xyz-99");
    });
});

// ── variable interpolation ────────────────────────────────────────────────────

describe("buildTemplate: variable interpolation", () => {
    test("magic_link_invite embeds signingLink", () => {
        const tmpl = buildTemplate("L1", "magic_link_invite", {
            signingLink: "https://example.com/sign/L1",
            role: "tenant",
        });
        expect(tmpl.text).toContain("https://example.com/sign/L1");
        expect(tmpl.html).toContain("https://example.com/sign/L1");
        expect(tmpl.text).toContain("tenant");
    });

    test("assessment_ready embeds totalEstimate", () => {
        const tmpl = buildTemplate("L2", "assessment_ready", { totalEstimate: "450" });
        expect(tmpl.text).toContain("450");
        expect(tmpl.html).toContain("450");
    });

    test("ruling_issued embeds adoptedFine and txSignature", () => {
        const tmpl = buildTemplate("L3", "ruling_issued", {
            adoptedFine: "200",
            txSignature: "abc123sig",
        });
        expect(tmpl.text).toContain("200");
        expect(tmpl.text).toContain("abc123sig");
        expect(tmpl.html).toContain("abc123sig");
    });

    test("claim_timeout_executed embeds txSignature", () => {
        const tmpl = buildTemplate("L4", "claim_timeout_executed", { txSignature: "sig9999" });
        expect(tmpl.text).toContain("sig9999");
        expect(tmpl.html).toContain("sig9999");
    });

    test("deadline_warning converts unix timestamp to readable date", () => {
        const ts = String(Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000));
        const tmpl = buildTemplate("L5", "deadline_warning", { deadlineTs: ts });
        // UTC string contains "2026" or "Jun"
        expect(tmpl.text).toMatch(/2026|Jun/);
        expect(tmpl.html).toMatch(/2026|Jun/);
    });

    test("deposit_released embeds amount", () => {
        const tmpl = buildTemplate("L6", "deposit_released", {
            amount: "1500",
            txSignature: "sigX",
        });
        expect(tmpl.text).toContain("1500");
        expect(tmpl.html).toContain("sigX");
    });

    test("arbitration_fee_due embeds paymentDeadline", () => {
        const tmpl = buildTemplate("L7", "arbitration_fee_due", { paymentDeadline: "2026-07-01" });
        expect(tmpl.text).toContain("2026-07-01");
        expect(tmpl.html).toContain("2026-07-01");
    });

    test("minority_dissent_filed embeds dissenterRole and dissentAmount", () => {
        const tmpl = buildTemplate("L8", "minority_dissent_filed", {
            dissenterRole: "Panelist B",
            dissentAmount: "300",
        });
        expect(tmpl.text).toContain("Panelist B");
        expect(tmpl.text).toContain("300");
    });
});

// ── subjects are unique per event ────────────────────────────────────────────

describe("buildTemplate: subjects are distinct", () => {
    test("all events produce unique subjects", () => {
        const subjects = ALL_EVENTS.map((e) => buildTemplate("L", e, {}).subject);
        const unique = new Set(subjects);
        expect(unique.size).toBe(subjects.length);
    });
});

// ── request schema validation (pure logic, no Express) ────────────────────────

import { z } from "zod";

const NOTIFICATION_EVENTS: readonly NotificationEvent[] = [
    "magic_link_invite",
    "both_parties_signed",
    "move_in_photo_required",
    "move_out_complete",
    "assessment_ready",
    "deduction_statement",
    "dispute_opened",
    "arbitration_fee_due",
    "arbitration_fee_refunded",
    "ruling_issued",
    "minority_dissent_filed",
    "deposit_released",
    "deadline_warning",
    "claim_timeout_executed",
] as const;

const SendSchema = z.object({
    leaseId: z.string().min(1),
    event: z.enum(NOTIFICATION_EVENTS as unknown as [NotificationEvent, ...NotificationEvent[]]),
    recipients: z.array(z.string().email()).min(1),
    variables: z.record(z.string()).optional().default({}),
});

describe("SendSchema validation", () => {
    test("accepts a valid payload", () => {
        const result = SendSchema.safeParse({
            leaseId: "lease-1",
            event: "dispute_opened",
            recipients: ["a@example.com", "b@example.com"],
        });
        expect(result.success).toBe(true);
    });

    test("rejects empty leaseId", () => {
        const result = SendSchema.safeParse({
            leaseId: "",
            event: "dispute_opened",
            recipients: ["a@example.com"],
        });
        expect(result.success).toBe(false);
    });

    test("rejects unknown event", () => {
        const result = SendSchema.safeParse({
            leaseId: "lease-2",
            event: "unknown_event",
            recipients: ["a@example.com"],
        });
        expect(result.success).toBe(false);
    });

    test("rejects empty recipients array", () => {
        const result = SendSchema.safeParse({
            leaseId: "lease-3",
            event: "deposit_released",
            recipients: [],
        });
        expect(result.success).toBe(false);
    });

    test("rejects malformed email in recipients", () => {
        const result = SendSchema.safeParse({
            leaseId: "lease-4",
            event: "deposit_released",
            recipients: ["not-an-email"],
        });
        expect(result.success).toBe(false);
    });

    test("defaults variables to empty object when omitted", () => {
        const result = SendSchema.safeParse({
            leaseId: "lease-5",
            event: "deposit_released",
            recipients: ["a@example.com"],
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.variables).toEqual({});
    });
});
