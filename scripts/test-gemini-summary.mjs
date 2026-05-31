// Standalone test for the Gemini lease-summary path.
// Mirrors app/api/leases/[id]/summarize/route.ts: same model + generationConfig,
// same prompt, same PDF inlineData call, same JSON-extraction logic.
//
// Run: node --env-file=.env scripts/test-gemini-summary.mjs

import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Build a minimal but valid single-page PDF with selectable text ──────────
function buildLeasePdf() {
    const lines = [
        "RESIDENTIAL LEASE AGREEMENT",
        "Property: 142 Oak Street Apt 4B, Austin, TX 78701",
        "Landlord: Acme Holdings LLC   Tenant: Jordan Rivers",
        "Monthly Rent: $1,850 due on the 1st of each month.",
        "Security Deposit: $2,000 held in escrow.",
        "Lease Term: January 1, 2025 to December 31, 2025.",
        "Tenant shall keep the premises clean and pay utilities.",
        "Landlord shall maintain plumbing, heating, and structure.",
        "Late rent after the 5th incurs a $75 fee.",
        "No pets without written landlord consent.",
    ];
    const text = lines
        .map((l, i) => `BT /F1 12 Tf 50 ${740 - i * 24} Td (${l.replace(/[()\\]/g, "\\$&")}) Tj ET`)
        .join("\n");

    const objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    );
    objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
        pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
}

const SUMMARIZE_PROMPT = (language) =>
    `
You are a plain-language legal assistant. Your ONLY task is to read this rental/lease agreement PDF and produce a clear, easy-to-understand summary in ${language}.

RULES:
1. Write entirely in ${language}.
2. Use simple, everyday language.
3. Do not give legal advice. Only explain what the document says.
4. Respond with ONLY valid JSON — no markdown fences, no text outside the JSON.

Return this exact JSON structure:
{
  "overview": "2-4 sentence plain-language description.",
  "keyTerms": { "monthlyRent": "", "depositAmount": "", "leaseDuration": "", "propertyAddress": "" },
  "tenantObligations": ["..."],
  "landlordObligations": ["..."],
  "importantDates": ["..."],
  "clausesToWatch": ["..."],
  "language": "${language}"
}
If a keyTerms field is not found, use null.
`.trim();

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("FAIL: GEMINI_API_KEY not set");
        process.exit(1);
    }
    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    console.log(`Model: ${modelName}`);
    console.log(`Key prefix: ${apiKey.slice(0, 6)}… (len ${apiKey.length})`);

    const pdf = buildLeasePdf();
    const pdfBase64 = pdf.toString("base64");
    console.log(`PDF bytes: ${pdf.length}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
        },
    });

    const t0 = Date.now();
    let raw;
    try {
        const result = await model.generateContent([
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            SUMMARIZE_PROMPT("English"),
        ]);
        raw = result.response.text().trim();
    } catch (err) {
        console.error(`FAIL: Gemini request threw after ${Date.now() - t0}ms`);
        console.error(err?.message ?? err);
        process.exit(1);
    }

    console.log(`Gemini responded in ${Date.now() - t0}ms, ${raw.length} chars`);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;

    let summary;
    try {
        summary = JSON.parse(jsonText);
    } catch (e) {
        console.error("FAIL: response did not parse as JSON");
        console.error("RAW:", raw.slice(0, 500));
        process.exit(1);
    }

    console.log("\nPASS: parsed JSON summary");
    console.log("overview:", summary.overview);
    console.log("keyTerms:", JSON.stringify(summary.keyTerms));
    console.log("tenantObligations:", (summary.tenantObligations ?? []).length, "items");
    console.log("landlordObligations:", (summary.landlordObligations ?? []).length, "items");
}

main();
