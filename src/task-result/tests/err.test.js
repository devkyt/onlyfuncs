import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err } from '../index.js';

describe("err", () => {
    it("fulfills with Err and preserves its identity on repeat execution", async () => {
        const error = { reason: "Spell unavailable" };

        const task = err(error);

        assert.strictEqual(typeof task, "function");

        const result = await task();

        assert.deepStrictEqual(result, Result.err(error));
        assert.strictEqual(result.error, error);
        assert.strictEqual(await task(), result);
    });

    it("keeps falsy errors", async () => {
        assert.deepStrictEqual(await err(0)(), Result.err(0));
        assert.deepStrictEqual(await err(false)(), Result.err(false));
        assert.deepStrictEqual(await err(null)(), Result.err(null));
        assert.deepStrictEqual(await err(undefined)(), Result.err(undefined));
    });

    it("stores a function without running it", async () => {
        const error = () => {
            assert.fail("error payload should not run");
        };

        const result = await err(error)();

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("keeps an Error as a fulfilled Err instead of rejecting", async () => {
        const error = new Error("Not enough mana");

        const result = await err(error)();

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });
});
