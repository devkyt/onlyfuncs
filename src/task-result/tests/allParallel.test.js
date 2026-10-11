import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, fromResult, ok, allParallel } from '../index.js';

describe("allParallel", () => {
    it("starts all tasks lazily and preserves input order", async () => {
        let finishLink;
        const link = new Promise(resolve => {
            finishLink = resolve;
        });
        const calls = [];
        const tasks = Object.freeze([
            (...args) => {
                assert.deepStrictEqual(args, []);
                calls.push("Link");

                return link;
            },
            () => {
                calls.push("Zelda");

                return Promise.resolve(Result.ok("Zelda"));
            },
        ]);
        const task = allParallel(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
        finishLink(Result.ok("Link"));

        assert.deepStrictEqual(await pending, Result.ok(["Link", "Zelda"]));
    });

    it("waits for every fulfillment and returns the first Err in input order", async () => {
        let finishLink;
        const link = new Promise(resolve => {
            finishLink = resolve;
        });
        const firstError = Object.freeze(Result.err(undefined));
        const secondError = Result.err("Zelda missing");
        let settled = false;
        let laterCalls = 0;
        const tasks = [
            () => link,
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

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, false);
        assert.strictEqual(laterCalls, 1);
        finishLink(firstError);

        assert.strictEqual(await pending, firstError);
    });

    it("does not settle an early Err while a later task is pending", async () => {
        let finishZelda;
        const zelda = new Promise(resolve => {
            finishZelda = resolve;
        });
        const failure = Result.err("Link missing");
        let settled = false;
        const tasks = [fromResult(failure), () => zelda];
        const pending = allParallel(tasks)();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, false);
        finishZelda(Result.ok("Zelda"));

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
        const link = Object.freeze({ health: 100 });
        const tasks = [ok(0), ok(false), ok(null), ok(undefined), ok(link)];
        const result = await allParallel(tasks)();

        assert.deepStrictEqual(result, Result.ok([0, false, null, undefined, link]));
        assert.strictEqual(result.value[4], link);
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
        const error = { reason: "Missing hero" };
        let finishZelda;
        const zelda = new Promise(resolve => {
            finishZelda = resolve;
        });
        const calls = [];
        const tasks = [
            () => Promise.reject(error),
            () => {
                calls.push("start Zelda");

                return zelda.then(value => {
                    calls.push("finish Zelda");

                    return Result.ok(value);
                });
            },
        ];
        const pending = allParallel(tasks)();

        await assert.rejects(pending, actual => actual === error);
        assert.deepStrictEqual(calls, ["start Zelda"]);
        finishZelda("Zelda");
        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, ["start Zelda", "finish Zelda"]);
    });

    it("propagates rejection even if another task fulfills with Err", async () => {
        const error = { reason: "Connection lost" };
        const tasks = [
            err("No health"),
            () => Promise.reject(error),
        ];
        const task = allParallel(tasks);

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a synchronous task throw and skips later tasks", async () => {
        const error = { reason: "Missing hero" };
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
