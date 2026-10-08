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
        const remainingHealth = (health, damage) => health - damage;
        const result = fromThrowable(() => remainingHealth(100, 10));

        assert.deepStrictEqual(result, ok(90));
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
        const text = fromThrowable(() => {
            throw "No stamina";
        });

        const zero = fromThrowable(() => {
            throw 0;
        });

        const falseValue = fromThrowable(() => {
            throw false;
        });

        const nullValue = fromThrowable(() => {
            throw null;
        });

        const undefinedValue = fromThrowable(() => {
            throw undefined;
        });

        assert.deepStrictEqual(text, err("No stamina"));
        assert.deepStrictEqual(zero, err(0));
        assert.deepStrictEqual(falseValue, err(false));
        assert.deepStrictEqual(nullValue, err(null));
        assert.deepStrictEqual(undefinedValue, err(undefined));
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
