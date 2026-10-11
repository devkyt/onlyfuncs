import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, tap } from '../index.js';

describe("tap", () => {
    it("calls the effect once and preserves the original wrapper", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(some(link));
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

    it("skips the effect for None", () => {
        const run = tap(() => {
            assert.fail("effect should not run");
        });

        assert.strictEqual(run(none), none);
    });

    it("passes undefined to the effect", () => {
        let calls = 0;
        const input = some(undefined);
        const run = tap(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        });

        assert.strictEqual(run(input), input);
        assert.strictEqual(calls, 1);
    });

    it("does not wait for a returned Promise", () => {
        const input = some("Link");
        const run = tap(() => new Promise(() => {}));

        assert.strictEqual(run(input), input);
    });

    it("propagates effect throws", () => {
        const error = { reason: "No stamina" };
        const run = tap(() => {
            throw error;
        });

        assert.throws(() => run(some("Link")), actual => actual === error);
    });
});
