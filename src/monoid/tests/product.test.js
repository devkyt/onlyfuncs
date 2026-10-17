import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

    it("combines three values associatively", () => {
        const [first, second, third] = [3, -2, 4];
        const left = product.combine(product.combine(first, second), third);
        const right = product.combine(first, product.combine(second, third));

        assert.deepStrictEqual(left, right);
    });
});
