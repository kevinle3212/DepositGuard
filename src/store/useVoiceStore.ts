import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VoiceState {
    /** Whether TTS and the Eryn voice agent are active. Off by default. */
    voiceEnabled: boolean;
    /**
     * True once the user has clicked the toggle at least once.
     * When false, auto-detection may set voiceEnabled on first load.
     */
    hasExplicitlySet: boolean;
    /** True once the user has dismissed the voice onboarding banner. */
    hasSeenVoiceOnboarding: boolean;
    /**
     * Session-only flag: true while the onboarding banner should be visible.
     * Resets to false whenever voice is turned off.
     */
    showVoiceOnboarding: boolean;
}

interface VoiceActions {
    setVoiceEnabled: (enabled: boolean) => void;
    dismissVoiceOnboarding: () => void;
    /**
     * Checks browser/OS accessibility signals and enables voice automatically
     * if the user has never made an explicit choice. Safe to call on every mount
     * — only acts when hasExplicitlySet is false.
     *
     * Signals checked (strongest first):
     *   forced-colors: active  — Windows High Contrast / browser accessibility mode
     *   prefers-contrast: more — macOS Increase Contrast setting
     *   prefers-reduced-motion: reduce + speech synthesis present — screen-reader hint
     */
    autoDetect: () => void;
}

export type VoiceStore = VoiceState & VoiceActions;

export const useVoiceStore = create<VoiceStore>()(
    persist(
        (set, get) => ({
            voiceEnabled: false,
            hasExplicitlySet: false,
            hasSeenVoiceOnboarding: false,
            showVoiceOnboarding: false,

            setVoiceEnabled: (enabled) => {
                set({
                    voiceEnabled: enabled,
                    hasExplicitlySet: true,
                    // Show the onboarding banner whenever voice is turned on.
                    showVoiceOnboarding: enabled,
                });
            },

            dismissVoiceOnboarding: () => {
                set({ showVoiceOnboarding: false, hasSeenVoiceOnboarding: true });
            },

            autoDetect: () => {
                if (get().hasExplicitlySet) return;
                if (typeof window === "undefined") return;

                const mm = window.matchMedia.bind(window);
                const forcedColors = mm("(forced-colors: active)").matches;
                const highContrast = mm("(prefers-contrast: more)").matches;
                const reducedMotion = mm("(prefers-reduced-motion: reduce)").matches;
                const hasSpeechSynthesis =
                    typeof window.speechSynthesis !== "undefined" &&
                    window.speechSynthesis.getVoices().length > 0;

                const shouldEnable =
                    forcedColors ||
                    highContrast ||
                    // Reduced motion + speech synthesis present is a reasonable
                    // indicator of a screen reader or assistive-technology user.
                    (reducedMotion && hasSpeechSynthesis);

                if (shouldEnable) {
                    // Mark auto-detected but not explicitly set so the user can
                    // still override with the toggle.
                    set({ voiceEnabled: true });
                }
            },
        }),
        {
            name: "dg-voice",
            partialize: (state) => ({
                voiceEnabled: state.voiceEnabled,
                hasExplicitlySet: state.hasExplicitlySet,
                hasSeenVoiceOnboarding: state.hasSeenVoiceOnboarding,
                // showVoiceOnboarding is intentionally not persisted — it is session-only.
            }),
        },
    ),
);
