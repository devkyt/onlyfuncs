import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, ok, traverseParallelLimit } from '../index.js';

describe("traverseParallelLimit", () => {
    it("validates concurrency immediately without calling the transform", () => {
        const invalid = [0, -1, 1.5, NaN, Infinity, "2", null, undefined, Number.MAX_SAFE_INTEGER + 1];
        const transform = () => assert.fail("transform should not run");

        for (const concurrency of invalid) {
            assert.throws(() => traverseParallelLimit({ concurrency, transform }), RangeError);
        }
    });

    it("starts lazily, limits active tasks, and refills free slots without waiting for a batch", async () => {
        const transformed = [];
        const started = [];
        const finishes = new Map();
        let active = 0;
        let maximum = 0;
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: (...args) => {
                const [name] = args;
                transformed.push(args);

                return (...taskArgs) => {
                    assert.deepStrictEqual(taskArgs, []);

                    started.push(name);
                    active += 1;
                    maximum = Math.max(maximum, active);

                    return new Promise(resolve => {
                        finishes.set(name, () => {
                            active -= 1;
                            resolve(Result.ok(name));
                        });
                    });
                };
            },
        })(Object.freeze(["Link", "Zelda", "Tingle", "Ganon"]));

        assert.deepStrictEqual(transformed, []);
        assert.deepStrictEqual(started, []);

        const pending = task();

        assert.deepStrictEqual(transformed, [["Link"], ["Zelda"]]);
        assert.deepStrictEqual(started, ["Link", "Zelda"]);
        finishes.get("Zelda")();

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(started, ["Link", "Zelda", "Tingle"]);
        assert.strictEqual(active, 2);
        finishes.get("Tingle")();

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(started, ["Link", "Zelda", "Tingle", "Ganon"]);
        finishes.get("Ganon")();
        finishes.get("Link")();

        assert.deepStrictEqual(await pending, Result.ok(["Link", "Zelda", "Tingle", "Ganon"]));
        assert.deepStrictEqual(transformed, [["Link"], ["Zelda"], ["Tingle"], ["Ganon"]]);
        assert.strictEqual(maximum, 2);
        assert.strictEqual(active, 0);
    });

    it("runs sequentially with concurrency one", async () => {
        let finish;
        const first = new Promise(resolve => {
            finish = resolve;
        });
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 1,
            transform: name => {
                calls.push(name);

                return name === "Link" ? () => first : ok(name);
            },
        })(["Link", "Zelda"]);
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, ["Link"]);
        finish(Result.ok("Link"));

        assert.deepStrictEqual(await pending, Result.ok(["Link", "Zelda"]));
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("accepts concurrency larger than the input without creating extra work", async () => {
        const link = Object.freeze({ health: 100 });
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: Number.MAX_SAFE_INTEGER,
            transform: value => {
                calls.push(value);

                return ok(value);
            },
        })(Object.freeze([link, undefined, null]));
        const result = await task();

        assert.deepStrictEqual(calls, [link, undefined, null]);
        assert.deepStrictEqual(result, Result.ok([link, undefined, null]));
        assert.strictEqual(result.value[0], link);
    });

    it("continues after Err and returns the first Err in input order after all tasks fulfill", async () => {
        const firstError = Object.freeze(Result.err(undefined));
        let finishFirst;
        const first = new Promise(resolve => {
            finishFirst = resolve;
        });
        let finishLast;
        const last = new Promise(resolve => {
            finishLast = resolve;
        });
        const calls = [];
        const sources = [() => first, err("Zelda missing"), () => last];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: index => {
                calls.push(index);

                return sources[index];
            },
        })([0, 1, 2]);
        const pending = task();
        let settled = false;
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, [0, 1, 2]);
        assert.strictEqual(settled, false);
        finishFirst(firstError);

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, false);
        finishLast(Result.ok("Tingle"));

        assert.strictEqual(await pending, firstError);
    });

    it("returns fresh empty success arrays without calling the transform", async () => {
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: () => assert.fail("transform should not run"),
        })([]);
        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.ok([]));
        assert.deepStrictEqual(second, Result.ok([]));
        assert.notStrictEqual(first.value, second.value);
    });

    it("keeps independent state during overlapping executions", async () => {
        const finishes = [];
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 1,
            transform: name => {
                calls.push(name);

                return () => new Promise(resolve => {
                    finishes.push(resolve);
                });
            },
        })(["Link", "Zelda"]);
        const first = task();
        const second = task();

        assert.deepStrictEqual(calls, ["Link", "Link"]);
        finishes[1](Result.ok("second Link"));

        await new Promise(resolve => setImmediate(resolve));

        finishes[2](Result.ok("second Zelda"));
        const secondResult = await second;
        finishes[0](Result.ok("first Link"));

        await new Promise(resolve => setImmediate(resolve));

        finishes[3](Result.ok("first Zelda"));
        const firstResult = await first;

        assert.deepStrictEqual(firstResult, Result.ok(["first Link", "first Zelda"]));
        assert.deepStrictEqual(secondResult, Result.ok(["second Link", "second Zelda"]));
        assert.notStrictEqual(firstResult.value, secondResult.value);
        assert.deepStrictEqual(calls, ["Link", "Link", "Zelda", "Zelda"]);
    });

    it("stops queued work on rejection while handling later failures of started tasks", async () => {
        const error = { reason: "Offline" };
        const lateError = { reason: "Also offline" };
        let rejectFirst;
        const first = new Promise((resolve, reject) => {
            rejectFirst = reject;
        });
        let rejectSecond;
        const second = new Promise((resolve, reject) => {
            rejectSecond = reject;
        });
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                return () => name === "Link" ? first : second;
            },
        })(["Link", "Zelda", "Tingle"]);
        const pending = task();
        const rejection = assert.rejects(pending, actual => actual === error);
        rejectFirst(error);

        await rejection;

        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
        rejectSecond(lateError);

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("does not resume queued work when an already-started task fulfills after rejection", async () => {
        let finish;
        const source = new Promise(resolve => {
            finish = resolve;
        });
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                return () => name === "Link" ? Promise.reject(undefined) : source;
            },
        })(["Link", "Zelda", "Tingle"]);

        await assert.rejects(task(), actual => actual === undefined);
        finish(Result.ok("Zelda"));

        await new Promise(resolve => setImmediate(resolve));

        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("turns synchronous transform throws into rejection and stops later transforms", async () => {
        const error = { reason: "Cannot create task" };
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                throw error;
            },
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });

    it("turns synchronous task throws into rejection and stops queued work", async () => {
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                return () => {
                    throw undefined;
                };
            },
        })(["Link", "Zelda"]);

        await assert.rejects(task(), actual => actual === undefined);
        assert.deepStrictEqual(calls, ["Link"]);
    });

    it("starts fresh after a previous execution rejected", async () => {
        let fail = true;
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 1,
            transform: name => {
                calls.push(name);

                return () => fail ? Promise.reject("offline") : Promise.resolve(Result.ok(name));
            },
        })(["Link", "Zelda"]);

        await assert.rejects(task(), error => error === "offline");
        fail = false;

        assert.deepStrictEqual(await task(), Result.ok(["Link", "Zelda"]));
        assert.deepStrictEqual(calls, ["Link", "Link", "Zelda"]);
    });
});
