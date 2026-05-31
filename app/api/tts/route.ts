import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { VOICE_SCRIPTS, interpolateScript } from "@/lib/voice-scripts";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";

// Two voices per the architecture: Platform Guide (Eryn) and Dispute Advisor.
// Set ELEVENLABS_VOICE_ID_PLATFORM_GUIDE / _DISPUTE_ADVISOR in env; defaults
// fall back to ElevenLabs' built-in "Rachel" voice for local dev.
const VOICE_IDS: Record<string, string> = {
    "platform-guide": process.env["ELEVENLABS_VOICE_ID_PLATFORM_GUIDE"] ?? "21m00Tcm4TlvDq8ikWAM",
    "dispute-advisor": process.env["ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR"] ?? "pNInz6obpgDQGcFmaJgB",
};

// Scripts that use the dispute-advisor voice
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

interface TtsBody {
    scriptKey: string;
    variables?: Record<string, string>;
}

export async function POST(req: NextRequest) {
    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) {
        // Non-fatal in dev — return 204 so the client silently skips audio
        return new NextResponse(null, { status: 204 });
    }

    let body: Partial<TtsBody>;
    try {
        body = (await req.json()) as Partial<TtsBody>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { scriptKey, variables = {} } = body;
    if (!scriptKey) {
        return NextResponse.json({ error: "scriptKey required" }, { status: 400 });
    }

    const template = VOICE_SCRIPTS[scriptKey];
    if (!template) {
        return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const text = interpolateScript(template, variables);
    const voiceRole = DISPUTE_ADVISOR_KEYS.has(scriptKey) ? "dispute-advisor" : "platform-guide";
    const voiceId = VOICE_IDS[voiceRole] ?? VOICE_IDS["platform-guide"] ?? "21m00Tcm4TlvDq8ikWAM";

    const elevenRes = await fetch(`${ELEVENLABS_API}/${voiceId}`, {
        method: "POST",
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: voiceRole === "dispute-advisor" ? 0.65 : 0.5,
                similarity_boost: 0.75,
                style: voiceRole === "dispute-advisor" ? 0.2 : 0.3,
                use_speaker_boost: true,
            },
        }),
    });

    if (!elevenRes.ok) {
        const errText = await elevenRes.text().catch(() => "unknown");
        console.error("[tts] ElevenLabs error:", elevenRes.status, errText);
        return NextResponse.json({ error: "TTS generation failed" }, { status: 502 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
            "Content-Type": "audio/mpeg",
            // Cache non-variable scripts for 1 hour
            "Cache-Control": "public, max-age=3600",
        },
    });
}
