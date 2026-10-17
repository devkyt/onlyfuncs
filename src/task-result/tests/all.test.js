import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, all } from '../index.js';

describe("all", () => {
    it("starts lazily and waits for each task before starting the next", async () => {
        const { promise: attackPromise, resolve: finishAttack } = Promise.withResolvers();
        const calls = [];
        const tasks = Object.freeze([
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Attack");

                return attackPromise;
            },
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Heal");

                return Promise.resolve(Result.ok("Heal"));
            },
        ]);
        const task = all(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["Attack"]);
        finishAttack(Result.ok("Attack"));

        assert.deepStrictEqual(await pending, Result.ok(["Attack", "Heal"]));
        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
    });

    it("returns the first Err unchanged and skips later tasks", async () => {
        const failure = Result.err(undefined);
        let calls = 0;

        const task = all([
            ok("Attack"),
            () => {
                calls += 1;

                return Promise.resolve(failure);
            },
            () => {
                assert.fail("later task should not run");
            },
        ]);

        assert.strictEqual(await task(), failure);
        assert.strictEqual(calls, 1);
    });

    it("resolves empty input to Ok of an empty array", async () => {
        assert.deepStrictEqual(await all([])(), Result.ok([]));
    });

    it("preserves falsy values and object references", async () => {
        const attack = { damage: 100 };
        const result = await all([ok(0), ok(false), ok(null), ok(undefined), ok(attack)])();

        assert.deepStrictEqual(result, Result.ok([0, false, null, undefined, attack]));
        assert.strictEqual(result.value[4], attack);
    });

    it("reruns tasks with separate outputs for overlapping executions", async () => {
        let calls = 0;

        const source = () => {
            calls += 1;

            return Promise.resolve(Result.ok(calls));
        };
        const task = all([source, ok("Heal")]);

        const [first, second] = await Promise.all([task(), task()]);

        assert.strictEqual(calls, 2);
        assert.deepStrictEqual(first, Result.ok([1, "Heal"]));
        assert.deepStrictEqual(second, Result.ok([2, "Heal"]));
        assert.notStrictEqual(first.value, second.value);
    });

    it("preserves rejection and skips later tasks", async () => {
        const error = { reason: "Action unavailable" };

        const task = all([
            ok("Attack"),
            () => Promise.reject(error),
            () => {
                assert.fail("later task should not run");
            },
        ]);

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a synchronous task throw and skips later tasks", async () => {
        const error = { reason: "Action interrupted" };

        const task = all([
            () => {
                throw error;
            },
            () => {
                assert.fail("later task should not run");
            },
        ]);

        await assert.rejects(task(), actual => actual === error);
    });
});
