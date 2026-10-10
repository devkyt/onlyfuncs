import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, flatMap } from '../index.js';

describe("flatMap", () => {
    it("lazily runs the source, transform, and returned task in order", async () => {
        const link = { stamina: 50 };
        const calls = [];

        const chain = flatMap((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);
            calls.push("transform");

            return (...taskArgs) => {
                assert.deepStrictEqual(taskArgs, []);
                calls.push("next task");
                return Promise.resolve(args[0].stamina - 5);
            };
        });
        const task = chain((...args) => {
            assert.deepStrictEqual(args, []);
            calls.push("source");

            return Promise.resolve(link);
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), 45);
        assert.deepStrictEqual(calls, ["source", "transform", "next task"]);
        assert.strictEqual(await task(), 45);
        assert.deepStrictEqual(calls, [
            "source", "transform", "next task",
            "source", "transform", "next task",
        ]);
    });

    it("preserves falsy values and returned object references", async () => {
        const link = { health: 100 };

        assert.strictEqual(await flatMap(of)(of(undefined))(), undefined);
        assert.strictEqual(await flatMap(of)(of(false))(), false);
        assert.strictEqual(await flatMap(of)(of(0))(), 0);
        assert.strictEqual(await flatMap(() => of(link))(of("Link"))(), link);
    });

    it("preserves source rejection and skips the transform", async () => {
        const error = { reason: "Missing hero" };

        const task = flatMap(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns a transform throw into a rejection", async () => {
        const error = { reason: "No stamina" };

        const task = flatMap(() => {
            throw error;
        })(of("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves rejection from the returned task", async () => {
        const error = new Error("No stamina");

        const nextTask = () => Promise.reject(error);
        const task = flatMap(() => nextTask)(of("Link"));

        await assert.rejects(task(), actual => actual === error);
    });
});
