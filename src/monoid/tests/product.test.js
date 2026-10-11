import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Semigroup from '../../semigroup/index.js';
import { product } from '../index.js';

describe("product", () => {
    it("multiplies two numbers", () => {
        assert.strictEqual(product.combine(6, -2), -12);
    });

    it("returns an identity for either side", () => {
        assert.strictEqual(product.empty(), 1);
        assert.strictEqual(product.combine(product.empty(), 6), 6);
        assert.strictEqual(product.combine(6, product.empty()), 6);
    });

    it("reuses the Semigroup combining function", () => {
        assert.strictEqual(product.combine, Semigroup.product.combine);
    });
});
