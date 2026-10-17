import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { identity } from '../index.js';

describe("identity", () => {
    it("returns the same value for simple inputs", () => {
        assert.strictEqual(identity(1), 1);
        assert.strictEqual(identity("link"), "link");
        assert.strictEqual(identity(true), true);
    });

    it("returns the same value for complex inputs", () => {
        const hero = { health: 100 };
        const items = [1, 2, 3];

        assert.strictEqual(identity(hero), hero);
        assert.strictEqual(identity(items), items);
    });

    it("returns the same value for falsy inputs", () => {
        assert.strictEqual(identity(0), 0);
        assert.strictEqual(identity(""), "");
        assert.strictEqual(identity(false), false);
        assert.strictEqual(identity(null), null);
        assert.strictEqual(identity(undefined), undefined);
        assert.strictEqual(identity(), undefined);
    });

    it("preserves a function as data without executing it", () => {
        const castSpell = () => assert.fail("stored spell should not run");

        assert.strictEqual(identity(castSpell), castSpell);
    });
});
