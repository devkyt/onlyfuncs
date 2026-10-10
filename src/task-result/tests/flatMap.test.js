import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, flatMap } from '../index.js';

describe("flatMap", () => {
    it("lazily runs the source, transform, and returned task in order", async () => {
        const link = { stamina: 50 };
        const output = Result.ok(45);
        const calls = [];

        const task = flatMap((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);
            calls.push("transform");

            return (...taskArgs) => {
                assert.deepStrictEqual(taskArgs, []);
                calls.push("next task");

                return Promise.resolve(output);
            };
        })(() => {
            calls.push("source");

            return Promise.resolve(Result.ok(link));
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), output);
        assert.deepStrictEqual(calls, ["source", "transform", "next task"]);
        assert.strictEqual(await task(), output);
        assert.deepStrictEqual(calls, [
            "source", "transform", "next task",
            "source", "transform", "next task",
        ]);
    });

    it("preserves Err identity and skips the transform", async () => {
        const failure = Result.err(undefined);

        const task = flatMap(() => {
            assert.fail("transform should not run");
        })(() => Promise.resolve(failure));

        assert.strictEqual(await task(), failure);
    });

    it("returns an Err from the next task without nesting", async () => {
        const failure = Result.err("No stamina");

        const nextTask = () => Promise.resolve(failure);
        const task = flatMap(() => nextTask)(ok("Link"));

        assert.strictEqual(await task(), failure);
    });

    it("passes undefined successful values to the transform", async () => {
        const task = flatMap(value => {
            assert.strictEqual(value, undefined);

            return ok(false);
        })(ok(undefined));

        assert.deepStrictEqual(await task(), Result.ok(false));
    });

    it("preserves source rejection and skips the transform", async () => {
        const error = { reason: "Missing hero" };

        const task = flatMap(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a transform throw", async () => {
        const error = { reason: "No stamina" };

        const task = flatMap(() => {
            throw error;
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves rejection from the next task", async () => {
        const error = new Error("No stamina");

        const nextTask = () => Promise.reject(error);
        const task = flatMap(() => nextTask)(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });
});
