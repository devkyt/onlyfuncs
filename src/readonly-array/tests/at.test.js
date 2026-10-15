import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Option from '../../option/index.js';
import { at } from '../index.js';

describe("at", () => {
    it("reads positive and negative indices without changing the input", () => {
        const values = Object.freeze(["Link", "Zelda"]);

        assert.deepStrictEqual(at(0)(values), Option.some("Link"));
        assert.deepStrictEqual(at(1)(values), Option.some("Zelda"));
        assert.deepStrictEqual(at(-1)(values), Option.some("Zelda"));
        assert.deepStrictEqual(at(-2)(values), Option.some("Link"));
        assert.deepStrictEqual(at(-0)(values), Option.some("Link"));
    });

    it("returns shared none outside either boundary and for empty input", () => {
        const values = ["Link", "Zelda"];

        assert.strictEqual(at(2)(values), Option.none);
        assert.strictEqual(at(-3)(values), Option.none);
        assert.strictEqual(at(Number.MAX_SAFE_INTEGER)(values), Option.none);
        assert.strictEqual(at(Number.MIN_SAFE_INTEGER)(values), Option.none);
        assert.strictEqual(at(0)([]), Option.none);
        assert.strictEqual(at(-1)([]), Option.none);
    });

    it("normalizes a reused negative index against each input length", () => {
        const last = at(-1);

        assert.deepStrictEqual(last(["Link"]), Option.some("Link"));
        assert.deepStrictEqual(last(["Link", "Zelda"]), Option.some("Zelda"));
        assert.strictEqual(last([]), Option.none);
    });

    it("preserves payload references and present nullish values", () => {
        const link = Object.freeze({ health: 100 });
        const result = at(0)(Object.freeze([link]));

        assert.strictEqual(result.value, link);
        assert.deepStrictEqual(at(0)([null]), Option.some(null));
        assert.deepStrictEqual(at(0)([undefined]), Option.some(undefined));
        assert.deepStrictEqual(at(0)(new Array(1)), Option.some(undefined));
    });

    it("rejects invalid indices when configured without coercion", () => {
        const invalid = [0.5, -0.5, NaN, Infinity, -Infinity, "0", null, undefined, true];

        for (const index of invalid) {
            assert.throws(() => at(index), RangeError);
        }

        assert.throws(() => at(Number.MAX_SAFE_INTEGER + 1), RangeError);
        assert.throws(() => at(Number.MIN_SAFE_INTEGER - 1), RangeError);
    });
});
