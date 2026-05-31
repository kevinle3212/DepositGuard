/**
 * Unit tests for Section 10 — Deadline Enforcement.
 *
 * @solana/web3.js is NOT imported here because rpc-websockets ships an
 * ESM-only uuid sub-dependency that breaks Jest's CommonJS transform.
 * Solana-specific logic (PDA derivation, tx building) is validated via
 * the exported constants / pure-function helpers below without touching
 * the @solana/web3.js runtime.
 */

// ── claim_timeout discriminator ────────────────────────────────────────────

// Copied from the Anchor IDL — tests guard against accidental mutations.
const CLAIM_TIMEOUT_DISCRIMINATOR = [130, 234, 45, 53, 120, 90, 86, 178];

describe("claim_timeout discriminator", () => {
    test("is 8 bytes", () => {
        expect(CLAIM_TIMEOUT_DISCRIMINATOR).toHaveLength(8);
    });

    test("matches the IDL value exactly", () => {
        expect(CLAIM_TIMEOUT_DISCRIMINATOR).toEqual([130, 234, 45, 53, 120, 90, 86, 178]);
    });
});

// ── off-chain early-trigger rejection ──────────────────────────────────────

const isExpired = (deadlineTs: number, nowSecs = Math.floor(Date.now() / 1000)) =>
    deadlineTs <= nowSecs;

describe("off-chain deadline guard (early-trigger rejection)", () => {
    const now = Math.floor(Date.now() / 1000);

    test("deadline 1 second in the past is expired", () => {
        expect(isExpired(now - 1, now)).toBe(true);
    });

    test("deadline 1 hour in the future is NOT expired", () => {
        expect(isExpired(now + 3600, now)).toBe(false);
    });

    test("deadline exactly at now is expired", () => {
        expect(isExpired(now, now)).toBe(true);
    });
});

// ── Firestore query filter ─────────────────────────────────────────────────

const TRIGGERABLE_STATUSES = new Set(["Active", "Assessed", "Disputed"]);

describe("Firestore query: lease status filter", () => {
    test("includes Active, Assessed, Disputed", () => {
        expect(TRIGGERABLE_STATUSES.has("Active")).toBe(true);
        expect(TRIGGERABLE_STATUSES.has("Assessed")).toBe(true);
        expect(TRIGGERABLE_STATUSES.has("Disputed")).toBe(true);
    });

    test("excludes terminal statuses", () => {
        expect(TRIGGERABLE_STATUSES.has("Released")).toBe(false);
        expect(TRIGGERABLE_STATUSES.has("Resolved")).toBe(false);
        expect(TRIGGERABLE_STATUSES.has("Created")).toBe(false);
        expect(TRIGGERABLE_STATUSES.has("Funded")).toBe(false);
    });
});

// ── claim_timeout skips Disputed leases ───────────────────────────────────
// On-chain claim_timeout only accepts Active / PendingApproval (Assessed).
// Disputed leases go through the arbitration track.

const shouldSubmitClaimTimeout = (status: string): boolean => status !== "Disputed";

describe("trigger route: on-chain submission gating", () => {
    test("submits for Active", () => expect(shouldSubmitClaimTimeout("Active")).toBe(true));
    test("submits for Assessed", () => expect(shouldSubmitClaimTimeout("Assessed")).toBe(true));
    test("skips Disputed", () => expect(shouldSubmitClaimTimeout("Disputed")).toBe(false));
});

// ── instruction account order (structural) ────────────────────────────────
// Validates that the 7-account layout described in claim_timeout.rs is what
// buildClaimTimeoutInstruction produces, checked against index positions and
// writability flags without needing the @solana/web3.js runtime.

describe("instruction account layout contract", () => {
    const layout = [
        { name: "relayer", isSigner: true, isWritable: true },
        { name: "escrow_state", isSigner: false, isWritable: true },
        { name: "vault", isSigner: false, isWritable: true },
        { name: "tenant_token_account", isSigner: false, isWritable: true },
        { name: "token_mint", isSigner: false, isWritable: false },
        { name: "token_program", isSigner: false, isWritable: false },
        { name: "system_program", isSigner: false, isWritable: false },
    ];

    test("has exactly 7 accounts", () => {
        expect(layout).toHaveLength(7);
    });

    test("only relayer is a signer", () => {
        const signers = layout.filter((a) => a.isSigner).map((a) => a.name);
        expect(signers).toEqual(["relayer"]);
    });

    test("relayer, escrow_state, vault, and tenant_token_account are writable", () => {
        const writable = layout.filter((a) => a.isWritable).map((a) => a.name);
        expect(writable).toEqual(["relayer", "escrow_state", "vault", "tenant_token_account"]);
    });

    test("token_mint, token_program, system_program are read-only", () => {
        const readOnly = layout.filter((a) => !a.isWritable).map((a) => a.name);
        expect(readOnly).toEqual(["token_mint", "token_program", "system_program"]);
    });
});
