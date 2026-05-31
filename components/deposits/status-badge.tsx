import { cn, STATUS_CONFIG } from "@/lib/utils";
import type { DepositStatus } from "@/types";

interface StatusBadgeProps {
    status: DepositStatus;
    className?: string;
    size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full font-medium",
                config.bg,
                config.color,
                size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs",
                className,
            )}
        >
            <span
                className={cn(
                    "rounded-full flex-shrink-0",
                    config.dot,
                    size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
                )}
            />
            {config.label}
        </span>
    );
}
