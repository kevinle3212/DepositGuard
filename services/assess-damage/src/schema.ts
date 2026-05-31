import { z } from "zod";

export const DamageItemSchema = z.object({
    description: z.string().min(1),
    estimatedAmountUsdc: z.number().nonnegative(),
    severity: z.enum(["minor", "moderate", "major"]),
    observedDifference: z.string().min(1),
});

export const AssessmentSchema = z.object({
    items: z.array(DamageItemSchema),
    totalEstimatedDamageUsd: z.number().nonnegative(),
    summary: z.string().min(1),
});

export type DamageItem = z.infer<typeof DamageItemSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
