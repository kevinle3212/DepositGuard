import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Isolated test of the in-process rate limiter without importing Next.js deps.

class RateLimiter {
    private readonly windows = new Map<string, { count: number; resetAt: number }>();
    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
    ) {}
    check(id: string): boolean {
        const now = Date.now();
        const existing = this.windows.get(id);
        if (!existing || now >= existing.resetAt) {
            this.windows.set(id, { count: 1, resetAt: now + this.windowMs });
            return true;
        }
        if (existing.count >= this.limit) return false;
        existing.count++;
        return true;
    }
}

describe("RateLimiter", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows requests within the limit", () => {
        const rl = new RateLimiter(3, 60_000);
        expect(rl.check("user-1")).toBe(true);
        expect(rl.check("user-1")).toBe(true);
        expect(rl.check("user-1")).toBe(true);
    });

    it("blocks the request that exceeds the limit", () => {
        const rl = new RateLimiter(3, 60_000);
        rl.check("user-1");
        rl.check("user-1");
        rl.check("user-1");
        expect(rl.check("user-1")).toBe(false);
    });

    it("resets the window after windowMs elapses", () => {
        const rl = new RateLimiter(1, 60_000);
        expect(rl.check("user-1")).toBe(true);
        expect(rl.check("user-1")).toBe(false);
        vi.advanceTimersByTime(60_001);
        expect(rl.check("user-1")).toBe(true);
    });

    it("tracks identifiers independently", () => {
        const rl = new RateLimiter(1, 60_000);
        expect(rl.check("user-a")).toBe(true);
        expect(rl.check("user-b")).toBe(true);
        expect(rl.check("user-a")).toBe(false);
        expect(rl.check("user-b")).toBe(false);
    });
});
