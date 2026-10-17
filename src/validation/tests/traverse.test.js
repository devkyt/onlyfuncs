import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import * as Semigroup from '../../semigroup/index.js';
import { traverse } from '../index.js';

describe("traverse", () => {
    it("collects successful payloads in order without mutation", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze([link, 0, false, null, undefined]);
        const run = traverse({ semigroup: Semigroup.array, transform: Result.ok });
        const result = run(input);

        assert.deepStrictEqual(result, Result.ok([link, 0, false, null, undefined]));
        assert.strictEqual(result.value[0], link);
    });

    it("returns Ok of a fresh empty array for empty input", () => {
        const run = traverse({
            semigroup: Semigroup.array,
            transform: () => {
                assert.fail("transform should not run");
            },
        });
        const first = run([]);
        const second = run([]);

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
        const run = traverse({ semigroup: Semigroup.array, transform: value => value });
        const result = run(input);

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
        const run = traverse({ semigroup, transform: value => value });
        const result = run([Result.ok(100), Result.err(error)]);

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("recognizes nullish and falsy errors", () => {
        const semigroup = {
            combine: () => {
                assert.fail("combine should not run");
            },
        };
        const run = traverse({ semigroup, transform: value => value });

        assert.deepStrictEqual(run([Result.err(undefined)]), Result.err(undefined));
        assert.deepStrictEqual(run([Result.err(null)]), Result.err(null));
        assert.deepStrictEqual(run([Result.err(false)]), Result.err(false));
        assert.deepStrictEqual(run([Result.err(0)]), Result.err(0));
    });

    it("uses the first error as the accumulator even when it is undefined", () => {
        const calls = [];
        const semigroup = {
            combine: (left, right) => {
                calls.push([left, right]);

                return right;
            },
        };
        const run = traverse({ semigroup, transform: value => value });
        const result = run([Result.err(undefined), Result.err(false), Result.err(0)]);

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

        const run = traverse({ semigroup: Semigroup.array, transform: value => value });
        const result = run(results());

        assert.deepStrictEqual(result, Result.err(["No weapon equipped", "Spell is locked"]));
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("propagates iteration failures after an Err", () => {
        const error = { reason: "Loadout unavailable" };

        function* results() {
            yield Result.err(["No healing items"]);
            throw error;
        }

        const run = traverse({ semigroup: Semigroup.array, transform: value => value });

        assert.throws(() => run(results()), actual => actual === error);
    });

    it("propagates combine failures", () => {
        const error = { reason: "Cannot combine" };
        const semigroup = {
            combine: () => {
                throw error;
            },
        };
        const input = [Result.err("Link"), Result.err("Zelda")];
        const run = traverse({ semigroup, transform: value => value });

        assert.throws(() => run(input), actual => actual === error);
    });

    it("calls the transform once per value and continues after errors", () => {
        const calls = [];
        const run = traverse({
            semigroup: Semigroup.array,
            transform: (...args) => {
                calls.push(args);

                return Result.err([args[0]]);
            },
        });

        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(run(["Link", "Zelda"]), Result.err(["Link", "Zelda"]));
        assert.deepStrictEqual(calls, [["Link"], ["Zelda"]]);
    });

    it("keeps separate accumulators on repeated calls", () => {
        const run = traverse({
            semigroup: Semigroup.array,
            transform: value => value ? Result.ok(value) : Result.err(["No healing items"]),
        });

        assert.deepStrictEqual(run([0]), Result.err(["No healing items"]));
        assert.deepStrictEqual(run([100]), Result.ok([100]));
        assert.deepStrictEqual(run([]), Result.ok([]));
    });

    it("propagates transform throws and skips remaining inputs", () => {
        const error = { reason: "Loadout unavailable" };
        const calls = [];
        const run = traverse({
            semigroup: Semigroup.array,
            transform: value => {
                calls.push(value);

                throw error;
            },
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
