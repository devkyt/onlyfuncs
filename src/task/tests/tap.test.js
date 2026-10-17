import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import { tap } from '../index.js';

describe("tap", () => {
    it("defers and repeats the source and effect", async () => {
        const link = Object.freeze({ health: 100 });
        let sourceCalls = 0;
        let effectCalls = 0;
        const task = tap((...args) => {
            effectCalls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return "ignored";
        })((...args) => {
            sourceCalls += 1;

            assert.deepStrictEqual(args, []);

            return Promise.resolve(link);
        });

        assert.strictEqual(sourceCalls, 0);
        assert.strictEqual(effectCalls, 0);
        assert.strictEqual(await task(), link);
        assert.strictEqual(await task(), link);
        assert.strictEqual(sourceCalls, 2);
        assert.strictEqual(effectCalls, 2);
    });

    it("passes undefined to the effect", async () => {
        let calls = 0;
        const task = tap(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        })(() => Promise.resolve(undefined));

        assert.strictEqual(await task(), undefined);
        assert.strictEqual(calls, 1);
    });

    it("waits for the source before calling the effect", async () => {
        const { promise: source, resolve: finishSource } = Promise.withResolvers();
        let calls = 0;
        const input = "Link";
        const task = tap(() => {
            calls += 1;
        })(() => source);
        const pending = task();

        await setImmediate();

        assert.strictEqual(calls, 0);
        finishSource(input);

        assert.strictEqual(await pending, input);
        assert.strictEqual(calls, 1);
    });

    it("preserves source rejection and skips the effect", async () => {
        const error = { reason: "Missing hero" };
        const task = tap(() => {
            assert.fail("effect should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns an effect throw into a rejection", async () => {
        const error = { reason: "No stamina" };
        const task = tap(() => {
            throw error;
        })(() => Promise.resolve("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("does not wait for a returned Promise", async () => {
        const { promise: effect, resolve: finishEffect } = Promise.withResolvers();
        const input = "Link";
        let settled = false;
        const task = tap(() => effect)(() => Promise.resolve(input));
        const pending = task();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        await setImmediate();

        assert.strictEqual(settled, true);
        assert.strictEqual(await pending, input);
        finishEffect("ignored");
    });
});
