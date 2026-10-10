import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, all } from '../index.js';

describe("all", () => {
    it("starts tasks together and keeps input order", async () => {
        let finishLink;
        const linkPromise = new Promise(resolve => {
            finishLink = resolve;
        });
        const calls = [];
        const tasks = Object.freeze([
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Link");

                return linkPromise;
            },
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Zelda");

                return Promise.resolve("Zelda");
            },
        ]);
        const task = all(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["Link", "Zelda"]);

        // Zelda's Promise is already fulfilled while Link is still pending.
        finishLink("Link");

        assert.deepStrictEqual(await pending, ["Link", "Zelda"]);
    });

    it("resolves empty input to an empty array", async () => {
        assert.deepStrictEqual(await all([])(), []);
    });

    it("preserves falsy values and object references", async () => {
        const link = { health: 100 };

        const task = all([of(0), of(false), of(null), of(undefined), of(link)]);

        const result = await task();

        assert.deepStrictEqual(result, [0, false, null, undefined, link]);
        assert.strictEqual(result[4], link);
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
        const error = { reason: "Missing hero" };
        let finishZelda;
        const zeldaPromise = new Promise(resolve => {
            finishZelda = resolve;
        });
        const calls = [];
        let zeldaWork;

        const task = all([
            () => Promise.reject(error),
            () => {
                calls.push("started");
                zeldaWork = zeldaPromise.then(value => {
                    calls.push("finished");

                    return value;
                });

                return zeldaWork;
            },
        ]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["started"]);

        finishZelda("Zelda");

        assert.strictEqual(await zeldaWork, "Zelda");
        assert.deepStrictEqual(calls, ["started", "finished"]);
    });
});
