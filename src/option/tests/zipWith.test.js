import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, zipWith } from '../index.js';

describe("zipWith", () => {
    it("combines both payloads once in left-to-right order", () => {
        const link = Object.freeze({ health: 100 });
        const output = { name: "Link", health: 100 };
        let calls = 0;
        const run = zipWith((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, [link, "Link"]);
            assert.strictEqual(args[0], link);

            return output;
        });
        const left = Object.freeze(some(link));
        const right = Object.freeze(some("Link"));

        assert.strictEqual(calls, 0);

        const result = run(left, right);

        assert.deepStrictEqual(result, some(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("skips the callback if either input is None", () => {
        const run = zipWith(() => {
            assert.fail("combine should not run");
        });

        assert.strictEqual(run(none, some("Zelda")), none);
        assert.strictEqual(run(some("Link"), none), none);
        assert.strictEqual(run(none, none), none);
    });

    it("passes nullish payloads and wraps undefined output", () => {
        const run = zipWith((left, right) => {
            assert.strictEqual(left, null);
            assert.strictEqual(right, undefined);

            return undefined;
        });

        assert.deepStrictEqual(run(some(null), some(undefined)), some(undefined));
    });

    it("wraps callback output without flattening", () => {
        const output = some("Link");
        const run = zipWith(() => output);
        const result = run(some(0), some(false));

        assert.strictEqual(result.value, output);
    });

    it("propagates callback throws", () => {
        const error = { reason: "No health" };
        const run = zipWith(() => {
            throw error;
        });

        assert.throws(() => run(some(1), some(2)), actual => actual === error);
    });
});
