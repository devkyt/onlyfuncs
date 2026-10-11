import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, fromNullable } from '../index.js';

describe("fromNullable", () => {
    it("preserves present values and skips the fallback", () => {
        const link = Object.freeze({ health: 100 });
        const run = fromNullable(() => {
            assert.fail("fallback should not run");
        });
        const result = run(link);

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, link);
        assert.deepStrictEqual(run(0), ok(0));
        assert.deepStrictEqual(run(false), ok(false));
        assert.deepStrictEqual(run(""), ok(""));
        assert.deepStrictEqual(run(NaN), ok(NaN));
    });

    it("passes null and undefined to the fallback once each", () => {
        const error = { reason: "Missing hero" };
        const calls = [];
        const run = fromNullable((...args) => {
            calls.push(args);

            return error;
        });
        const first = run(null);
        const second = run(undefined);

        assert.strictEqual(first.type, "err");
        assert.strictEqual(first.error, error);
        assert.strictEqual(second.type, "err");
        assert.strictEqual(second.error, error);
        assert.deepStrictEqual(calls, [[null], [undefined]]);
    });

    it("keeps a falsy fallback result", () => {
        const run = fromNullable(() => undefined);

        assert.deepStrictEqual(run(null), err(undefined));
    });

    it("propagates fallback throws", () => {
        const error = { reason: "Missing hero" };
        const run = fromNullable(() => {
            throw error;
        });

        assert.throws(() => run(null), actual => actual === error);
    });
});
