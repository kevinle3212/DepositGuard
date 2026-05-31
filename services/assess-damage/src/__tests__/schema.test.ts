import { describe, it, expect } from "vitest";
import { AssessmentSchema, DamageItemSchema } from "../schema.js";

const validItem = {
    description: "Broken window pane",
    estimatedAmountUsdc: 150,
    severity: "major" as const,
    observedDifference: "Window intact at move-in; cracked at move-out",
};

const validAssessment = {
    items: [validItem],
    totalEstimatedDamageUsd: 150,
    summary: "One major damage item found.",
};

describe("DamageItemSchema", () => {
    it("accepts a valid damage item", () => {
        expect(DamageItemSchema.safeParse(validItem).success).toBe(true);
    });

    it("accepts all severity levels", () => {
        for (const severity of ["minor", "moderate", "major"] as const) {
            expect(DamageItemSchema.safeParse({ ...validItem, severity }).success).toBe(true);
        }
    });

    it("rejects an invalid severity value", () => {
        expect(DamageItemSchema.safeParse({ ...validItem, severity: "severe" }).success).toBe(
            false,
        );
    });

    it("rejects a negative estimatedAmountUsdc", () => {
        expect(DamageItemSchema.safeParse({ ...validItem, estimatedAmountUsdc: -1 }).success).toBe(
            false,
        );
    });

    it("accepts zero estimatedAmountUsdc (normal wear and tear)", () => {
        expect(DamageItemSchema.safeParse({ ...validItem, estimatedAmountUsdc: 0 }).success).toBe(
            true,
        );
    });

    it("rejects an empty description", () => {
        expect(DamageItemSchema.safeParse({ ...validItem, description: "" }).success).toBe(false);
    });

    it("rejects missing fields", () => {
        const { severity: _s, ...noSeverity } = validItem;
        expect(DamageItemSchema.safeParse(noSeverity).success).toBe(false);
    });
});

describe("AssessmentSchema", () => {
    it("accepts a valid assessment", () => {
        expect(AssessmentSchema.safeParse(validAssessment).success).toBe(true);
    });

    it("accepts an empty items array (no damage found)", () => {
        expect(AssessmentSchema.safeParse({ ...validAssessment, items: [] }).success).toBe(true);
    });

    it("accepts multiple items", () => {
        const multi = {
            ...validAssessment,
            items: [
                validItem,
                {
                    ...validItem,
                    description: "Stained carpet",
                    estimatedAmountUsdc: 200,
                    severity: "moderate" as const,
                },
            ],
            totalEstimatedDamageUsd: 350,
        };
        expect(AssessmentSchema.safeParse(multi).success).toBe(true);
    });

    it("rejects a negative totalEstimatedDamageUsd", () => {
        expect(
            AssessmentSchema.safeParse({ ...validAssessment, totalEstimatedDamageUsd: -50 })
                .success,
        ).toBe(false);
    });

    it("rejects missing summary", () => {
        const { summary: _s, ...noSummary } = validAssessment;
        expect(AssessmentSchema.safeParse(noSummary).success).toBe(false);
    });

    it("rejects an empty summary", () => {
        expect(AssessmentSchema.safeParse({ ...validAssessment, summary: "" }).success).toBe(false);
    });

    it("rejects a non-object input", () => {
        expect(AssessmentSchema.safeParse(null).success).toBe(false);
        expect(AssessmentSchema.safeParse("string").success).toBe(false);
    });
});
