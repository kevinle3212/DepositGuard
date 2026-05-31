"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useVoiceStore } from "@/src/store/useVoiceStore";
import { playTts } from "@/src/hooks/useVoice";
import { cn } from "@/lib/utils";

/**
 * A compact toggle button that enables or disables all TTS and voice
 * features (the /api/tts scripted voice and the Eryn conversational agent).
 *
 * Defaults to off. Auto-enables on first load when OS/browser accessibility
 * signals are detected (forced-colors, prefers-contrast: more, etc.).
 *
 * When voice is turned on, an onboarding banner is displayed and the
 * welcome message is spoken aloud (once per session if first-time).
 */
export function VoiceToggle({ className }: { className?: string }) {
    const { voiceEnabled, setVoiceEnabled } = useVoiceStore();

    const handleClick = () => {
        const enabling = !voiceEnabled;
        setVoiceEnabled(enabling);

        if (enabling) {
            void playTts("voice.enabled");
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={voiceEnabled ? "Turn off voice assistant" : "Turn on voice assistant"}
            aria-pressed={voiceEnabled}
            title={voiceEnabled ? "Voice on — click to disable" : "Voice off — click to enable"}
            className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                voiceEnabled
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                className,
            )}
        >
            {voiceEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden />
            ) : (
                <VolumeX className="h-4 w-4" aria-hidden />
            )}
        </button>
    );
}
