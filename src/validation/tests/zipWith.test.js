import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { zipWith } from '../index.js';

describe("zipWith", () => {
    it("combines Ok payloads once and skips error combination", () => {
        const link = Object.freeze({ health: 100 });
        const output = { name: "Link", health: 100 };
        const calls = [];
        const run = zipWith({
            semigroup: { combine: () => assert.fail("error combine should not run") },
            combine: (...args) => {
                calls.push(args);

                return output;
            },
        });
        const result = run(Object.freeze(Result.ok(link)), Object.freeze(Result.ok("Link")));

        assert.deepStrictEqual(calls, [[link, "Link"]]);
        assert.strictEqual(calls[0][0], link);
        assert.deepStrictEqual(result, Result.ok(output));
        assert.strictEqual(result.value, output);
    });

    it("preserves a single Err and skips both callbacks", () => {
        const failure = Object.freeze(Result.err(undefined));
        const run = zipWith({
            semigroup: { combine: () => assert.fail("error combine should not run") },
            combine: () => assert.fail("value combine should not run"),
        });

        assert.strictEqual(run(failure, Result.ok("Zelda")), failure);
        assert.strictEqual(run(Result.ok("Link"), failure), failure);
    });

    it("combines both errors once in left-to-right order", () => {
        const left = Object.freeze(["Link missing"]);
        const right = Object.freeze(["Zelda missing"]);
        const calls = [];
        const run = zipWith({
            semigroup: {
                combine: (...args) => {
                    const [leftErrors, rightErrors] = args;
                    calls.push(args);

                    return [...leftErrors, ...rightErrors];
                },
            },
            combine: () => assert.fail("value combine should not run"),
        });
        const result = run(Object.freeze(Result.err(left)), Object.freeze(Result.err(right)));

        assert.deepStrictEqual(result, Result.err(["Link missing", "Zelda missing"]));
        assert.deepStrictEqual(calls, [[left, right]]);
        assert.strictEqual(calls[0][0], left);
        assert.strictEqual(calls[0][1], right);
    });

    it("passes nullish payloads and wraps callback output without flattening", () => {
        const output = Result.ok("Link");
        const run = zipWith({
            semigroup: {
                combine: (left, right) => {
                    assert.strictEqual(left, undefined);
                    assert.strictEqual(right, null);

                    return undefined;
                },
            },
            combine: (left, right) => {
                assert.strictEqual(left, null);
                assert.strictEqual(right, undefined);

                return output;
            },
        });

        const success = run(Result.ok(null), Result.ok(undefined));

        assert.deepStrictEqual(success, Result.ok(output));
        assert.strictEqual(success.value, output);
        assert.deepStrictEqual(run(Result.err(undefined), Result.err(null)), Result.err(undefined));
    });

    it("propagates value callback throws", () => {
        const error = { reason: "No health" };
        const run = zipWith({
            semigroup: { combine: () => assert.fail("error combine should not run") },
            combine: () => {
                throw error;
            },
        });

        assert.throws(() => run(Result.ok(1), Result.ok(2)), actual => actual === error);
    });

    it("propagates error combination throws", () => {
        const error = { reason: "Cannot combine" };
        const run = zipWith({
            semigroup: {
                combine: () => {
                    throw error;
                },
            },
            combine: () => assert.fail("value combine should not run"),
        });

        assert.throws(() => run(Result.err(1), Result.err(2)), actual => actual === error);
    });
});
