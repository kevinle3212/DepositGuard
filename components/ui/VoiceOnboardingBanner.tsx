"use client";

import { X, Volume2, VolumeX } from "lucide-react";
import { useVoiceStore } from "@/src/store/useVoiceStore";
import { cn } from "@/lib/utils";

/**
 * A dismissible banner shown whenever the user enables the voice feature.
 * Explains what it does and how to turn it off.
 * Rendered by the dashboard layout so it appears on every dashboard page.
 */
export function VoiceOnboardingBanner() {
    const { showVoiceOnboarding, dismissVoiceOnboarding } = useVoiceStore();

    if (!showVoiceOnboarding) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "relative flex items-start gap-3 px-4 py-3",
                "bg-primary/5 border-b border-primary/20 text-sm",
            )}
        >
            {/* Icon */}
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Volume2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Voice assistant is on</p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Eryn will read important steps and confirmations aloud as you navigate NestCrow.
                    To turn voice off, click the{" "}
                    <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                        <VolumeX className="h-3.5 w-3.5" aria-hidden />
                        speaker icon
                    </span>{" "}
                    in the top navigation bar.
                </p>
            </div>

            {/* Dismiss */}
            <button
                type="button"
                onClick={dismissVoiceOnboarding}
                aria-label="Dismiss voice assistant notice"
                className="mt-0.5 flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <X className="h-4 w-4" aria-hidden />
            </button>
        </div>
    );
}
