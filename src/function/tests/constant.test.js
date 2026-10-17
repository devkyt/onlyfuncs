import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { constant } from '../index.js';

describe("constant", () => {
    it("returns the same simple value without input", () => {
        assert.strictEqual(constant(1)(), 1);
        assert.strictEqual(constant("link")(), "link");
        assert.strictEqual(constant(true)(), true);
    });

    it("returns the same simple value with input", () => {
        assert.strictEqual(constant(1)(42), 1);
        assert.strictEqual(constant("link")("zelda"), "link");
        assert.strictEqual(constant(true)(false), true);
    });

    it("returns the same complex value without input", () => {
        const hero = { health: 100 };
        const items = [1, 2, 3];

        assert.strictEqual(constant(hero)(), hero);
        assert.strictEqual(constant(items)(), items);
    });

    it("returns the same complex value with input", () => {
        const hero = { health: 100 };
        const items = [1, 2, 3];

        assert.strictEqual(constant(hero)({ health: 50 }), hero);
        assert.strictEqual(constant(items)([0, 0]), items);
    });

    it("returns falsy values without input", () => {
        assert.strictEqual(constant(0)(), 0);
        assert.strictEqual(constant("")(), "");
        assert.strictEqual(constant(false)(), false);
        assert.strictEqual(constant(null)(), null);
        assert.strictEqual(constant(undefined)(), undefined);
        assert.strictEqual(constant()(), undefined);
    });

    it("returns falsy values with input", () => {
        assert.strictEqual(constant(0)(42), 0);
        assert.strictEqual(constant("")("zelda"), "");
        assert.strictEqual(constant(false)(true), false);
        assert.strictEqual(constant(null)(undefined), null);
        assert.strictEqual(constant(undefined)(null), undefined);
        assert.strictEqual(constant()(null), undefined);
    });

    it("keeps separately captured values independent", () => {
        const health = constant("health");
        const stamina = constant("stamina");

        assert.strictEqual(health(), "health");
        assert.strictEqual(stamina(), "stamina");
    });

    it("preserves a function as data without executing it", () => {
        const castSpell = () => assert.fail("stored spell should not run");

        assert.strictEqual(constant(castSpell)("Goblin"), castSpell);
    });
});
