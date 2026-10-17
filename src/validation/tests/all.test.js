import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import * as Semigroup from '../../semigroup/index.js';
import { all } from '../index.js';

describe("all", () => {
    it("collects successful payloads in order without mutation", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze([
            Object.freeze(Result.ok(link)), Result.ok(0), Result.ok(false),
            Result.ok(null), Result.ok(undefined),
        ]);
        const result = all(Semigroup.array)(input);

        assert.deepStrictEqual(result, Result.ok([link, 0, false, null, undefined]));
        assert.strictEqual(result.value[0], link);
    });

    it("returns Ok of a fresh empty array for empty input", () => {
        const first = all(Semigroup.array)([]);
        const second = all(Semigroup.array)([]);

        assert.deepStrictEqual(first, Result.ok([]));
        assert.deepStrictEqual(second, Result.ok([]));
        assert.notStrictEqual(first.value, second.value);
    });

    it("accumulates every error in input order", () => {
        const attackErrors = Object.freeze(["No weapon equipped"]);
        const spellErrors = Object.freeze(["Spell is locked"]);
        const input = Object.freeze([
            Object.freeze(Result.err(attackErrors)), Result.ok(100),
            Object.freeze(Result.err(spellErrors)), Result.err(["Not enough mana"]),
        ]);
        const result = all(Semigroup.array)(input);

        assert.deepStrictEqual(result, Result.err([
            "No weapon equipped", "Spell is locked", "Not enough mana",
        ]));
    });

    it("keeps a single error without calling combine", () => {
        const error = { reason: "No healing items" };
        const semigroup = {
            combine: () => {
                assert.fail("combine should not run");
            },
        };
        const result = all(semigroup)([Result.ok(100), Result.err(error)]);

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("recognizes nullish and falsy errors", () => {
        const semigroup = {
            combine: () => {
                assert.fail("combine should not run");
            },
        };

        assert.deepStrictEqual(all(semigroup)([Result.err(undefined)]), Result.err(undefined));
        assert.deepStrictEqual(all(semigroup)([Result.err(null)]), Result.err(null));
        assert.deepStrictEqual(all(semigroup)([Result.err(false)]), Result.err(false));
        assert.deepStrictEqual(all(semigroup)([Result.err(0)]), Result.err(0));
    });

    it("uses the first error as the accumulator even when it is undefined", () => {
        const calls = [];
        const semigroup = {
            combine: (left, right) => {
                calls.push([left, right]);

                return right;
            },
        };
        const result = all(semigroup)([Result.err(undefined), Result.err(false), Result.err(0)]);

        assert.deepStrictEqual(result, Result.err(0));
        assert.deepStrictEqual(calls, [[undefined, false], [false, 0]]);
    });

    it("accepts finite iterables and consumes entries after an Err", () => {
        const calls = [];

        function* results() {
            calls.push("Link");
            yield Result.err(["No weapon equipped"]);
            calls.push("Zelda");
            yield Result.err(["Spell is locked"]);
        }

        const result = all(Semigroup.array)(results());

        assert.deepStrictEqual(result, Result.err(["No weapon equipped", "Spell is locked"]));
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("propagates iteration failures after an Err", () => {
        const error = { reason: "Loadout unavailable" };

        function* results() {
            yield Result.err(["No healing items"]);
            throw error;
        }

        assert.throws(() => all(Semigroup.array)(results()), actual => actual === error);
    });

    it("propagates combine failures", () => {
        const error = { reason: "Cannot combine" };
        const semigroup = {
            combine: () => {
                throw error;
            },
        };
        const input = [Result.err("Link"), Result.err("Zelda")];

        assert.throws(() => all(semigroup)(input), actual => actual === error);
    });

    it("keeps separate accumulators on repeated calls", () => {
        const run = all(Semigroup.array);

        assert.deepStrictEqual(run([Result.err(["No healing items"])]), Result.err(["No healing items"]));
        assert.deepStrictEqual(run([Result.ok(100)]), Result.ok([100]));
        assert.deepStrictEqual(run([]), Result.ok([]));
    });
});
