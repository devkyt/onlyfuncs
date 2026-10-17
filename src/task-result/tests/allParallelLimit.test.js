import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import * as Result from '../../result/index.js';
import { allParallelLimit, err, ok } from '../index.js';

describe("allParallelLimit", () => {
    it("rejects invalid concurrency before receiving tasks", () => {
        const invalid = [0, -1, 1.5, NaN, Infinity, "2", null, undefined, Number.MAX_SAFE_INTEGER + 1];

        for (const concurrency of invalid) {
            assert.throws(() => allParallelLimit(concurrency), RangeError);
        }
    });

    it("starts tasks lazily without arguments and refills available slots", async () => {
        const calls = [];
        const { promise: attack, resolve: finishAttack } = Promise.withResolvers();
        const { promise: heal, resolve: finishHeal } = Promise.withResolvers();
        const tasks = Object.freeze([
            (...args) => {
                calls.push(["Attack", ...args]);

                return attack;
            },
            (...args) => {
                calls.push(["Heal", ...args]);

                return heal;
            },
            (...args) => {
                calls.push(["CastSpell", ...args]);

                return Promise.resolve(Result.ok("CastSpell"));
            },
        ]);
        const task = allParallelLimit(2)(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, [["Attack"], ["Heal"]]);
        finishHeal(Result.ok("Heal"));

        await setImmediate();

        assert.deepStrictEqual(calls, [["Attack"], ["Heal"], ["CastSpell"]]);
        finishAttack(Result.ok("Attack"));

        assert.deepStrictEqual(await pending, Result.ok(["Attack", "Heal", "CastSpell"]));
    });

    it("continues after Err and preserves the first Err in input order", async () => {
        const firstError = Result.err(undefined);
        const { promise: first, resolve: finish } = Promise.withResolvers();
        let laterCalls = 0;
        const task = allParallelLimit(2)([
            () => first,
            err("Healing unavailable"),
            () => {
                laterCalls += 1;

                return Promise.resolve(Result.ok("CastSpell"));
            },
        ]);
        const pending = task();

        await setImmediate();

        assert.strictEqual(laterCalls, 1);
        finish(firstError);

        assert.strictEqual(await pending, firstError);
    });

    it("waits for each task with concurrency one and reruns with fresh output", async () => {
        const calls = [];
        const attack = Object.freeze({ damage: 100 });
        const { promise: source, resolve: finishAttack } = Promise.withResolvers();
        const task = allParallelLimit(1)([
            () => {
                calls.push("Attack");

                return source;
            },
            () => {
                calls.push("Heal");

                return Promise.resolve(Result.ok(undefined));
            },
        ]);
        const pending = task();

        await setImmediate();

        assert.deepStrictEqual(calls, ["Attack"]);
        finishAttack(Result.ok(attack));

        const first = await pending;
        const second = await task();

        assert.deepStrictEqual(first, Result.ok([attack, undefined]));
        assert.deepStrictEqual(second, first);
        assert.strictEqual(first.value[0], attack);
        assert.notStrictEqual(first.value, second.value);
        assert.deepStrictEqual(calls, ["Attack", "Heal", "Attack", "Heal"]);
    });

    it("accepts large concurrency and produces fresh empty arrays", async () => {
        const collect = allParallelLimit(Number.MAX_SAFE_INTEGER);
        const empty = collect([]);
        const first = await empty();
        const second = await empty();

        assert.deepStrictEqual(first, Result.ok([]));
        assert.deepStrictEqual(second, Result.ok([]));
        assert.notStrictEqual(first.value, second.value);
        assert.deepStrictEqual(await collect([ok("Attack")])(), Result.ok(["Attack"]));
    });

    it("stops queued tasks on rejection and handles later started rejections", async () => {
        const error = { reason: "Offline" };
        const { promise: later, reject: rejectLater } = Promise.withResolvers();
        let laterStarted = false;
        const task = allParallelLimit(2)([
            () => Promise.reject(error),
            () => {
                laterStarted = true;

                return later;
            },
            () => assert.fail("queued task should not start"),
        ]);

        await assert.rejects(task(), actual => actual === error);
        assert.strictEqual(laterStarted, true);
        rejectLater(undefined);

        await setImmediate();
    });

    it("propagates synchronous throws without starting later tasks", async () => {
        const task = allParallelLimit(2)([
            () => {
                throw undefined;
            },
            () => assert.fail("later task should not start"),
        ]);

        await assert.rejects(task(), actual => actual === undefined);
    });
});
