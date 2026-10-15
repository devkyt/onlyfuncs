import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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
        let finishLink;
        const link = new Promise(resolve => {
            finishLink = resolve;
        });
        let finishZelda;
        const zelda = new Promise(resolve => {
            finishZelda = resolve;
        });
        const tasks = Object.freeze([
            (...args) => {
                calls.push(["Link", ...args]);

                return link;
            },
            (...args) => {
                calls.push(["Zelda", ...args]);

                return zelda;
            },
            (...args) => {
                calls.push(["Tingle", ...args]);

                return Promise.resolve(Result.ok("Tingle"));
            },
        ]);
        const task = allParallelLimit(2)(tasks);

        assert.deepStrictEqual(calls, []);

        const pending = task();

        assert.deepStrictEqual(calls, [["Link"], ["Zelda"]]);
        finishZelda(Result.ok("Zelda"));

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, [["Link"], ["Zelda"], ["Tingle"]]);
        finishLink(Result.ok("Link"));

        assert.deepStrictEqual(await pending, Result.ok(["Link", "Zelda", "Tingle"]));
    });

    it("continues after Err and preserves the first Err in input order", async () => {
        const firstError = Result.err(undefined);
        let finish;
        const first = new Promise(resolve => {
            finish = resolve;
        });
        let laterCalls = 0;
        const task = allParallelLimit(2)([
            () => first,
            err("Zelda missing"),
            () => {
                laterCalls += 1;

                return Promise.resolve(Result.ok("Tingle"));
            },
        ]);
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(laterCalls, 1);
        finish(firstError);

        assert.strictEqual(await pending, firstError);
    });

    it("waits for each task with concurrency one and reruns with fresh output", async () => {
        const calls = [];
        const link = Object.freeze({ health: 100 });
        let finishLink;
        const source = new Promise(resolve => {
            finishLink = resolve;
        });
        const task = allParallelLimit(1)([
            () => {
                calls.push("Link");

                return source;
            },
            () => {
                calls.push("Zelda");

                return Promise.resolve(Result.ok(undefined));
            },
        ]);
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, ["Link"]);
        finishLink(Result.ok(link));

        const first = await pending;
        const second = await task();

        assert.deepStrictEqual(first, Result.ok([link, undefined]));
        assert.deepStrictEqual(second, first);
        assert.strictEqual(first.value[0], link);
        assert.notStrictEqual(first.value, second.value);
        assert.deepStrictEqual(calls, ["Link", "Zelda", "Link", "Zelda"]);
    });

    it("accepts large concurrency and produces fresh empty arrays", async () => {
        const collect = allParallelLimit(Number.MAX_SAFE_INTEGER);
        const empty = collect([]);
        const first = await empty();
        const second = await empty();

        assert.deepStrictEqual(first, Result.ok([]));
        assert.deepStrictEqual(second, Result.ok([]));
        assert.notStrictEqual(first.value, second.value);
        assert.deepStrictEqual(await collect([ok("Link")])(), Result.ok(["Link"]));
    });

    it("stops queued tasks on rejection and handles later started rejections", async () => {
        const error = { reason: "Offline" };
        let rejectLater;
        const later = new Promise((resolve, reject) => {
            rejectLater = reject;
        });
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

        await new Promise(resolve => setImmediate(resolve));
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
