export const config = {
    gcpProjectId: process.env.GCP_PROJECT_ID ?? "",
    gcpLocation: process.env.GCP_LOCATION ?? "us-central1",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
    // gemini-2.0-flash was retired for new projects; default to a current
    // image-capable model and allow an env override.
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    // Default dispute threshold: 15% divergence between landlord and AI estimates
    disputeThresholdDefault: 0.15,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 10,
} as const;
