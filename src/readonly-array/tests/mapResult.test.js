import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { mapResult } from '../index.js';

describe("mapResult", () => {
    it("transforms every element once and preserves order within both groups", () => {
        const spells = Object.freeze([
            Object.freeze({ name: "Cure", cost: 8 }),
            Object.freeze({ name: "Meteor", cost: 50 }),
            Object.freeze({ name: "Fireball", cost: 15 }),
            Object.freeze({ name: "Flare", cost: 40 }),
        ]);
        const calls = [];
        const castSpells = mapResult((...args) => {
            const [spell] = args;
            calls.push(args);

            return spell.cost <= 20
                ? Result.ok(`Cast ${spell.name}`)
                : Result.err(`${spell.name} needs more mana`);
        });
        const result = castSpells(spells);

        assert.deepStrictEqual(result, {
            values: ["Cast Cure", "Cast Fireball"],
            errors: ["Meteor needs more mana", "Flare needs more mana"],
        });
        assert.deepStrictEqual(calls, spells.map(spell => [spell]));
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
