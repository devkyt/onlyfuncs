import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { and } from '../index.js';

describe("and", () => {
    it("requires every predicate to pass", () => {
        const canAttack = and(hero => hero.weapon !== null, hero => !hero.stunned);

        assert.strictEqual(canAttack({ weapon: "sword", stunned: false }), true);
        assert.strictEqual(canAttack({ weapon: null, stunned: false }), false);
        assert.strictEqual(canAttack({ weapon: "sword", stunned: true }), false);
        assert.strictEqual(canAttack({ weapon: null, stunned: true }), false);
    });

    it("returns true with no predicates", () => {
        assert.strictEqual(and()("Link"), true);
    });

    it("waits for input and passes only the original value in order", () => {
        const link = { health: 100, stamina: 50 };
        const calls = [];

        const check = and(
            (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);
                calls.push("health");

                return args[0].health > 0;
            },
            (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);
                calls.push("stamina");

                return args[0].stamina > 0;
            },
        );

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(check(link), true);
        assert.deepStrictEqual(calls, ["health", "stamina"]);
        assert.strictEqual(check(link), true);
        assert.deepStrictEqual(calls, ["health", "stamina", "health", "stamina"]);
    });

    it("skips later predicates after false", () => {
        const check = and(
            () => false,
            () => {
                assert.fail("later predicate should not run");
            },
        );

        assert.strictEqual(check("Link"), false);
    });

    it("passes falsy values unchanged", () => {
        assert.strictEqual(and(value => value === 0)(0), true);
        assert.strictEqual(and(value => value === false)(false), true);
        assert.strictEqual(and(value => value === null)(null), true);
        assert.strictEqual(and(value => value === undefined)(), true);
    });

    it("propagates a thrown value and skips later predicates", () => {
        const error = { reason: "Missing hero" };

        const check = and(
            () => {
                throw error;
            },
            () => {
                assert.fail("later predicate should not run");
            },
        );

        assert.throws(() => check("Link"), actual => actual === error);
    });
});
