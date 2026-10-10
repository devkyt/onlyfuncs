import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromTask } from '../index.js';

describe("fromTask", () => {
    it("defers and repeats the task, wrapping its resolved value", async () => {
        const link = { health: 100 };
        let calls = 0;

        const task = fromTask((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return Promise.resolve(link);
        });

        assert.strictEqual(calls, 0);

        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.ok(link));
        assert.strictEqual(first.value, link);
        assert.strictEqual(second.value, link);
        assert.strictEqual(calls, 2);
    });

    it("wraps falsy resolved values in Ok", async () => {
        assert.deepStrictEqual(await fromTask(() => Promise.resolve(0))(), Result.ok(0));
        assert.deepStrictEqual(await fromTask(() => Promise.resolve(false))(), Result.ok(false));
        assert.deepStrictEqual(await fromTask(() => Promise.resolve(undefined))(), Result.ok(undefined));
    });

    it("preserves rejection instead of converting it to Err", async () => {
        const error = { reason: "Missing hero" };

        const task = fromTask(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("treats a resolved Result as an ordinary successful payload", async () => {
        const payload = Result.err("No stamina");

        const result = await fromTask(() => Promise.resolve(payload))();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, payload);
    });
});
