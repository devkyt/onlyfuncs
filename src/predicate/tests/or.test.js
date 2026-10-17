import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { or } from '../index.js';

describe("or", () => {
    it("requires at least one predicate to pass", () => {
        const canHeal = or(hero => hero.potions > 0, hero => hero.knowsCure);

        assert.strictEqual(canHeal({ potions: 1, knowsCure: false }), true);
        assert.strictEqual(canHeal({ potions: 0, knowsCure: true }), true);
        assert.strictEqual(canHeal({ potions: 1, knowsCure: true }), true);
        assert.strictEqual(canHeal({ potions: 0, knowsCure: false }), false);
    });

    it("returns false with no predicates", () => {
        assert.strictEqual(or()("Link"), false);
    });

    it("waits for input and passes only the original value in order", () => {
        const zelda = { stamina: 0, magic: 30 };
        const calls = [];

        const check = or(
            (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], zelda);
                calls.push("stamina");

                return args[0].stamina > 0;
            },
            (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], zelda);
                calls.push("magic");

                return args[0].magic > 0;
            },
        );

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(check(zelda), true);
        assert.deepStrictEqual(calls, ["stamina", "magic"]);
        assert.strictEqual(check(zelda), true);
        assert.deepStrictEqual(calls, ["stamina", "magic", "stamina", "magic"]);
    });

    it("skips later predicates after true", () => {
        const check = or(
            () => true,
            () => {
                assert.fail("later predicate should not run");
            },
        );

        assert.strictEqual(check("Link"), true);
    });

    it("passes falsy values unchanged", () => {
        assert.strictEqual(or(value => value === 0)(0), true);
        assert.strictEqual(or(value => value === false)(false), true);
        assert.strictEqual(or(value => value === null)(null), true);
        assert.strictEqual(or(value => value === undefined)(), true);
    });

    it("propagates a thrown value and skips later predicates", () => {
        const error = { reason: "Missing hero" };

        const check = or(
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
