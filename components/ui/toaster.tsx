"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
    const { toasts } = useToast();

    return (
        <RadixToast.Provider swipeDirection="right" duration={5000}>
            {toasts.map((t) => (
                <RadixToast.Root
                    key={t.id}
                    open
                    className={cn(
                        "flex w-96 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
                        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2",
                        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full",
                        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
                        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
                        t.variant === "destructive"
                            ? "border-red-200 bg-red-50 text-red-900"
                            : "border-border bg-background text-foreground",
                    )}
                >
                    <div className="flex-1 min-w-0">
                        <RadixToast.Title className="text-sm font-semibold leading-snug">
                            {t.title}
                        </RadixToast.Title>
                        {t.description && (
                            <RadixToast.Description className="mt-0.5 text-xs text-muted-foreground">
                                {t.description}
                            </RadixToast.Description>
                        )}
                    </div>
                    <RadixToast.Close className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </RadixToast.Close>
                </RadixToast.Root>
            ))}
            <RadixToast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 outline-none" />
        </RadixToast.Provider>
    );
}
