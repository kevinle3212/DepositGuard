"use client";

import { useConversation } from "@11labs/react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgent } from "@/agent/agents";

const agent = getAgent("platform-guide");

export function ErynWidget() {
    return <ErynButton agentId={agent.id} />;
}

function ErynButton({ agentId }: { agentId: string }) {
    const conversation = useConversation({
        onError: (_err) => {
            // silently swallow — voice errors must never crash the UI
        },
    });

    const status = conversation.status; // "connected" | "connecting" | "disconnected"
    const isSpeaking = conversation.isSpeaking;

    const handleClick = async () => {
        if (status === "connected") {
            await conversation.endSession();
        } else {
            await conversation.startSession({ agentId });
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
                onClick={() => void handleClick()}
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
