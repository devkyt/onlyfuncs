import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { identity } from '../index.js';

describe("identity", () => {
    it("returns the same value for simple inputs", () => {
        assert.strictEqual(identity(1), 1);
        assert.strictEqual(identity("link"), "link");
        assert.strictEqual(identity(true), true);
    })

    it("returns the same value for complex inputs", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(identity(ob), ob);
        assert.strictEqual(identity(arr), arr);
    })

    it("return the same value for falsy inputs", () => {
        assert.strictEqual(identity(0), 0);
        assert.strictEqual(identity(""), "");
        assert.strictEqual(identity(false), false);
        assert.strictEqual(identity(null), null);
        assert.strictEqual(identity(undefined), undefined);
        assert.strictEqual(identity(), undefined);
    })
})
