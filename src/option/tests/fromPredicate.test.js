import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, fromPredicate } from '../index.js';

describe("fromPredicate", () => {
    it("waits for a value and passes it to the predicate once", () => {
        const link = Object.freeze({ health: 100 });
        let calls = 0;
        const run = fromPredicate((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return true;
        });

        assert.strictEqual(calls, 0);

        const result = run(link);

        assert.strictEqual(result.type, "some");
        assert.strictEqual(result.value, link);
        assert.strictEqual(calls, 1);
    });

    it("returns none when the predicate fails", () => {
        const run = fromPredicate(health => health > 0);

        assert.strictEqual(run(0), none);
    });

    it("preserves accepted falsy and nullish values", () => {
        const run = fromPredicate(() => true);

        assert.deepStrictEqual(run(0), some(0));
        assert.deepStrictEqual(run(false), some(false));
        assert.deepStrictEqual(run(null), some(null));
        assert.deepStrictEqual(run(undefined), some(undefined));
    });

    it("propagates predicate throws", () => {
        const error = { reason: "No health" };
        const run = fromPredicate(() => {
            throw error;
        });

        assert.throws(() => run("Link"), actual => actual === error);
    });
});
