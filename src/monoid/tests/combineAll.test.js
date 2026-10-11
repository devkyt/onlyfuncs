import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sum, string, array, combineAll } from '../index.js';

describe("combineAll", () => {
    it("folds an iterable in input order", () => {
        assert.strictEqual(combineAll(string)(["Link", " and ", "Zelda"]), "Link and Zelda");
        assert.strictEqual(combineAll(sum)(new Set([10, 20])), 30);
    });

    it("calls empty once per invocation, including empty input", () => {
        const identities = [];
        const monoid = {
            empty: () => {
                const identity = [];
                identities.push(identity);

                return identity;
            },
            combine: (left, right) => [...left, ...right],
        };
        const run = combineAll(monoid);

        assert.deepStrictEqual(identities, []);

        const first = run([]);
        const second = run([["Link"]]);
        const third = run([]);

        assert.strictEqual(identities.length, 3);
        assert.strictEqual(first, identities[0]);
        assert.deepStrictEqual(second, ["Link"]);
        assert.strictEqual(third, identities[2]);
        assert.notStrictEqual(first, third);
    });

    it("preserves references and creates independent outputs", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze([Object.freeze([link])]);
        const run = combineAll(array);
        const first = run(input);
        const second = run(input);

        assert.deepStrictEqual(first, [link]);
        assert.deepStrictEqual(second, [link]);
        assert.strictEqual(first[0], link);
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(input, [[link]]);
    });

    it("propagates identity creation failures", () => {
        const error = { reason: "No identity" };
        const run = combineAll({
            empty: () => {
                throw error;
            },
            combine: () => {
                assert.fail("combine should not run");
            },
        });

        assert.throws(() => run([]), actual => actual === error);
    });

    it("propagates combine failures", () => {
        const error = { reason: "No health" };
        const run = combineAll({
            empty: () => 0,
            combine: () => {
                throw error;
            },
        });

        assert.throws(() => run([10]), actual => actual === error);
    });

    it("propagates iteration failures", () => {
        const error = { reason: "Missing hero" };

        function* values() {
            yield 10;
            throw error;
        }

        assert.throws(() => combineAll(sum)(values()), actual => actual === error);
    });
});
