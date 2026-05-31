import { VertexAI } from "@google-cloud/vertexai";
import { config } from "./config.js";
import { SYSTEM_PROMPT, buildUserPromptParts } from "./prompt.js";

let _model: ReturnType<InstanceType<typeof VertexAI>["getGenerativeModel"]> | null = null;

function getModel() {
    if (!_model) {
        const vertex = new VertexAI({
            project: config.gcpProjectId,
            location: config.gcpLocation,
        });
        _model = vertex.getGenerativeModel({
            model: config.geminiModel,
            generationConfig: {
                temperature: 0, // deterministic output
                responseMimeType: "application/json",
            },
            systemInstruction: {
                role: "system",
                parts: [{ text: SYSTEM_PROMPT }],
            },
        });
    }
    return _model;
}

/**
 * Calls Gemini 2.0 Flash with move-in and move-out photo GCS URIs.
 * Returns the raw parsed JSON from the model response.
 * Throws if the API call fails or the response has no content.
 */
export async function callGemini(
    moveInGcsUris: string[],
    moveOutGcsUris: string[],
): Promise<unknown> {
    const model = getModel();
    const parts = buildUserPromptParts(moveInGcsUris, moveOutGcsUris);

    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned an empty response");

    return JSON.parse(text);
}
