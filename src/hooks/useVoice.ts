"use client";

import { useEffect } from "react";
import { useVoiceStore } from "@/src/store/useVoiceStore";

/**
 * Fetches TTS audio for a script key and plays it immediately.
 * Does NOT check voiceEnabled — callers are responsible for gating.
 * Useful when voice was just enabled and the store update hasn't propagated.
 */
export async function playTts(
    scriptKey: string,
    variables: Record<string, string> = {},
): Promise<void> {
    try {
        const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scriptKey, variables }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); };
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        audio.play().catch(() => {});
    } catch {
        // Non-fatal
    }
}

/**
 * useVoice — ElevenLabs voice layer hook.
 *
 * Sends a scriptKey + variables to /api/tts, receives an audio blob,
 * and plays it via the Web Audio API. Silently degrades if TTS is not
 * configured, if the browser blocks autoplay, or if the user has not
 * enabled voice in their settings.
 *
 * Voice is opt-in: it only fires when voiceEnabled is true in the
 * VoiceStore. It auto-enables on first load when OS/browser accessibility
 * signals are detected (e.g. forced-colors, prefers-contrast: more).
 */
export function useVoice() {
    const { voiceEnabled, autoDetect } = useVoiceStore();

    // Run accessibility auto-detection once per component tree mount.
    useEffect(() => {
        autoDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function speak(scriptKey: string, variables: Record<string, string> = {}) {
        if (!voiceEnabled) return;

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scriptKey, variables }),
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
             
            // eslint-disable-next-line @typescript-eslint/no-empty-function
        audio.play().catch(() => {}); // silently handle autoplay blocks
        } catch {
            // Non-fatal: TTS errors must never crash the UI
        }
    }

    return { speak, voiceEnabled };
}
