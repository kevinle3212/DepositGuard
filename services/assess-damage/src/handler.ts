import { Router, Request, Response } from "express";
import { z } from "zod";
import { listPhotoGcsUris } from "./storage.js";
import { callGemini } from "./gemini.js";
import { AssessmentSchema } from "./schema.js";
import { writeAssessment, flagAssessmentError } from "./firestore.js";
import { computeDisputeFlag } from "./dispute.js";
import { config } from "./config.js";

export const assessRouter = Router();

const RequestBodySchema = z.object({
    leaseId: z.string().min(1),
    landlordEstimateUsdc: z.number().nonnegative().optional(),
    disputeThresholdPct: z.number().min(0).max(1).optional(),
});

assessRouter.post("/", async (req: Request, res: Response): Promise<void> => {
    const parsed = RequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
        return;
    }

    const {
        leaseId,
        landlordEstimateUsdc,
        disputeThresholdPct = config.disputeThresholdDefault,
    } = parsed.data;

    // Fetch photo GCS URIs from Firebase Cloud Storage
    let moveInUris: string[];
    let moveOutUris: string[];
    try {
        [moveInUris, moveOutUris] = await Promise.all([
            listPhotoGcsUris(leaseId, "move-in"),
            listPhotoGcsUris(leaseId, "move-out"),
        ]);
    } catch (err) {
        console.error("[assess-damage] storage fetch error:", err);
        res.status(502).json({ error: "Failed to retrieve photos from Cloud Storage." });
        return;
    }

    if (moveInUris.length === 0 || moveOutUris.length === 0) {
        res.status(422).json({
            error: "Missing photos",
            detail: "Both move-in and move-out photos must be uploaded before running an assessment.",
        });
        return;
    }

    // Call Gemini via Vertex AI
    let geminiRaw: unknown;
    try {
        geminiRaw = await callGemini(moveInUris, moveOutUris);
    } catch (err) {
        console.error("[assess-damage] Gemini call error:", err);
        await flagAssessmentError(leaseId, "gemini_call_failed", String(err)).catch(() => {});
        res.status(502).json({
            error: "AI assessment call failed. Both parties have been notified.",
        });
        return;
    }

    // Validate Gemini response against Zod schema — do not write partial data on failure
    const validated = AssessmentSchema.safeParse(geminiRaw);
    if (!validated.success) {
        console.error("[assess-damage] Gemini response failed schema validation:", geminiRaw);
        await flagAssessmentError(leaseId, "unparseable_response", JSON.stringify(geminiRaw)).catch(
            () => {},
        );
        res.status(502).json({
            error: "AI response could not be parsed. Both parties have been notified.",
        });
        return;
    }

    const assessment = validated.data;

    // Persist to Firestore; advance lease to 'assessed'
    let assessmentId: string;
    try {
        assessmentId = await writeAssessment(leaseId, assessment, geminiRaw);
    } catch (err) {
        console.error("[assess-damage] Firestore write error:", err);
        res.status(500).json({ error: "Failed to persist assessment." });
        return;
    }

    // Compute 15% dispute auto-flag if the landlord submitted their own estimate
    const disputeFlag =
        landlordEstimateUsdc !== undefined
            ? computeDisputeFlag(
                  landlordEstimateUsdc,
                  assessment.totalEstimatedDamageUsd,
                  disputeThresholdPct,
              )
            : undefined;

    res.json({
        leaseId,
        assessmentId,
        assessment,
        advisoryLabel: "Estimate Only – Not Legally Binding",
        ...(disputeFlag !== undefined && { disputeFlag }),
    });
});
