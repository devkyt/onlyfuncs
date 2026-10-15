import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Option from '../../option/index.js';
import { mapOption } from '../index.js';

describe("mapOption", () => {
    it("transforms every element once and collects Some values in order", () => {
        const calls = [];
        const run = mapOption((...args) => {
            const [value] = args;
            calls.push(args);

            return value > 0 ? Option.some(value * 10) : Option.none;
        });

        assert.deepStrictEqual(run(Object.freeze([2, 0, 1])), [20, 10]);
        assert.deepStrictEqual(calls, [[2], [0], [1]]);
    });

    it("preserves references and present nullish and falsy payloads", () => {
        const link = Object.freeze({ health: 100 });
        const values = Object.freeze([link, undefined, null, false, 0]);
        const result = mapOption(Option.some)(values);

        assert.deepStrictEqual(result, values);
        assert.strictEqual(result[0], link);
        assert.notStrictEqual(result, values);
    });

    it("returns fresh arrays on repeated calls", () => {
        const run = mapOption(Option.some);
        const first = run(["Link"]);
        const second = run(["Link"]);

        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(second, first);
    });

    it("returns fresh empty arrays for empty input or only None results", () => {
        const run = mapOption(() => {
            assert.fail("transform should not run");
        });
        const first = run([]);
        const second = run([]);
        const discard = mapOption(() => Option.none);

        assert.deepStrictEqual(first, []);
        assert.deepStrictEqual(second, []);
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(discard([1, 2]), []);
    });

    it("visits array holes as undefined", () => {
        const calls = [];
        const result = mapOption(value => {
            calls.push(value);

            return Option.some(value);
        })(new Array(2));

        assert.deepStrictEqual(calls, [undefined, undefined]);
        assert.deepStrictEqual(result, [undefined, undefined]);
    });

    it("propagates transform throws and skips later elements", () => {
        const error = { reason: "Missing hero" };
        const calls = [];
        const run = mapOption(value => {
            calls.push(value);

            throw error;
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
