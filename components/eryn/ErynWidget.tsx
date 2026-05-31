"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgent } from "@/agent/agents";

const agent = getAgent("platform-guide");

export function ErynWidget() {
    return (
        <ConversationProvider>
            <ErynButton agentId={agent.id} />
        </ConversationProvider>
    );
}

function ErynButton({ agentId }: { agentId: string }) {
    const conversation = useConversation({
        onError: (_err) => {
            // silently swallow — voice errors must never crash the UI
        },
    });

    const status = conversation.status; // "disconnected" | "connecting" | "connected" | "error"
    const isSpeaking = conversation.isSpeaking;

    const handleClick = () => {
        if (status === "connected") {
            conversation.endSession();
        } else {
            conversation.startSession({ agentId, connectionType: "webrtc" });
        }
    };

    const isActive = status === "connected";
    const isConnecting = status === "connecting";

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {isActive && (
                <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md">
                    {isSpeaking ? "Eryn is speaking…" : "Listening…"}
                </div>
            )}

            <button
                onClick={handleClick}
                aria-label={isActive ? "End conversation with Eryn" : "Talk to Eryn"}
                disabled={isConnecting}
                className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    isConnecting && "opacity-70 cursor-not-allowed",
                    isSpeaking && "ring-4 ring-primary/30 animate-pulse",
                )}
            >
                {isConnecting ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                ) : isActive ? (
                    <MicOff className="h-6 w-6" aria-hidden />
                ) : (
                    <Mic className="h-6 w-6" aria-hidden />
                )}
            </button>
        </div>
    );
}
