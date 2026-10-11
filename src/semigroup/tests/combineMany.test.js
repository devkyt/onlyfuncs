import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sum, string, array, combineMany } from '../index.js';

describe("combineMany", () => {
    it("folds left to right from the supplied initial value", () => {
        const calls = [];
        const semigroup = {
            combine: (left, right) => {
                calls.push([left, right]);

                return left + right;
            },
        };
        const run = combineMany({ semigroup, initial: "Heroes: " });
        const result = run(Object.freeze(["Link", " and ", "Zelda"]));

        assert.strictEqual(result, "Heroes: Link and Zelda");
        assert.deepStrictEqual(calls, [
            ["Heroes: ", "Link"],
            ["Heroes: Link", " and "],
            ["Heroes: Link and ", "Zelda"],
        ]);
    });

    it("returns the exact initial value for empty input", () => {
        const initial = { health: 100 };
        const run = combineMany({
            semigroup: {
                combine: () => {
                    assert.fail("combine should not run");
                },
            },
            initial,
        });

        assert.strictEqual(run([]), initial);
    });

    it("accepts finite iterables", () => {
        const total = combineMany({ semigroup: sum, initial: 5 });
        const names = combineMany({ semigroup: string, initial: "" });

        assert.strictEqual(total(new Set([10, 20])), 35);
        assert.strictEqual(names("Link"), "Link");
    });

    it("starts fresh on repeated calls and preserves input references", () => {
        const link = Object.freeze({ health: 100 });
        const initial = Object.freeze([link]);
        const values = Object.freeze([Object.freeze(["Zelda"])]);
        const run = combineMany({ semigroup: array, initial });
        const first = run(values);
        const second = run(values);

        assert.deepStrictEqual(first, [link, "Zelda"]);
        assert.deepStrictEqual(second, first);
        assert.strictEqual(first[0], link);
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(initial, [link]);
    });

    it("propagates combine throws and stops consuming input", () => {
        const error = { reason: "No health" };

        function* values() {
            yield 10;
            assert.fail("later input should not be consumed");
        }

        const run = combineMany({
            semigroup: {
                combine: () => {
                    throw error;
                },
            },
            initial: 0,
        });

        assert.throws(() => run(values()), actual => actual === error);
    });

    it("propagates iteration failures", () => {
        const error = { reason: "Missing hero" };

        function* values() {
            yield 10;
            throw error;
        }

        const run = combineMany({ semigroup: sum, initial: 0 });

        assert.throws(() => run(values()), actual => actual === error);
    });
});
