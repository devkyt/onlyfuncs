import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { mapResult } from '../index.js';

describe("mapResult", () => {
    it("transforms every element once and preserves order within both groups", () => {
        const calls = [];
        const run = mapResult((...args) => {
            const [value] = args;
            calls.push(args);

            return value > 0 ? Result.ok(value * 10) : Result.err(value);
        });
        const result = run(Object.freeze([2, -1, 1, 0]));

        assert.deepStrictEqual(result, { values: [20, 10], errors: [-1, 0] });
        assert.deepStrictEqual(calls, [[2], [-1], [1], [0]]);
    });

    it("preserves payload references and nullish values in both groups", () => {
        const link = Object.freeze({ health: 100 });
        const error = Object.freeze({ reason: "Missing hero" });
        const inputs = Object.freeze([
            Result.ok(link),
            Result.err(error),
            Result.ok(undefined),
            Result.err(null),
        ]);
        const result = mapResult(value => value)(inputs);

        assert.deepStrictEqual(result, { values: [link, undefined], errors: [error, null] });
        assert.strictEqual(result.values[0], link);
        assert.strictEqual(result.errors[0], error);
    });

    it("handles all-success and all-error inputs", () => {
        assert.deepStrictEqual(mapResult(Result.ok)([0, false]), {
            values: [0, false],
            errors: [],
        });
        assert.deepStrictEqual(mapResult(Result.err)([undefined, false]), {
            values: [],
            errors: [undefined, false],
        });
    });

    it("returns a fresh record and arrays on every call", () => {
        const run = mapResult(Result.ok);
        const first = run(["Link"]);
        const second = run(["Link"]);

        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.values, second.values);
        assert.notStrictEqual(first.errors, second.errors);
        assert.notStrictEqual(first.values, first.errors);
    });

    it("returns fresh empty arrays without calling the transform", () => {
        const run = mapResult(() => {
            assert.fail("transform should not run");
        });
        const first = run([]);
        const second = run([]);

        assert.deepStrictEqual(first, { values: [], errors: [] });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.values, second.values);
        assert.notStrictEqual(first.errors, second.errors);
    });

    it("visits array holes as undefined", () => {
        assert.deepStrictEqual(mapResult(Result.ok)(new Array(1)), {
            values: [undefined],
            errors: [],
        });
    });

    it("propagates transform throws and skips later elements", () => {
        const error = { reason: "Missing hero" };
        const calls = [];
        const run = mapResult(value => {
            calls.push(value);

            throw error;
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
