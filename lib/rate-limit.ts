import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface Window {
    count: number;
    resetAt: number;
}

/**
 * In-process per-identifier sliding-window rate limiter.
 *
 * NOTE: This is an application-level guard that works within a single Cloud Run
 * instance. For cross-instance enforcement, pair with a Cloud Armor rate-limit
 * policy on the load balancer (per-IP, per-minute threshold set in Terraform).
 */
class RateLimiter {
    private readonly windows = new Map<string, Window>();

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
    ) {}

    /** Returns true and updates state when the request is within limits. */
    check(id: string): boolean {
        const now = Date.now();
        const existing = this.windows.get(id);

        if (!existing || now >= existing.resetAt) {
            this.windows.set(id, { count: 1, resetAt: now + this.windowMs });
            return true;
        }

        if (existing.count >= this.limit) {
            return false;
        }

        existing.count++;
        return true;
    }

    /** Seconds until the window resets for the given identifier. */
    retryAfter(id: string): number {
        const w = this.windows.get(id);
        if (!w) return 0;
        return Math.ceil(Math.max(0, w.resetAt - Date.now()) / 1000);
    }
}

/** 20 TTS requests per user per minute. */
const ttslimiter = new RateLimiter(20, 60_000);

/**
 * Extracts a stable per-user identifier from the request.
 * Uses the Firebase Auth UID from the Authorization header when present,
 * otherwise falls back to the client IP.
 */
function requestId(req: NextRequest): string {
    const auth = req.headers.get("authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
        // Use the raw JWT as a key — cheap, avoids verify() latency here.
        return `jwt:${auth.slice(7, 50)}`;
    }
    return `ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
}

/**
 * Rate-limits the `/api/tts` endpoint.
 * Returns a 429 NextResponse when the limit is exceeded, otherwise null.
 */
export function ttsRateLimit(req: NextRequest): NextResponse | null {
    const id = requestId(req);
    if (ttslimiter.check(id)) return null;

    const retryAfter = ttslimiter.retryAfter(id);
    return NextResponse.json(
        { error: "Too many requests. Please wait before requesting more audio." },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Limit": "20",
                "X-RateLimit-Window": "60",
            },
        },
    );
}
