import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { not } from '../index.js';

describe("not", () => {
    it("reverses true and false", () => {
        const isCursed = item => item.cursed;
        const canEquip = not(isCursed);

        assert.strictEqual(canEquip({ cursed: true }), false);
        assert.strictEqual(canEquip({ cursed: false }), true);
    });

    it("waits for a value, then calls the predicate once per use", () => {
        let calls = 0;

        const hasNoStamina = not(stamina => {
            calls += 1;

            return stamina > 0;
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(hasNoStamina(50), false);
        assert.strictEqual(calls, 1);
        assert.strictEqual(hasNoStamina(0), true);
        assert.strictEqual(calls, 2);
    });

    it("passes only the original value to the predicate", () => {
        const link = { health: 100 };

        const isDefeated = not((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return args[0].health > 0;
        });

        assert.strictEqual(isDefeated(link), false);
    });

    it("passes falsy values to the predicate unchanged", () => {
        const isNotZero = not(value => value === 0);
        const isNotFalse = not(value => value === false);
        const isNotEmpty = not(value => value === "");
        const isNotNull = not(value => value === null);
        const isDefined = not(value => value === undefined);

        assert.strictEqual(isNotZero(0), false);
        assert.strictEqual(isNotFalse(false), false);
        assert.strictEqual(isNotEmpty(""), false);
        assert.strictEqual(isNotNull(null), false);
        assert.strictEqual(isDefined(undefined), false);
        assert.strictEqual(isDefined(), false);
    });

    it("lets predicate errors pass through unchanged", () => {
        const error = { reason: "No stamina" };

        const check = not(() => {
            throw error;
        });

        assert.throws(() => check("Zelda"), actual => actual === error);
    });
});
