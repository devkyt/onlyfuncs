import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Option from '../../option/index.js';
import { findFirst } from '../index.js';

describe("findFirst", () => {
    it("returns the first match and skips later predicates", () => {
        const calls = [];
        const run = findFirst((...args) => {
            const [value] = args;
            calls.push(args);

            return value > 5;
        });

        assert.deepStrictEqual(run(Object.freeze([0, 10, 20])), Option.some(10));
        assert.deepStrictEqual(calls, [[0], [10]]);
    });

    it("preserves the matched object reference", () => {
        const link = Object.freeze({ health: 100 });
        const result = findFirst(hero => hero.health > 0)(Object.freeze([link]));

        assert.deepStrictEqual(result, Option.some(link));
        assert.strictEqual(result.value, link);
    });

    it("returns shared none after checking every nonmatching value", () => {
        const calls = [];
        const result = findFirst(value => {
            calls.push(value);

            return false;
        })([0, 1]);

        assert.strictEqual(result, Option.none);
        assert.deepStrictEqual(calls, [0, 1]);
    });

    it("skips the predicate for empty input", () => {
        const run = findFirst(() => {
            assert.fail("predicate should not run");
        });

        assert.strictEqual(run([]), Option.none);
    });

    it("distinguishes matched nullish and falsy values from absence", () => {
        const run = findFirst(() => true);

        assert.deepStrictEqual(run([undefined]), Option.some(undefined));
        assert.deepStrictEqual(run([null]), Option.some(null));
        assert.deepStrictEqual(run([false]), Option.some(false));
        assert.deepStrictEqual(run([0]), Option.some(0));
        assert.deepStrictEqual(run(new Array(1)), Option.some(undefined));
    });

    it("propagates predicate throws and stops visiting input", () => {
        const error = { reason: "Missing hero" };
        const calls = [];
        const run = findFirst(value => {
            calls.push(value);

            throw error;
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
