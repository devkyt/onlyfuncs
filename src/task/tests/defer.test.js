import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

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
        const spell = { name: "Fireball", cost: 20 };
        const task = defer(() => spell);
        const pending = task();

        assert.ok(pending instanceof Promise);
        assert.strictEqual(await pending, spell);
        assert.strictEqual(await defer(() => 0)(), 0);
        assert.strictEqual(await defer(() => false)(), false);
        assert.strictEqual(await defer(() => null)(), null);
        assert.strictEqual(await defer(() => undefined)(), undefined);
    });

    it("waits for and adopts a returned Promise", async () => {
        const { promise: source, resolve: finish } = Promise.withResolvers();
        const task = defer(() => source);
        const pending = task();
        let settled = false;
        pending.then(() => {
            settled = true;
        });

        await setImmediate();

        assert.strictEqual(settled, false);
        finish("Fireball");

        assert.strictEqual(await pending, "Fireball");
    });

    it("turns synchronous throws into rejections", async () => {
        const error = { reason: "Not enough mana" };
        const task = defer(() => {
            throw error;
        });

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves Promise rejections and falsy thrown values", async () => {
        const error = { reason: "Spell unavailable" };
        const rejected = defer(() => Promise.reject(error));
        const thrown = defer(() => {
            throw undefined;
        });

        await assert.rejects(rejected(), actual => actual === error);
        await assert.rejects(thrown(), actual => actual === undefined);
    });

    it("adopts thenables but does not invoke returned functions", async () => {
        const thenable = { then: resolve => resolve("Fireball") };
        const callback = () => {
            assert.fail("returned function should not run");
        };

        assert.strictEqual(await defer(() => thenable)(), "Fireball");
        assert.strictEqual(await defer(() => callback)(), callback);
    });
});
