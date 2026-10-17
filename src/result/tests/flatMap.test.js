import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, flatMap } from '../index.js';

describe("flatMap", () => {
    it("returns the callback's Ok without nesting it", () => {
        const spell = Object.freeze({ name: "Blizzard", cost: 12 });
        const input = Object.freeze(ok(spell));
        const cast = ok({ spell: "Blizzard", target: "Goblin" });
        const castSpell = value => value.cost <= 20 ? cast : err("Not enough mana");

        assert.strictEqual(flatMap(castSpell)(input), cast);
        assert.strictEqual(input.value, spell);
    });

    it("returns the callback's Err unchanged", () => {
        const failure = err("No health");

        assert.strictEqual(flatMap(() => failure)(ok(0)), failure);
    });

    it("leaves Err unchanged and skips the callback", () => {
        const failure = err({ stamina: 0 });

        const run = flatMap(() => {
            assert.fail("callback should not run");
        });

        assert.strictEqual(run(failure), failure);
    });

    it("waits for an input, then calls the callback once", () => {
        const link = { stamina: 50 };
        let calls = 0;

        const staminaOf = flatMap((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return ok(args[0].stamina);
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(staminaOf(ok(link)), ok(50));
        assert.strictEqual(calls, 1);
    });

    it("passes a successful undefined to the callback", () => {
        const isUndefined = flatMap(value => ok(value === undefined));

        assert.deepStrictEqual(isUndefined(ok(undefined)), ok(true));
    });

    it("lets callback errors throw instead of returning Err", () => {
        const error = new Error("No stamina");

        const run = flatMap(() => {
            throw error;
        });

        assert.throws(() => run(ok("Link")), actual => actual === error);
    });
});
