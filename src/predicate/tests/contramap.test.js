import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { contramap } from '../index.js';

describe("contramap", () => {
    it("adapts a predicate to a selected value", () => {
        const isAlive = contramap(hero => hero.health)(health => health > 0);

        assert.strictEqual(isAlive({ health: 100 }), true);
        assert.strictEqual(isAlive({ health: 0 }), false);
    });

    it("waits for input and calls selector then predicate once per use", () => {
        const link = { stats: { health: 100 } };
        const calls = [];

        const select = contramap((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);
            calls.push("selector");

            return args[0].stats;
        });

        assert.deepStrictEqual(calls, []);

        const check = select((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link.stats);
            calls.push("predicate");

            return args[0].health > 0;
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(check(link), true);
        assert.strictEqual(check(link), true);
        assert.deepStrictEqual(calls, ["selector", "predicate", "selector", "predicate"]);
    });

    it("passes falsy selected values to the predicate", () => {
        const isZero = contramap(hero => hero.stamina)(value => value === 0);
        const isFalse = contramap(hero => hero.alive)(value => value === false);
        const isMissing = contramap(hero => hero.magic)(value => value === undefined);

        assert.strictEqual(isZero({ stamina: 0 }), true);
        assert.strictEqual(isFalse({ alive: false }), true);
        assert.strictEqual(isMissing({}), true);
    });

    it("propagates selector errors and skips the predicate", () => {
        const error = { reason: "Missing hero" };

        const check = contramap(() => {
            throw error;
        })(() => {
            assert.fail("predicate should not run");
        });

        assert.throws(() => check("Link"), actual => actual === error);
    });

    it("propagates predicate errors unchanged", () => {
        const error = new Error("No stamina");

        const check = contramap(hero => hero.stamina)(() => {
            throw error;
        });

        assert.throws(() => check({ stamina: 0 }), actual => actual === error);
    });
});
