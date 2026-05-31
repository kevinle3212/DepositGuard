#!/usr/bin/env tsx
/**
 * Pre-renders all static (variable-free) voice scripts to .mp3 and uploads
 * them to Firebase Cloud Storage at `tts-cache/{voiceRole}/{scriptKey}.mp3`.
 *
 * Run once after creating/updating voice scripts, or as part of the deploy pipeline:
 *   yarn tsx scripts/pre-render-tts.ts
 *
 * Required env vars (from .env or CI secrets):
 *   ELEVENLABS_API_KEY
 *   FIREBASE_STORAGE_BUCKET
 *   ELEVENLABS_VOICE_ID_PLATFORM_GUIDE  (optional; defaults to Rachel)
 *   ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR (optional; defaults to Adam)
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { VOICE_SCRIPTS } from "../lib/voice-scripts";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";

const VOICE_IDS: Record<string, string> = {
    "platform-guide": process.env["ELEVENLABS_VOICE_ID_PLATFORM_GUIDE"] ?? "21m00Tcm4TlvDq8ikWAM",
    "dispute-advisor": process.env["ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR"] ?? "pNInz6obpgDQGcFmaJgB",
};

/** Script keys that use the dispute-advisor voice (mirrors app/api/tts/route.ts). */
const DISPUTE_ADVISOR_KEYS = new Set([
    "dispute.opened",
    "dispute.estimates.sealed",
    "minority.dissent",
    "ruling.issued",
    "arbitration.fee",
    "arbitration.fee.paid",
    "arbitration.fee.refunded",
    "panel.upgrade",
]);

/** Returns true when a template contains no {{variable}} placeholders. */
function isStatic(template: string): boolean {
    return !/\{\{\w+\}\}/.test(template);
}

function voiceSettings(role: string) {
    return {
        stability: role === "dispute-advisor" ? 0.65 : 0.5,
        similarity_boost: 0.75,
        style: role === "dispute-advisor" ? 0.2 : 0.3,
        use_speaker_boost: true,
    };
}

async function renderToMp3(text: string, voiceRole: string, apiKey: string): Promise<Buffer> {
    const voiceId = VOICE_IDS[voiceRole] ?? VOICE_IDS["platform-guide"] ?? "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`${ELEVENLABS_API}/${voiceId}`, {
        method: "POST",
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: voiceSettings(voiceRole),
        }),
    });

    if (!res.ok) {
        throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    }

    return Buffer.from(await res.arrayBuffer());
}

async function main() {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) {
        console.error("ELEVENLABS_API_KEY is not set. Aborting.");
        process.exit(1);
    }

    const bucket = process.env["FIREBASE_STORAGE_BUCKET"];
    if (!bucket) {
        console.error("FIREBASE_STORAGE_BUCKET is not set. Aborting.");
        process.exit(1);
    }

    if (!getApps().length) {
        initializeApp({ credential: cert(process.env["GOOGLE_APPLICATION_CREDENTIALS"] ?? ""), storageBucket: bucket });
    }
    const storage = getStorage().bucket(bucket);

    const staticKeys = Object.entries(VOICE_SCRIPTS).filter(([, template]) => isStatic(template));

    console.log(`Found ${staticKeys.length} static script(s) to pre-render.`);

    let ok = 0;
    let skipped = 0;
    let failed = 0;

    for (const [scriptKey, text] of staticKeys) {
        const voiceRole = DISPUTE_ADVISOR_KEYS.has(scriptKey) ? "dispute-advisor" : "platform-guide";
        const storagePath = `tts-cache/${voiceRole}/${scriptKey}.mp3`;
        const file = storage.file(storagePath);

        // Skip if already cached (idempotent)
        const [exists] = await file.exists();
        if (exists) {
            console.log(`  SKIP  ${scriptKey} (already cached)`);
            skipped++;
            continue;
        }

        try {
            console.log(`  RENDER ${scriptKey} → ${storagePath}`);
            const mp3 = await renderToMp3(text, voiceRole, apiKey);
            await file.save(mp3, {
                metadata: {
                    contentType: "audio/mpeg",
                    cacheControl: "public, max-age=86400",
                    metadata: { scriptKey, voiceRole, renderedAt: new Date().toISOString() },
                },
            });
            ok++;
        } catch (err) {
            console.error(`  ERROR ${scriptKey}:`, err);
            failed++;
        }
    }

    console.log(`\nDone: ${ok} rendered, ${skipped} skipped, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
