import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, traverse } from '../index.js';

describe("traverse", () => {
    it("waits before transforming the next value", async () => {
        let finishLink;
        const linkPromise = new Promise(resolve => {
            finishLink = resolve;
        });
        const calls = [];

        const run = traverse(name => {
            calls.push(`transform ${name}`);

            return () => {
                calls.push(`start ${name}`);

                return name === "Link" ? linkPromise : Promise.resolve(Result.ok(80));
            };
        });
        const task = run(Object.freeze(["Link", "Zelda"]));

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["transform Link", "start Link"]);

        finishLink(Result.ok(100));

        assert.deepStrictEqual(await pending, Result.ok([100, 80]));
        assert.deepStrictEqual(calls, [
            "transform Link", "start Link",
            "transform Zelda", "start Zelda",
        ]);
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

                return Promise.resolve(Result.ok(args[0].health));
            };
        })([link]);

        assert.deepStrictEqual(await task(), Result.ok([100]));
        assert.strictEqual(transforms, 1);
        assert.strictEqual(executions, 1);
    });

    it("returns the first Err unchanged and skips later transforms", async () => {
        const failure = Result.err(undefined);
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            return () => Promise.resolve(value === "Zelda" ? failure : Result.ok(value));
        })(["Link", "Zelda", "Tingle"]);

        assert.strictEqual(await task(), failure);
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("handles empty input without calling the transform", async () => {
        const task = traverse(() => {
            assert.fail("transform should not run");
        })([]);

        assert.deepStrictEqual(await task(), Result.ok([]));
    });

    it("preserves falsy values and object references", async () => {
        const link = { health: 100 };
        const result = await traverse(ok)([0, false, null, undefined, link])();

        assert.deepStrictEqual(result, Result.ok([0, false, null, undefined, link]));
        assert.strictEqual(result.value[4], link);
    });

    it("repeats transforms and tasks with separate outputs on each run", async () => {
        let transforms = 0;
        let executions = 0;

        const task = traverse(() => {
            transforms += 1;

            return () => {
                executions += 1;

                return Promise.resolve(Result.ok(executions));
            };
        })(["Link"]);

        const [first, second] = await Promise.all([task(), task()]);

        assert.strictEqual(transforms, 2);
        assert.strictEqual(executions, 2);
        assert.deepStrictEqual(first, Result.ok([1]));
        assert.deepStrictEqual(second, Result.ok([2]));
        assert.notStrictEqual(first.value, second.value);
    });

    it("preserves rejection and skips later transforms", async () => {
        const error = { reason: "Missing hero" };
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            return () => Promise.reject(error);
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });

    it("rejects a transform throw and skips later inputs", async () => {
        const error = { reason: "No stamina" };
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            throw error;
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });

    it("rejects a synchronous task throw and skips later transforms", async () => {
        const error = { reason: "No stamina" };
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            return () => {
                throw error;
            };
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
