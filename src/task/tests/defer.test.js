import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defer } from '../index.js';

describe("defer", () => {
    it("defers the callback and calls it without arguments on every run", async () => {
        let calls = 0;
        const task = defer((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return calls;
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(await task(), 1);
        assert.strictEqual(await task(), 2);
        assert.strictEqual(calls, 2);
    });

    it("resolves plain values without changing their identity", async () => {
        const link = { health: 100 };
        const task = defer(() => link);
        const pending = task();

        assert.ok(pending instanceof Promise);
        assert.strictEqual(await pending, link);
        assert.strictEqual(await defer(() => 0)(), 0);
        assert.strictEqual(await defer(() => false)(), false);
        assert.strictEqual(await defer(() => null)(), null);
        assert.strictEqual(await defer(() => undefined)(), undefined);
    });

    it("waits for and adopts a returned Promise", async () => {
        let finish;
        const source = new Promise(resolve => {
            finish = resolve;
        });
        const task = defer(() => source);
        const pending = task();
        let settled = false;
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, false);
        finish("Link");

        assert.strictEqual(await pending, "Link");
    });

    it("turns synchronous throws into rejections", async () => {
        const error = { reason: "No stamina" };
        const task = defer(() => {
            throw error;
        });

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves Promise rejections and falsy thrown values", async () => {
        const error = { reason: "Missing hero" };
        const rejected = defer(() => Promise.reject(error));
        const thrown = defer(() => {
            throw undefined;
        });

        await assert.rejects(rejected(), actual => actual === error);
        await assert.rejects(thrown(), actual => actual === undefined);
    });

    it("adopts thenables but does not invoke returned functions", async () => {
        const thenable = { then: resolve => resolve("Link") };
        const callback = () => {
            assert.fail("returned function should not run");
        };

        assert.strictEqual(await defer(() => thenable)(), "Link");
        assert.strictEqual(await defer(() => callback)(), callback);
    });
});
