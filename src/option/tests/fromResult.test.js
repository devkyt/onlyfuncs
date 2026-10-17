import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { some, none, fromResult } from '../index.js';

describe("fromResult", () => {
    it("converts Ok and preserves its payload reference", () => {
        const loot = Object.freeze({ coins: 100 });
        const input = Object.freeze(Result.ok(loot));
        const result = fromResult(input);

        assert.deepStrictEqual(result, some(loot));
        assert.strictEqual(result.value, loot);
        assert.deepStrictEqual(input, Result.ok(loot));
    });

    it("preserves present null and undefined", () => {
        assert.deepStrictEqual(fromResult(Result.ok(null)), some(null));
        assert.deepStrictEqual(fromResult(Result.ok(undefined)), some(undefined));
    });

    it("discards Err payloads and returns shared none", () => {
        assert.strictEqual(fromResult(Result.err("Chest is locked")), none);
        assert.strictEqual(fromResult(Result.err(undefined)), none);
    });
});
