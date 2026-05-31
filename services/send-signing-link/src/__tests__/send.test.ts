import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-32-bytes-xxxxxxxxxxx";
// GCP_PROJECT_ID must be unset so getJwtSecret() falls back to env var.
delete process.env.GCP_PROJECT_ID;
process.env.JWT_SIGNING_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { issueSigningToken, verifySigningToken } =
    require("../lib/jwt.js") as typeof import("../lib/jwt.js");

describe("issueSigningToken", () => {
    it("returns a JWT string", async () => {
        const token = await issueSigningToken("lease-1", "landlord", "landlord@test.com");
        expect(typeof token).toBe("string");
        expect(token.split(".").length).toBe(3);
    });

    it("encodes leaseId, role, and email in payload", async () => {
        const token = await issueSigningToken("lease-2", "tenant", "tenant@test.com");
        const decoded = jwt.verify(token, SECRET) as Record<string, unknown>;
        expect(decoded.leaseId).toBe("lease-2");
        expect(decoded.role).toBe("tenant");
        expect(decoded.email).toBe("tenant@test.com");
    });

    it("expires in approximately 48 hours", async () => {
        const token = await issueSigningToken("lease-3", "landlord", "a@b.com");
        const decoded = jwt.verify(token, SECRET) as Record<string, unknown>;
        const exp = decoded.exp as number;
        const iat = decoded.iat as number;
        const ttl = exp - iat;
        // 48h = 172800s; allow ±5s tolerance
        expect(ttl).toBeGreaterThanOrEqual(172795);
        expect(ttl).toBeLessThanOrEqual(172805);
    });

    it("includes a unique jti per token", async () => {
        const t1 = await issueSigningToken("lease-4", "landlord", "a@b.com");
        const t2 = await issueSigningToken("lease-4", "landlord", "a@b.com");
        const d1 = jwt.decode(t1) as Record<string, unknown>;
        const d2 = jwt.decode(t2) as Record<string, unknown>;
        expect(d1.jti).not.toBe(d2.jti);
    });
});

describe("verifySigningToken", () => {
    it("verifies a valid token", async () => {
        const token = await issueSigningToken("lease-5", "tenant", "tenant@test.com");
        const payload = await verifySigningToken(token);
        expect(payload.leaseId).toBe("lease-5");
        expect(payload.role).toBe("tenant");
        expect(payload.email).toBe("tenant@test.com");
    });

    it("throws on tampered token", async () => {
        const token = await issueSigningToken("lease-6", "landlord", "a@b.com");
        const tampered = token.slice(0, -3) + "xxx";
        await expect(verifySigningToken(tampered)).rejects.toThrow();
    });

    it("throws on expired token", async () => {
        const expired = jwt.sign(
            { leaseId: "x", role: "landlord", email: "a@b.com", jti: "y" },
            SECRET,
            { expiresIn: -1 },
        );
        await expect(verifySigningToken(expired)).rejects.toThrow();
    });

    it("throws when signed with wrong secret", async () => {
        const badToken = jwt.sign(
            { leaseId: "x", role: "landlord", email: "a@b.com", jti: "y" },
            "wrong-secret",
        );
        await expect(verifySigningToken(badToken)).rejects.toThrow();
    });
});
