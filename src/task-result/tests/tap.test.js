import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, fromResult, tap } from '../index.js';

describe("tap", () => {
    it("defers and repeats the source and effect", async () => {
        const link = Object.freeze({ health: 100 });
        const input = Result.ok(link);
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
        const task = tap(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        })(fromResult(input));

        assert.strictEqual(await task(), input);
        assert.strictEqual(calls, 1);
    });

    it("waits for the source before calling the effect", async () => {
        let finishSource;
        const source = new Promise(resolve => {
            finishSource = resolve;
        });
        let calls = 0;
        const input = Result.ok("Link");
        const task = tap(() => {
            calls += 1;
        })(() => source);
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

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
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves Err and skips the effect", async () => {
        const input = Object.freeze(Result.err(undefined));
        const task = tap(() => {
            assert.fail("effect should not run");
        })(fromResult(input));

        assert.strictEqual(await task(), input);
    });

    it("does not wait for a returned Promise", async () => {
        let finishEffect;
        const effect = new Promise(resolve => {
            finishEffect = resolve;
        });
        const input = Result.ok("Link");
        let settled = false;
        const task = tap(() => effect)(fromResult(input));
        const pending = task();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, true);
        assert.strictEqual(await pending, input);
        finishEffect("ignored");
    });
});
