import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import * as Result from '../../result/index.js';
import { ok, fromResult, tapAsync } from '../index.js';

describe("tapAsync", () => {
    it("defers and repeats the source and effect", async () => {
        const link = Object.freeze({ health: 100 });
        const input = Result.ok(link);
        let sourceCalls = 0;
        let effectCalls = 0;
        const task = tapAsync((...args) => {
            effectCalls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return "ignored";
        })((...args) => {
            sourceCalls += 1;

            assert.deepStrictEqual(args, []);

            return Promise.resolve(input);
        });

        assert.strictEqual(sourceCalls, 0);
        assert.strictEqual(effectCalls, 0);
        assert.strictEqual(await task(), input);
        assert.strictEqual(await task(), input);
        assert.strictEqual(sourceCalls, 2);
        assert.strictEqual(effectCalls, 2);
    });

    it("passes undefined to the effect", async () => {
        let calls = 0;
        const input = Result.ok(undefined);
        const task = tapAsync(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        })(fromResult(input));

        assert.strictEqual(await task(), input);
        assert.strictEqual(calls, 1);
    });

    it("waits for the source before calling the effect", async () => {
        const { promise: source, resolve: finishSource } = Promise.withResolvers();
        let calls = 0;
        const input = Result.ok("Link");
        const task = tapAsync(() => {
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
        const task = tapAsync(() => {
            assert.fail("effect should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns an effect throw into a rejection", async () => {
        const error = { reason: "No stamina" };
        const task = tapAsync(() => {
            throw error;
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves Err and skips the effect", async () => {
        const input = Object.freeze(Result.err(undefined));
        const task = tapAsync(() => {
            assert.fail("effect should not run");
        })(fromResult(input));

        assert.strictEqual(await task(), input);
    });

    it("waits for the effect and ignores its fulfilled output", async () => {
        const { promise: effect, resolve: finishEffect } = Promise.withResolvers();
        const input = Result.ok(Object.freeze({ health: 100 }));
        let effectCalls = 0;
        let settled = false;
        const task = tapAsync(() => {
            effectCalls += 1;

            return effect;
        })(fromResult(input));
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

        assert.strictEqual(effectCalls, 1);
        assert.strictEqual(settled, false);
        finishEffect("ignored");

        assert.strictEqual(await pending, input);
    });

    it("preserves effect rejection instead of returning the source", async () => {
        const error = { reason: "Cannot save hero" };
        const task = tapAsync(() => Promise.reject(error))(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves a rejected undefined", async () => {
        const task = tapAsync(() => Promise.reject(undefined))(ok("Link"));

        await assert.rejects(task(), actual => actual === undefined);
    });

    it("turns a synchronous source throw into a rejection", async () => {
        const error = { reason: "Missing hero" };
        const task = tapAsync(() => {
            assert.fail("effect should not run");
        })(() => {
            throw error;
        });

        await assert.rejects(task(), actual => actual === error);
    });
});
