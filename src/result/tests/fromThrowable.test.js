import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, fromThrowable } from '../index.js';

describe("fromThrowable", () => {
    it("calls the function immediately, once, with no arguments", () => {
        let calls = 0;

        const result = fromThrowable((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return "Link";
        });

        assert.strictEqual(calls, 1);
        assert.deepStrictEqual(result, ok("Link"));
    });

    it("supports functions with parameters through a wrapper", () => {
        const chooseItem = (inventory, slot) => inventory[slot];
        const potion = Object.freeze({ kind: "potion", healing: 25 });
        const result = fromThrowable(() => chooseItem(["sword", potion], 1));

        assert.deepStrictEqual(result, { type: "ok", value: potion });
        assert.strictEqual(result.value, potion);
    });

    it("keeps falsy return values inside Ok", () => {
        assert.deepStrictEqual(fromThrowable(() => 0), ok(0));
        assert.deepStrictEqual(fromThrowable(() => false), ok(false));
        assert.deepStrictEqual(fromThrowable(() => ""), ok(""));
        assert.deepStrictEqual(fromThrowable(() => null), ok(null));
        assert.deepStrictEqual(fromThrowable(() => undefined), ok(undefined));
        assert.deepStrictEqual(fromThrowable(() => NaN), ok(NaN));
    });

    it("preserves the returned object reference", () => {
        const zelda = { health: 100, stamina: 50 };

        assert.strictEqual(fromThrowable(() => zelda).value, zelda);
    });

    it("wraps a thrown Error in Err unchanged", () => {
        const error = new Error("No health");
        const result = fromThrowable(() => {
            throw error;
        });

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("wraps a thrown object in Err unchanged", () => {
        const reason = { stamina: 0 };
        const result = fromThrowable(() => {
            throw reason;
        });

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, reason);
    });

    it("catches thrown strings, numbers, and other simple values", () => {
        for (const error of ["Not enough mana", 0, false, null, undefined]) {
            const result = fromThrowable(() => {
                throw error;
            });

            assert.deepStrictEqual(result, { type: "err", error }, `thrown: ${String(error)}`);
        }
    });

    it("returns Ok when an Error is returned instead of thrown", () => {
        const error = new Error("No health");
        const result = fromThrowable(() => error);

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, error);
    });

    it("wraps a Promise in Ok and leaves its rejection alone", async () => {
        const error = new Error("No stamina");
        const promise = Promise.reject(error);
        const result = fromThrowable(() => promise);

        // Observe the rejection so it cannot become an unhandled rejection.
        await assert.rejects(promise, actual => actual === error);
        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, promise);
    });
});
