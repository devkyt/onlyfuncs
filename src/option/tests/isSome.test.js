import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, isSome } from '../index.js';

describe("isSome", () => {
    it("returns true for a present value", () => {
        assert.strictEqual(isSome(some("Link")), true);
    });

    it("returns false for none", () => {
        assert.strictEqual(isSome(none), false);
    });

    it("recognizes Some regardless of its payload's truthiness", () => {
        assert.strictEqual(isSome(some(0)), true);
        assert.strictEqual(isSome(some(false)), true);
        assert.strictEqual(isSome(some("")), true);
        assert.strictEqual(isSome(some(null)), true);
        assert.strictEqual(isSome(some(undefined)), true);
        assert.strictEqual(isSome(some(NaN)), true);
    });
});
