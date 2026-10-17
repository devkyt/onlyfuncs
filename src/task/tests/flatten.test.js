import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import { of, flatten } from '../index.js';

describe("flatten", () => {
    it("defers both tasks and executes each without arguments on every run", async () => {
        const calls = [];
        const link = { health: 100 };
        const inner = (...args) => {
            assert.deepStrictEqual(args, []);
            calls.push("inner");

            return Promise.resolve(link);
        };
        const task = flatten((...args) => {
            assert.deepStrictEqual(args, []);
            calls.push("outer");

            return Promise.resolve(inner);
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), link);
        assert.strictEqual(await task(), link);
        assert.deepStrictEqual(calls, ["outer", "inner", "outer", "inner"]);
    });

    it("waits for the outer task before starting the inner task", async () => {
        const { promise: outer, resolve: finish } = Promise.withResolvers();
        let calls = 0;
        const inner = () => {
            calls += 1;

            return Promise.resolve(undefined);
        };
        const pending = flatten(() => outer)();

        await setImmediate();

        assert.strictEqual(calls, 0);
        finish(inner);

        assert.strictEqual(await pending, undefined);
        assert.strictEqual(calls, 1);
    });

    it("removes only one task layer", async () => {
        const inner = of("Link");
        const outer = of(of(inner));
        const task = flatten(outer);

        assert.strictEqual(await task(), inner);
    });

    it("preserves outer and inner rejections", async () => {
        const error = { reason: "Missing hero" };
        const outer = flatten(() => Promise.reject(error));
        const inner = flatten(of(() => Promise.reject(error)));

        await assert.rejects(outer(), actual => actual === error);
        await assert.rejects(inner(), actual => actual === error);
    });

    it("turns an inner task throw into a rejection", async () => {
        const error = { reason: "No stamina" };
        const task = flatten(of(() => {
            throw error;
        }));

        await assert.rejects(task(), actual => actual === error);
    });
});
