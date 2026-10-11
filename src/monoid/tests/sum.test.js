import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Semigroup from '../../semigroup/index.js';
import { sum } from '../index.js';

describe("sum", () => {
    it("adds two numbers", () => {
        assert.strictEqual(sum.combine(10, -3), 7);
    });

    it("returns an identity for either side", () => {
        assert.strictEqual(sum.empty(), 0);
        assert.strictEqual(sum.combine(sum.empty(), 10), 10);
        assert.strictEqual(sum.combine(10, sum.empty()), 10);
    });

    it("reuses the Semigroup combining function", () => {
        assert.strictEqual(sum.combine, Semigroup.sum.combine);
    });
});
