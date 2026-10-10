import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, traverse } from '../index.js';

describe("traverse", () => {
    it("starts tasks together and keeps input order", async () => {
        let finishLink;
        const linkPromise = new Promise(resolve => {
            finishLink = resolve;
        });
        const calls = [];

        const run = traverse(name => {
            calls.push(`transform ${name}`);

            return () => {
                calls.push(`start ${name}`);

                return name === "Link" ? linkPromise : Promise.resolve(80);
            };
        });
        const task = run(Object.freeze(["Link", "Zelda"]));

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, [
            "transform Link", "start Link",
            "transform Zelda", "start Zelda",
        ]);

        // Zelda's Promise is already fulfilled while Link is still pending.
        finishLink(100);

        assert.deepStrictEqual(await pending, [100, 80]);
    });

    it("passes only the original value and executes each task without arguments", async () => {
        const link = { health: 100 };
        let transforms = 0;
        let executions = 0;

        const task = traverse((...args) => {
            transforms += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return (...taskArgs) => {
                executions += 1;

                assert.deepStrictEqual(taskArgs, []);

                return Promise.resolve(args[0].health);
            };
        })([link]);

        assert.deepStrictEqual(await task(), [100]);
        assert.strictEqual(transforms, 1);
        assert.strictEqual(executions, 1);
    });

    it("handles empty input without calling the transform", async () => {
        const task = traverse(() => {
            assert.fail("transform should not run");
        })([]);

        assert.deepStrictEqual(await task(), []);
    });

    it("preserves falsy values and object references", async () => {
        const link = { health: 100 };
        const result = await traverse(of)([0, false, null, undefined, link])();

        assert.deepStrictEqual(result, [0, false, null, undefined, link]);
        assert.strictEqual(result[4], link);
    });

    it("repeats transforms and tasks with separate outputs on each run", async () => {
        let transforms = 0;
        let executions = 0;

        const task = traverse(() => {
            transforms += 1;

            return () => {
                executions += 1;

                return Promise.resolve(executions);
            };
        })(["Link"]);

        const [first, second] = await Promise.all([task(), task()]);

        assert.strictEqual(transforms, 2);
        assert.strictEqual(executions, 2);
        assert.deepStrictEqual(first, [1]);
        assert.deepStrictEqual(second, [2]);
        assert.notStrictEqual(first, second);
    });

    it("preserves a rejection while still starting later tasks", async () => {
        const error = { reason: "Missing hero" };
        const calls = [];

        const task = traverse(value => () => {
            calls.push(value);

            return value === "Link" ? Promise.reject(error) : Promise.resolve(value);
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("rejects a transform throw and skips remaining inputs", async () => {
        const error = { reason: "Missing hero" };
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            throw error;
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
