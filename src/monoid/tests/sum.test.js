import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

    it("combines three values associatively", () => {
        const [first, second, third] = [7, -3, 2];
        const left = sum.combine(sum.combine(first, second), third);
        const right = sum.combine(first, sum.combine(second, third));

        assert.deepStrictEqual(left, right);
    });
});
