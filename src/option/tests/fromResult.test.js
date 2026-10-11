import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { some, none, fromResult } from '../index.js';

describe("fromResult", () => {
    it("converts Ok and preserves its payload reference", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(Result.ok(link));
        const result = fromResult(input);

        assert.deepStrictEqual(result, some(link));
        assert.strictEqual(result.value, link);
        assert.deepStrictEqual(input, Result.ok(link));
    });

    it("preserves present null and undefined", () => {
        assert.deepStrictEqual(fromResult(Result.ok(null)), some(null));
        assert.deepStrictEqual(fromResult(Result.ok(undefined)), some(undefined));
    });

    it("discards Err payloads and returns shared none", () => {
        assert.strictEqual(fromResult(Result.err("No health")), none);
        assert.strictEqual(fromResult(Result.err(undefined)), none);
    });
});
