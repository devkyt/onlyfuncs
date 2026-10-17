import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, traverse } from '../index.js';

describe("traverse", () => {
    it("starts tasks together and keeps input order", async () => {
        const { promise: attackPromise, resolve: finishAttack } = Promise.withResolvers();
        const calls = [];

        const run = traverse(name => {
            calls.push(`transform ${name}`);

            return () => {
                calls.push(`start ${name}`);

                return name === "Attack" ? attackPromise : Promise.resolve(80);
            };
        });
        const task = run(Object.freeze(["Attack", "Heal"]));

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, [
            "transform Attack", "start Attack",
            "transform Heal", "start Heal",
        ]);

        // Heal's Promise is already fulfilled while Attack is still pending.
        finishAttack(100);

        assert.deepStrictEqual(await pending, [100, 80]);
    });

    it("passes only the original value and executes each task without arguments", async () => {
        const attack = { damage: 100 };
        let transforms = 0;
        let executions = 0;

        const task = traverse((...args) => {
            transforms += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], attack);

            return (...taskArgs) => {
                executions += 1;

                assert.deepStrictEqual(taskArgs, []);

                return Promise.resolve(args[0].damage);
            };
        })([attack]);

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
        const attack = { damage: 100 };
        const result = await traverse(of)([0, false, null, undefined, attack])();

        assert.deepStrictEqual(result, [0, false, null, undefined, attack]);
        assert.strictEqual(result[4], attack);
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
        })(["Attack"]);

        const [first, second] = await Promise.all([task(), task()]);

        assert.strictEqual(transforms, 2);
        assert.strictEqual(executions, 2);
        assert.deepStrictEqual(first, [1]);
        assert.deepStrictEqual(second, [2]);
        assert.notStrictEqual(first, second);
    });

    it("preserves a rejection while still starting later tasks", async () => {
        const error = { reason: "Action unavailable" };
        const calls = [];

        const task = traverse(value => () => {
            calls.push(value);

            return value === "Attack" ? Promise.reject(error) : Promise.resolve(value);
        })(["Attack", "Heal"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
    });

    it("rejects a transform throw and skips remaining inputs", async () => {
        const error = { reason: "Action unavailable" };
        const calls = [];

        const task = traverse(value => {
            calls.push(value);

            throw error;
        })(["Attack", "Heal"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Attack"]);
    });
});
