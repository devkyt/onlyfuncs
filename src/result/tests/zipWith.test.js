import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, zipWith } from '../index.js';

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
        const left = Object.freeze(ok(link));
        const right = Object.freeze(ok("Link"));

        assert.strictEqual(calls, 0);

        const result = run(left, right);

        assert.deepStrictEqual(result, ok(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("skips the callback if either input is Err", () => {
        const left = err("Link missing");
        const right = err("Zelda missing");
        const run = zipWith(() => {
            assert.fail("combine should not run");
        });

        assert.strictEqual(run(left, ok("Zelda")), left);
        assert.strictEqual(run(ok("Link"), right), right);
        assert.strictEqual(run(left, right), left);
    });

    it("passes nullish payloads and wraps undefined output", () => {
        const run = zipWith((left, right) => {
            assert.strictEqual(left, null);
            assert.strictEqual(right, undefined);

            return undefined;
        });

        assert.deepStrictEqual(run(ok(null), ok(undefined)), ok(undefined));
    });

    it("wraps callback output without flattening", () => {
        const output = ok("Link");
        const run = zipWith(() => output);
        const result = run(ok(0), ok(false));

        assert.strictEqual(result.value, output);
    });

    it("propagates callback throws", () => {
        const error = { reason: "No health" };
        const run = zipWith(() => {
            throw error;
        });

        assert.throws(() => run(ok(1), ok(2)), actual => actual === error);
    });
});
