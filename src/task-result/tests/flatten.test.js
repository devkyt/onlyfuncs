import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import * as Result from '../../result/index.js';
import { fromResult, ok, flatten } from '../index.js';

describe("flatten", () => {
    it("defers and repeats both tasks without nesting their Result", async () => {
        const result = Object.freeze(Result.ok({ health: 100 }));
        const calls = [];
        const inner = (...args) => {
            assert.deepStrictEqual(args, []);
            calls.push("inner");

            return Promise.resolve(result);
        };
        const task = flatten((...args) => {
            assert.deepStrictEqual(args, []);
            calls.push("outer");

            return Promise.resolve(Result.ok(inner));
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), result);
        assert.strictEqual(await task(), result);
        assert.deepStrictEqual(calls, ["outer", "inner", "outer", "inner"]);
    });

    it("preserves an outer Err without running its payload", async () => {
        const failure = Object.freeze(Result.err(() => {
            assert.fail("error payload should not run");
        }));
        const task = flatten(fromResult(failure));

        assert.strictEqual(await task(), failure);
    });

    it("preserves an inner Err and successful undefined", async () => {
        const failure = Result.err(undefined);
        const failing = flatten(ok(fromResult(failure)));
        const successful = flatten(ok(ok(undefined)));

        assert.strictEqual(await failing(), failure);
        assert.deepStrictEqual(await successful(), Result.ok(undefined));
    });

    it("preserves outer and inner rejections", async () => {
        const error = { reason: "Missing hero" };
        const outer = flatten(() => Promise.reject(error));
        const inner = flatten(ok(() => Promise.reject(error)));

        await assert.rejects(outer(), actual => actual === error);
        await assert.rejects(inner(), actual => actual === error);
    });

    it("turns an inner task throw into a rejection", async () => {
        const error = { reason: "No stamina" };
        const task = flatten(ok(() => {
            throw error;
        }));

        await assert.rejects(task(), actual => actual === error);
    });

    it("waits for the outer task and adopts the inner task's Promise", async () => {
        const { promise: outer, resolve: finishOuter } = Promise.withResolvers();
        const { promise: inner, resolve: finishInner } = Promise.withResolvers();
        let innerCalls = 0;
        let settled = false;
        const pending = flatten(() => outer)();
        pending.then(() => {
            settled = true;
        });

        await setImmediate();

        assert.strictEqual(innerCalls, 0);
        finishOuter(Result.ok(() => {
            innerCalls += 1;

            return inner;
        }));
        await setImmediate();

        assert.strictEqual(innerCalls, 1);
        assert.strictEqual(settled, false);

        const result = Result.ok("Link");
        finishInner(result);

        assert.strictEqual(await pending, result);
    });

    it("removes only one task layer", async () => {
        const inner = ok("Link");
        const outer = ok(ok(inner));
        const task = flatten(outer);
        const result = await task();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, inner);
    });
});
