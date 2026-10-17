import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromNullable } from '../index.js';

describe("fromNullable", () => {
    it("preserves present values and skips the fallback", async () => {
        const item = Object.freeze({ kind: "potion", charges: 3 });
        const run = fromNullable(() => {
            assert.fail("fallback should not run");
        });
        const result = await run(item)();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, item);
        assert.deepStrictEqual(await run(0)(), Result.ok(0));
        assert.deepStrictEqual(await run(false)(), Result.ok(false));
        assert.deepStrictEqual(await run("")(), Result.ok(""));
        assert.deepStrictEqual(await run(NaN)(), Result.ok(NaN));
    });

    it("passes null and undefined to the fallback once each", async () => {
        const error = { reason: "Item unavailable" };
        const calls = [];
        const run = fromNullable((...args) => {
            calls.push(args);

            return error;
        });
        const first = await run(null)();
        const second = await run(undefined)();

        assert.strictEqual(first.type, "err");
        assert.strictEqual(first.error, error);
        assert.strictEqual(second.type, "err");
        assert.strictEqual(second.error, error);
        assert.deepStrictEqual(calls, [[null], [undefined]]);
    });

    it("keeps a falsy fallback result", async () => {
        const run = fromNullable(() => undefined);

        assert.deepStrictEqual(await run(null)(), Result.err(undefined));
    });

    it("propagates fallback throws", async () => {
        const error = { reason: "Item unavailable" };
        const run = fromNullable(() => {
            throw error;
        });

        await assert.rejects(run(null)(), actual => actual === error);
    });

    it("defers the fallback and repeats it on every execution", async () => {
        let calls = 0;
        const task = fromNullable(() => {
            calls += 1;

            return calls;
        })(null);

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(await task(), Result.err(1));
        assert.deepStrictEqual(await task(), Result.err(2));
        assert.strictEqual(calls, 2);
    });
});
