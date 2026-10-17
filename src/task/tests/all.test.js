import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, all } from '../index.js';

describe("all", () => {
    it("starts tasks together and keeps input order", async () => {
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

                return Promise.resolve("Heal");
            },
        ]);
        const task = all(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["Attack", "Heal"]);

        // Heal's Promise is already fulfilled while Attack is still pending.
        finishAttack("Attack");

        assert.deepStrictEqual(await pending, ["Attack", "Heal"]);
    });

    it("resolves empty input to an empty array", async () => {
        assert.deepStrictEqual(await all([])(), []);
    });

    it("preserves falsy values and object references", async () => {
        const attack = { damage: 100 };

        const task = all([of(0), of(false), of(null), of(undefined), of(attack)]);

        const result = await task();

        assert.deepStrictEqual(result, [0, false, null, undefined, attack]);
        assert.strictEqual(result[4], attack);
    });

    it("reruns tasks with separate outputs for overlapping executions", async () => {
        let calls = 0;

        const source = () => {
            calls += 1;

            return Promise.resolve(calls);
        };
        const task = all([source]);

        const [first, second] = await Promise.all([task(), task()]);

        assert.strictEqual(calls, 2);
        assert.deepStrictEqual(first, [1]);
        assert.deepStrictEqual(second, [2]);
        assert.notStrictEqual(first, second);
    });

    it("rejects without cancelling other started work", async () => {
        const error = { reason: "Action unavailable" };
        const { promise: healPromise, resolve: finishHeal } = Promise.withResolvers();
        const calls = [];
        let healWork;

        const task = all([
            () => Promise.reject(error),
            () => {
                calls.push("started");
                healWork = healPromise.then(value => {
                    calls.push("finished");

                    return value;
                });

                return healWork;
            },
        ]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["started"]);

        finishHeal("Heal");

        assert.strictEqual(await healWork, "Heal");
        assert.deepStrictEqual(calls, ["started", "finished"]);
    });
});
