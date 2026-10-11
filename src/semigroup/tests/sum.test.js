import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sum } from '../index.js';

describe("sum", () => {
    it("adds two numbers", () => {
        assert.strictEqual(sum.combine(10, -3), 7);
    });

    it("handles zero and ordinary decimal arithmetic", () => {
        assert.strictEqual(sum.combine(0, 10), 10);
        assert.strictEqual(sum.combine(0.5, 0.25), 0.75);
    });
});
