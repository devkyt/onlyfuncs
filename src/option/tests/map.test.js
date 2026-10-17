import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, map } from '../index.js';

describe("map", () => {
    it("transforms a present value without changing the input", () => {
        const weapon = Object.freeze({ kind: "sword", damage: 12 });
        const input = Object.freeze(some(weapon));
        const enchant = map(item => ({ ...item, damage: item.damage + 5 }));
        const result = enchant(input);

        assert.deepStrictEqual(result, { type: "some", value: { kind: "sword", damage: 17 } });
        assert.strictEqual(input.value, weapon);
        assert.notStrictEqual(result, input);
    });

    it("skips the transform for none", () => {
        const run = map(() => {
            assert.fail("transform should not run");
        });

        assert.strictEqual(run(none), none);
    });

    it("waits for an input, then transforms its value once", () => {
        const link = { health: 100 };
        let calls = 0;

        const healthOf = map((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return args[0].health;
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(healthOf(some(link)), some(100));
        assert.strictEqual(calls, 1);
    });

    it("handles undefined inputs and null or undefined outputs", () => {
        assert.deepStrictEqual(map(value => value === undefined)(some(undefined)), some(true));
        assert.deepStrictEqual(map(() => undefined)(some("Link")), some(undefined));
        assert.deepStrictEqual(map(() => null)(some("Zelda")), some(null));
    });

    it("keeps the object returned by the callback", () => {
        const zelda = { stamina: 50 };

        assert.strictEqual(map(() => zelda)(some("Link")).value, zelda);
    });

    it("lets callback errors pass through unchanged", () => {
        const error = { reason: "No stamina" };

        const run = map(() => {
            throw error;
        });

        assert.throws(() => run(some("Link")), actual => actual === error);
    });

    it("wraps a returned Option without flattening it", () => {
        const selected = some({ kind: "potion", healing: 25 });
        const result = map(() => selected)(some("potion"));

        assert.deepStrictEqual(result, { type: "some", value: selected });
        assert.strictEqual(result.value, selected);
    });
});
