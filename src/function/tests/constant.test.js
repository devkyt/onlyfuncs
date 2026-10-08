import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { constant } from '../index.js';

describe("constant", () => {
    it("returns the same simple value without input", () => {
        assert.strictEqual(constant(1)(), 1);
        assert.strictEqual(constant("link")(), "link");
        assert.strictEqual(constant(true)(), true);
    })

    it("returns the same simple value with input", () => {
        assert.strictEqual(constant(1)(42), 1);
        assert.strictEqual(constant("link")("zelda"), "link");
        assert.strictEqual(constant(true)(false), true);
    })

    it("returns the same complex value without input", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(constant(ob)(), ob);
        assert.strictEqual(constant(arr)(), arr);
    })

    it("returns the same complex value with input", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(constant(ob)({"health": 50}), ob);
        assert.strictEqual(constant(arr)([0,0]), arr);
    })

    it("returns falsy values without input", () => {
        assert.strictEqual(constant(0)(), 0);
        assert.strictEqual(constant("")(), "");
        assert.strictEqual(constant(false)(), false);
        assert.strictEqual(constant(null)(), null);
        assert.strictEqual(constant(undefined)(), undefined);
        assert.strictEqual(constant()(), undefined);
    })

    it("returns falsy values with input", () => {
        assert.strictEqual(constant(0)(42), 0);
        assert.strictEqual(constant("")("zelda"), "");
        assert.strictEqual(constant(false)(true), false);
        assert.strictEqual(constant(null)(undefined), null);
        assert.strictEqual(constant(undefined)(null), undefined);
        assert.strictEqual(constant()(null), undefined);
    })

    it("keeps separately captured values independent", () => {
        const health = constant("health");
        const stamina = constant("stamina");

        assert.strictEqual(health(), "health");
        assert.strictEqual(stamina(), "stamina");
    })
})
