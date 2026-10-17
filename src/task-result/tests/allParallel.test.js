import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import * as Result from '../../result/index.js';
import { err, fromResult, ok, allParallel } from '../index.js';

describe("allParallel", () => {
    it("starts all tasks lazily and preserves input order", async () => {
        const { promise: attack, resolve: finishAttack } = Promise.withResolvers();
        const calls = [];
        const tasks = Object.freeze([
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Attack");

                return attack;
            },
            () => {
                calls.push("Heal");

                return Promise.resolve(Result.ok("Heal"));
            },
        ]);
        const task = allParallel(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
        finishAttack(Result.ok("Attack"));

        assert.deepStrictEqual(await pending, Result.ok(["Attack", "Heal"]));
    });

    it("waits for every fulfillment and returns the first Err in input order", async () => {
        const { promise: attack, resolve: finishAttack } = Promise.withResolvers();
        const firstError = Object.freeze(Result.err(undefined));
        const secondError = Result.err("Healing unavailable");
        let settled = false;
        let laterCalls = 0;
        const tasks = [
            () => attack,
            fromResult(secondError),
            () => {
                laterCalls += 1;

                return Promise.resolve(Result.ok(100));
            },
        ];
        const pending = allParallel(tasks)();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        await setImmediate();

        assert.strictEqual(settled, false);
        assert.strictEqual(laterCalls, 1);
        finishAttack(firstError);

        assert.strictEqual(await pending, firstError);
    });

    it("does not settle an early Err while a later task is pending", async () => {
        const { promise: heal, resolve: finishHeal } = Promise.withResolvers();
        const failure = Result.err("Attack unavailable");
        let settled = false;
        const tasks = [fromResult(failure), () => heal];
        const pending = allParallel(tasks)();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        await setImmediate();

        assert.strictEqual(settled, false);
        finishHeal(Result.ok("Heal"));

        assert.strictEqual(await pending, failure);
    });

    it("returns fresh empty success arrays", async () => {
        const task = allParallel([]);
        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.ok([]));
        assert.deepStrictEqual(second, Result.ok([]));
        assert.notStrictEqual(first.value, second.value);
    });

    it("preserves falsy payloads and references", async () => {
        const attack = Object.freeze({ damage: 100 });
        const tasks = [ok(0), ok(false), ok(null), ok(undefined), ok(attack)];
        const result = await allParallel(tasks)();

        assert.deepStrictEqual(result, Result.ok([0, false, null, undefined, attack]));
        assert.strictEqual(result.value[4], attack);
    });

    it("repeats tasks with independent outputs on every execution", async () => {
        let calls = 0;
        const source = () => {
            calls += 1;

            return Promise.resolve(Result.ok(calls));
        };
        const task = allParallel([source]);
        const [first, second] = await Promise.all([task(), task()]);

        assert.deepStrictEqual(first, Result.ok([1]));
        assert.deepStrictEqual(second, Result.ok([2]));
        assert.notStrictEqual(first.value, second.value);
        assert.strictEqual(calls, 2);
    });

    it("rejects before other tasks finish without cancelling started work", async () => {
        const error = { reason: "Action unavailable" };
        const { promise: heal, resolve: finishHeal } = Promise.withResolvers();
        const calls = [];
        const tasks = [
            () => Promise.reject(error),
            () => {
                calls.push("start Heal");

                return heal.then(value => {
                    calls.push("finish Heal");

                    return Result.ok(value);
                });
            },
        ];
        const pending = allParallel(tasks)();

        await assert.rejects(pending, actual => actual === error);
        assert.deepStrictEqual(calls, ["start Heal"]);
        finishHeal("Heal");
        await setImmediate();

        assert.deepStrictEqual(calls, ["start Heal", "finish Heal"]);
    });

    it("propagates rejection even if another task fulfills with Err", async () => {
        const error = { reason: "Connection lost" };
        const tasks = [
            err("No damage"),
            () => Promise.reject(error),
        ];
        const task = allParallel(tasks);

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a synchronous task throw and skips later tasks", async () => {
        const error = { reason: "Action unavailable" };
        const tasks = [
            () => {
                throw error;
            },
            () => {
                assert.fail("later task should not run");
            },
        ];
        const task = allParallel(tasks);

        await assert.rejects(task(), actual => actual === error);
    });
});
