import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromResult } from '../index.js';

describe("fromResult", () => {
    it("lifts Ok without nesting it and preserves identity on every run", async () => {
        const input = Result.ok({ kind: "sword", damage: 12 });

        const task = fromResult(input);

        assert.strictEqual(typeof task, "function");
        assert.strictEqual(await task(), input);
        assert.strictEqual(await task(), input);
    });

    it("lifts Err without rejecting and preserves identity", async () => {
        const input = Result.err({ action: "attack", weapon: null });

        const task = fromResult(input);

        assert.strictEqual(await task(), input);
        assert.strictEqual(await task(), input);
    });

    it("preserves undefined success and error payloads", async () => {
        assert.deepStrictEqual(await fromResult(Result.ok(undefined))(), Result.ok(undefined));
        assert.deepStrictEqual(await fromResult(Result.err(undefined))(), Result.err(undefined));
    });
});
