import { issue, consume } from "./nonce";

const pk = (n: number) => `test_pubkey_${n}`;

describe("nonce store", () => {
    it("consumes a valid nonce", () => {
        const nonce = issue(pk(1));
        expect(consume(pk(1), nonce)).toBe(true);
    });

    it("rejects an already-consumed nonce", () => {
        const nonce = issue(pk(2));
        consume(pk(2), nonce);
        expect(consume(pk(2), nonce)).toBe(false);
    });

    it("rejects a wrong nonce", () => {
        issue(pk(3));
        expect(consume(pk(3), "wrong-nonce")).toBe(false);
    });

    it("rejects a nonce for an unknown pubkey", () => {
        expect(consume("no-such-pubkey", "any-nonce")).toBe(false);
    });

    it("rejects an expired nonce", () => {
        const base = 1_000_000;
        const spy = jest.spyOn(Date, "now").mockReturnValue(base);
        const nonce = issue(pk(5));
        spy.mockReturnValue(base + 6 * 60 * 1000); // 6 min past the 5-min TTL
        expect(consume(pk(5), nonce)).toBe(false);
        spy.mockRestore();
    });
});
