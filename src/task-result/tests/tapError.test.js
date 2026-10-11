import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, fromResult, tapError } from '../index.js';

describe("tapError", () => {
    it("defers and repeats the source and effect", async () => {
        const link = Object.freeze({ health: 100 });
        const input = Result.err(link);
        let sourceCalls = 0;
        let effectCalls = 0;
        const task = tapError((...args) => {
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
        const input = Result.err(undefined);
        const task = tapError(value => {
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
        const input = Result.err("Link");
        const task = tapError(() => {
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
        const task = tapError(() => {
            assert.fail("effect should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns an effect throw into a rejection", async () => {
        const error = { reason: "No stamina" };
        const task = tapError(() => {
            throw error;
        })(err("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves Ok and skips the effect", async () => {
        const input = Object.freeze(Result.ok(undefined));
        const task = tapError(() => {
            assert.fail("effect should not run");
        })(fromResult(input));

        assert.strictEqual(await task(), input);
    });

    it("does not wait for a returned Promise", async () => {
        let finishEffect;
        const effect = new Promise(resolve => {
            finishEffect = resolve;
        });
        const input = Result.err("Link");
        let settled = false;
        const task = tapError(() => effect)(fromResult(input));
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
