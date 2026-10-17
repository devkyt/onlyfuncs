import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok } from '../index.js';

describe("ok", () => {
    it("returns a task resolving to Ok with the original payload", async () => {
        const spell = { name: "Blizzard", cost: 12 };

        const task = ok(spell);

        assert.strictEqual(typeof task, "function");

        const result = await task();

        assert.deepStrictEqual(result, Result.ok(spell));
        assert.strictEqual(result.value, spell);
        assert.strictEqual(await task(), result);
    });

    it("keeps falsy payloads", async () => {
        assert.deepStrictEqual(await ok(0)(), Result.ok(0));
        assert.deepStrictEqual(await ok(false)(), Result.ok(false));
        assert.deepStrictEqual(await ok(null)(), Result.ok(null));
        assert.deepStrictEqual(await ok(undefined)(), Result.ok(undefined));
    });

    it("stores a function without running it", async () => {
        const value = () => {
            assert.fail("payload should not run");
        };

        const result = await ok(value)();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, value);
    });

    it("keeps a Promise inside Ok without unwrapping it", async () => {
        const promise = Promise.resolve("Blizzard");

        const result = await ok(promise)();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, promise);
    });
});
