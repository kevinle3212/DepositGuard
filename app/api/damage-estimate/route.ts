import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// ── Gemini model ────────────────────────────────────────────────────────────
// Use the latest Gemini image-capable model.
const GEMINI_MODEL = "gemini-2.0-flash";

// ── Guardrailed system prompt ───────────────────────────────────────────────
//
// This prompt constrains Gemini to a single, well-scoped task: property damage
// cost estimation. Every guardrail is explicit so the model cannot drift into
// legal advice, liability determinations, or unrelated content.
//
const DAMAGE_ESTIMATION_SYSTEM_PROMPT = `You are a professional property damage cost estimator. Your ONLY task is to analyze images of property damage and return structured repair cost estimates.

RULES — follow every rule without exception:
1. SCOPE: Provide ONLY cost estimates for visible damage. Do not offer legal advice, assign fault or liability, make occupancy recommendations, comment on lease terms, or discuss anything outside of repair costs.
2. METHODOLOGY: Before writing a single word of output, examine every detail in the image — surface type, extent of damage, likely repair approach, and materials needed. Think step-by-step internally.
3. ACCURACY: Use current US market rates for materials and labor (2025 pricing). Be conservative and realistic. Neither inflate nor deflate. Base every figure on what a licensed contractor operating at fair-market rates would charge.
4. COMPLETENESS: Identify ALL distinct damage items visible in the image. Do not skip minor damage; even small items must be listed.
5. CONFIDENCE: If the image quality, angle, or lighting makes it impossible to assess damage confidently, lower the confidence level and explain briefly in "analysisNotes". Still provide your best-effort estimate range.
6. NO EXTRAS: Do not include greetings, disclaimers, commentary, explanations outside the JSON, or any text whatsoever outside the required JSON structure.
7. FORMAT: Respond with ONLY valid JSON matching this exact schema — no markdown fences, no extra keys:

{
  "items": [
    {
      "description": "concise description of the specific damage",
      "severity": "Minor" | "Moderate" | "Major",
      "estimatedCost": <integer USD>,
      "notes": "brief reasoning for the cost (material, labor, scope)"
    }
  ],
  "totalEstimate": <integer USD — sum of all item estimatedCost values>,
  "confidenceLevel": "Low" | "Medium" | "High",
  "analysisNotes": "1–3 sentences on overall findings, what drove the estimates, and any image limitations"
}

Severity definitions:
- Minor: cosmetic only, no structural concern, <$300 typical repair
- Moderate: functional impact or noticeable damage, $300–$1500 typical
- Major: structural, safety, or extensive damage, >$1500 typical`;

// ── Types ───────────────────────────────────────────────────────────────────

export interface DamageEstimateItem {
    description: string;
    severity: "Minor" | "Moderate" | "Major";
    estimatedCost: number;
    notes: string;
}

export interface DamageEstimateResponse {
    items: DamageEstimateItem[];
    totalEstimate: number;
    confidenceLevel: "Low" | "Medium" | "High";
    analysisNotes: string;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    let imageBase64: string;
    let mimeType: string;

    try {
        const body = (await req.json()) as { imageBase64?: string; mimeType?: string };
        if (!body.imageBase64 || !body.mimeType) {
            return NextResponse.json(
                { error: "Request must include imageBase64 and mimeType." },
                { status: 400 },
            );
        }
        imageBase64 = body.imageBase64;
        mimeType = body.mimeType;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Validate mime type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedMimeTypes.includes(mimeType)) {
        return NextResponse.json(
            { error: `Unsupported image type: ${mimeType}. Accepted: ${allowedMimeTypes.join(", ")}` },
            { status: 400 },
        );
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            systemInstruction: DAMAGE_ESTIMATION_SYSTEM_PROMPT,
            generationConfig: {
                // Temperature 0 = fully deterministic, most factual
                temperature: 0,
                // Ensure only JSON is output
                responseMimeType: "application/json",
            },
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });

        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBase64,
                    mimeType,
                },
            },
            // Additional user-turn instruction to reinforce scope guardrail
            "Analyze the property damage visible in this image and return the cost estimate JSON only. Do not include anything outside the JSON structure.",
        ]);

        const raw = result.response.text();

        // Parse and validate the JSON response
        let parsed: DamageEstimateResponse;
        try {
            parsed = JSON.parse(raw) as DamageEstimateResponse;
        } catch {
            return NextResponse.json(
                { error: "Gemini returned malformed JSON.", raw },
                { status: 502 },
            );
        }

        // Sanity-check required fields
        if (!Array.isArray(parsed.items) || typeof parsed.totalEstimate !== "number") {
            return NextResponse.json(
                { error: "Gemini response missing required fields.", raw },
                { status: 502 },
            );
        }

        return NextResponse.json(parsed);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Gemini API error: ${message}` }, { status: 500 });
    }
}
