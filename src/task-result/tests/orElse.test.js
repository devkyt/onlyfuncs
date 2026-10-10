import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, orElse } from '../index.js';

describe("orElse", () => {
    it("lazily runs the fallback task and repeats recovery on each run", async () => {
        const error = { stamina: 0 };
        const recovered = Result.ok("Zelda");
        const calls = [];

        const task = orElse((...args) => {
            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], error);
            calls.push("fallback");

            return (...taskArgs) => {
                assert.deepStrictEqual(taskArgs, []);
                calls.push("recovery task");

                return Promise.resolve(recovered);
            };
        })(() => {
            calls.push("source");

            return Promise.resolve(Result.err(error));
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), recovered);
        assert.deepStrictEqual(calls, ["source", "fallback", "recovery task"]);
        assert.strictEqual(await task(), recovered);
        assert.deepStrictEqual(calls, [
            "source", "fallback", "recovery task",
            "source", "fallback", "recovery task",
        ]);
    });

    it("preserves Ok identity and skips the fallback", async () => {
        const input = Result.ok(undefined);

        const task = orElse(() => {
            assert.fail("fallback should not run");
        })(() => Promise.resolve(input));

        assert.strictEqual(await task(), input);
    });

    it("passes an undefined error and allows recovery to return Err", async () => {
        const replacement = Result.err("Missing hero");

        const task = orElse(value => {
            assert.strictEqual(value, undefined);

            return () => Promise.resolve(replacement);
        })(err(undefined));

        assert.strictEqual(await task(), replacement);
    });

    it("does not recover Promise rejections", async () => {
        const error = { reason: "Missing hero" };

        const task = orElse(() => {
            assert.fail("fallback should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a fallback throw", async () => {
        const error = { reason: "No stamina" };

        const task = orElse(() => {
            throw error;
        })(err("Missing hero"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves rejection from the recovery task", async () => {
        const error = new Error("No stamina");

        const recoveryTask = () => Promise.reject(error);
        const task = orElse(() => recoveryTask)(err("Missing hero"));

        await assert.rejects(task(), actual => actual === error);
    });
});
