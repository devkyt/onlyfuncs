import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, tap } from '../index.js';

describe("tap", () => {
    it("calls the effect once and preserves the original wrapper", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(ok(link));
        let calls = 0;
        const run = tap((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return "ignored";
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(run(input), input);
        assert.strictEqual(calls, 1);
    });

    it("skips the effect for Err", () => {
        const input = err(undefined);
        const run = tap(() => {
            assert.fail("effect should not run");
        });

        assert.strictEqual(run(input), input);
    });

    it("passes undefined to the effect", () => {
        let calls = 0;
        const input = ok(undefined);
        const run = tap(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        });

        assert.strictEqual(run(input), input);
        assert.strictEqual(calls, 1);
    });

    it("does not wait for a returned Promise", () => {
        const input = ok("Link");
        const run = tap(() => new Promise(() => {}));

        assert.strictEqual(run(input), input);
    });

    it("propagates effect throws", () => {
        const error = { reason: "No stamina" };
        const run = tap(() => {
            throw error;
        });

        assert.throws(() => run(ok("Link")), actual => actual === error);
    });
});
