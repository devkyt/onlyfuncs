import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, isNone } from '../index.js';

describe("isNone", () => {
    it("returns true for none", () => {
        assert.strictEqual(isNone(none), true);
    });

    it("returns false for a present value", () => {
        assert.strictEqual(isNone(some("Link")), false);
    });

    it("does not treat falsy Some payloads as absence", () => {
        assert.strictEqual(isNone(some(0)), false);
        assert.strictEqual(isNone(some(false)), false);
        assert.strictEqual(isNone(some("")), false);
        assert.strictEqual(isNone(some(null)), false);
        assert.strictEqual(isNone(some(undefined)), false);
        assert.strictEqual(isNone(some(NaN)), false);
    });
});
