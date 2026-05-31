import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    zh: "Simplified Chinese",
    ko: "Korean",
    vi: "Vietnamese",
    ar: "Arabic",
    tl: "Tagalog",
};

const SUMMARIZE_PROMPT = (language: string) =>
    `
You are a plain-language legal assistant. Your ONLY task is to read this rental/lease agreement PDF and produce a clear, easy-to-understand summary in ${language}.

RULES:
1. Write entirely in ${language}.
2. Use simple, everyday language — assume the reader has no legal background.
3. Do not give legal advice or make legal judgments. Only explain what the document says.
4. Respond with ONLY valid JSON — no markdown fences, no text outside the JSON.

Return this exact JSON structure:
{
  "overview": "2–4 sentence plain-language description of what this agreement is about.",
  "keyTerms": {
    "monthlyRent": "rent amount and due date",
    "depositAmount": "security deposit amount",
    "leaseDuration": "start date, end date, and length",
    "propertyAddress": "the rental property address"
  },
  "tenantObligations": ["bullet 1", "bullet 2", "..."],
  "landlordObligations": ["bullet 1", "bullet 2", "..."],
  "importantDates": ["bullet 1", "bullet 2", "..."],
  "clausesToWatch": ["any unusual, strict, or notable clauses the tenant should be aware of"],
  "language": "${language}"
}

If a keyTerms field is not found in the document, use null.
Keep each bullet under 20 words. Aim for 3–6 bullets per list.
`.trim();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();

    const body = (await req.json().catch(() => ({}))) as { lang?: string };
    const langCode = body.lang && SUPPORTED_LANGUAGES[body.lang] ? body.lang : "en";
    const language = SUPPORTED_LANGUAGES[langCode] ?? "English";

    // Fetch contractStorageUrl from Firestore
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const storageUrl = snap.data()?.["contractStorageUrl"] as string | undefined;
    if (!storageUrl) {
        return NextResponse.json(
            { error: "No contract PDF uploaded for this lease" },
            { status: 404 },
        );
    }

    // Fetch the PDF bytes
    const pdfRes = await fetch(storageUrl);
    if (!pdfRes.ok) {
        return NextResponse.json({ error: "Failed to fetch PDF from storage" }, { status: 502 });
    }
    const pdfBytes = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // Send to Gemini — pass PDF as an inline data part (Gemini 2.0 Flash reads PDFs natively)
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
            },
        },
        SUMMARIZE_PROMPT(language),
    ]);

    const raw = result.response.text().trim();

    // Strip accidental markdown fences if Gemini wraps the JSON
    const jsonText = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    let summary: unknown;
    try {
        summary = JSON.parse(jsonText);
    } catch {
        return NextResponse.json(
            { error: "Failed to parse Gemini response", raw },
            { status: 500 },
        );
    }

    return NextResponse.json({ summary, langCode, language });
}
