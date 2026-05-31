import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, buildUserPromptParts } from "../prompt.js";

describe("SYSTEM_PROMPT", () => {
    it("declares output is ADVISORY ONLY", () => {
        expect(SYSTEM_PROMPT).toContain("ADVISORY ONLY");
    });

    it("explicitly forbids legal liability determinations", () => {
        // Must contain the prohibition phrase
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("legal liability");
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("must not");
    });

    it("forbids recommending legal action", () => {
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("legal action");
    });

    it("specifies the exact JSON output schema fields", () => {
        expect(SYSTEM_PROMPT).toContain("estimatedAmountUsdc");
        expect(SYSTEM_PROMPT).toContain("totalEstimatedDamageUsd");
        expect(SYSTEM_PROMPT).toContain("observedDifference");
        expect(SYSTEM_PROMPT).toContain("severity");
        expect(SYSTEM_PROMPT).toContain("summary");
    });

    it("references move-in and move-out photos", () => {
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("move-in");
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("move-out");
    });

    it("addresses normal wear and tear", () => {
        expect(SYSTEM_PROMPT.toLowerCase()).toContain("wear and tear");
    });
});

describe("buildUserPromptParts", () => {
    const moveIn = ["gs://bucket/photos/lease1/move-in/photo1.jpg"];
    const moveOut = ["gs://bucket/photos/lease1/move-out/photo1.jpg"];

    it("includes text parts for move-in and move-out sections", () => {
        const parts = buildUserPromptParts(moveIn, moveOut);
        const textParts = parts.filter((p): p is { text: string } => "text" in p);
        const texts = textParts.map((p) => p.text.toUpperCase());
        expect(texts.some((t) => t.includes("MOVE-IN"))).toBe(true);
        expect(texts.some((t) => t.includes("MOVE-OUT"))).toBe(true);
    });

    it("creates one fileData part per image URI", () => {
        const parts = buildUserPromptParts(moveIn, moveOut);
        const fileParts = parts.filter((p) => "fileData" in p);
        expect(fileParts).toHaveLength(2);
    });

    it("handles multiple images per phase", () => {
        const manyIn = ["gs://b/a.jpg", "gs://b/b.jpg", "gs://b/c.png"];
        const manyOut = ["gs://b/d.jpg", "gs://b/e.webp"];
        const parts = buildUserPromptParts(manyIn, manyOut);
        const fileParts = parts.filter((p) => "fileData" in p);
        expect(fileParts).toHaveLength(5);
    });

    it("sets correct MIME type for PNG files", () => {
        const parts = buildUserPromptParts(["gs://b/photo.png"], ["gs://b/photo.jpg"]);
        const fileParts = parts.filter(
            (p): p is { fileData: { mimeType: string; fileUri: string } } => "fileData" in p,
        );
        const pngPart = fileParts.find((p) => p.fileData.fileUri.endsWith(".png"));
        expect(pngPart?.fileData.mimeType).toBe("image/png");
    });

    it("sets correct MIME type for WebP files", () => {
        const parts = buildUserPromptParts(["gs://b/photo.webp"], ["gs://b/photo.jpg"]);
        const fileParts = parts.filter(
            (p): p is { fileData: { mimeType: string; fileUri: string } } => "fileData" in p,
        );
        const webpPart = fileParts.find((p) => p.fileData.fileUri.endsWith(".webp"));
        expect(webpPart?.fileData.mimeType).toBe("image/webp");
    });

    it("defaults to image/jpeg for unknown extensions", () => {
        const parts = buildUserPromptParts(["gs://b/photo.jpg"], ["gs://b/photo.jpeg"]);
        const fileParts = parts.filter(
            (p): p is { fileData: { mimeType: string; fileUri: string } } => "fileData" in p,
        );
        expect(fileParts.every((p) => p.fileData.mimeType === "image/jpeg")).toBe(true);
    });

    it("ends with a text instruction part", () => {
        const parts = buildUserPromptParts(moveIn, moveOut);
        const last = parts[parts.length - 1];
        expect("text" in last).toBe(true);
    });
});
