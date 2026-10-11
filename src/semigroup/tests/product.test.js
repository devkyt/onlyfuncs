import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { product } from '../index.js';

describe("product", () => {
    it("multiplies two numbers", () => {
        assert.strictEqual(product.combine(6, -2), -12);
    });

    it("handles zero and fractional values", () => {
        assert.strictEqual(product.combine(10, 0), 0);
        assert.strictEqual(product.combine(0.5, 8), 4);
    });
});
