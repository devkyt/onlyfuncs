import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

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
        })(Object.freeze(["Attack", "Heal", "CastSpell", "ChooseItem"]));

        assert.deepStrictEqual(transformed, []);
        assert.deepStrictEqual(started, []);

        const pending = task();

        assert.deepStrictEqual(transformed, [["Attack"], ["Heal"]]);
        assert.deepStrictEqual(started, ["Attack", "Heal"]);
        finishes.get("Heal")();

        await setImmediate();

        assert.deepStrictEqual(started, ["Attack", "Heal", "CastSpell"]);
        assert.strictEqual(active, 2);
        finishes.get("CastSpell")();

        await setImmediate();

        assert.deepStrictEqual(started, ["Attack", "Heal", "CastSpell", "ChooseItem"]);
        finishes.get("ChooseItem")();
        finishes.get("Attack")();

        assert.deepStrictEqual(await pending, Result.ok(["Attack", "Heal", "CastSpell", "ChooseItem"]));
        assert.deepStrictEqual(transformed, [["Attack"], ["Heal"], ["CastSpell"], ["ChooseItem"]]);
        assert.strictEqual(maximum, 2);
        assert.strictEqual(active, 0);
    });

    it("runs sequentially with concurrency one", async () => {
        const { promise: first, resolve: finish } = Promise.withResolvers();
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 1,
            transform: name => {
                calls.push(name);

                return name === "Attack" ? () => first : ok(name);
            },
        })(["Attack", "Heal"]);
        const pending = task();

        await setImmediate();

        assert.deepStrictEqual(calls, ["Attack"]);
        finish(Result.ok("Attack"));

        assert.deepStrictEqual(await pending, Result.ok(["Attack", "Heal"]));
        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
    });

    it("accepts concurrency larger than the input without creating extra work", async () => {
        const attack = Object.freeze({ damage: 100 });
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: Number.MAX_SAFE_INTEGER,
            transform: value => {
                calls.push(value);

                return ok(value);
            },
        })(Object.freeze([attack, undefined, null]));
        const result = await task();

        assert.deepStrictEqual(calls, [attack, undefined, null]);
        assert.deepStrictEqual(result, Result.ok([attack, undefined, null]));
        assert.strictEqual(result.value[0], attack);
    });

    it("continues after Err and returns the first Err in input order after all tasks fulfill", async () => {
        const firstError = Object.freeze(Result.err(undefined));
        const { promise: first, resolve: finishFirst } = Promise.withResolvers();
        const { promise: last, resolve: finishLast } = Promise.withResolvers();
        const calls = [];
        const sources = [() => first, err("Healing unavailable"), () => last];
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

        await setImmediate();

        assert.deepStrictEqual(calls, [0, 1, 2]);
        assert.strictEqual(settled, false);
        finishFirst(firstError);

        await setImmediate();

        assert.strictEqual(settled, false);
        finishLast(Result.ok("CastSpell"));

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
        })(["Attack", "Heal"]);
        const first = task();
        const second = task();

        assert.deepStrictEqual(calls, ["Attack", "Attack"]);
        finishes[1](Result.ok("second Attack"));

        await setImmediate();

        finishes[2](Result.ok("second Heal"));
        const secondResult = await second;
        finishes[0](Result.ok("first Attack"));

        await setImmediate();

        finishes[3](Result.ok("first Heal"));
        const firstResult = await first;

        assert.deepStrictEqual(firstResult, Result.ok(["first Attack", "first Heal"]));
        assert.deepStrictEqual(secondResult, Result.ok(["second Attack", "second Heal"]));
        assert.notStrictEqual(firstResult.value, secondResult.value);
        assert.deepStrictEqual(calls, ["Attack", "Attack", "Heal", "Heal"]);
    });

    it("stops queued work on rejection while handling later failures of started tasks", async () => {
        const error = { reason: "Offline" };
        const lateError = { reason: "Also offline" };
        const { promise: first, reject: rejectFirst } = Promise.withResolvers();
        const { promise: second, reject: rejectSecond } = Promise.withResolvers();
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                return () => name === "Attack" ? first : second;
            },
        })(["Attack", "Heal", "CastSpell"]);
        const pending = task();
        const rejection = assert.rejects(pending, actual => actual === error);
        rejectFirst(error);

        await rejection;

        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
        rejectSecond(lateError);

        await setImmediate();

        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
    });

    it("does not resume queued work when an already-started task fulfills after rejection", async () => {
        const { promise: source, resolve: finish } = Promise.withResolvers();
        const calls = [];
        const task = traverseParallelLimit({
            concurrency: 2,
            transform: name => {
                calls.push(name);

                return () => name === "Attack" ? Promise.reject(undefined) : source;
            },
        })(["Attack", "Heal", "CastSpell"]);

        await assert.rejects(task(), actual => actual === undefined);
        finish(Result.ok("Heal"));

        await setImmediate();

        assert.deepStrictEqual(calls, ["Attack", "Heal"]);
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
        })(["Attack", "Heal"]);

        await assert.rejects(task(), actual => actual === error);
        assert.deepStrictEqual(calls, ["Attack"]);
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
        })(["Attack", "Heal"]);

        await assert.rejects(task(), actual => actual === undefined);
        assert.deepStrictEqual(calls, ["Attack"]);
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
        })(["Attack", "Heal"]);

        await assert.rejects(task(), error => error === "offline");
        fail = false;

        assert.deepStrictEqual(await task(), Result.ok(["Attack", "Heal"]));
        assert.deepStrictEqual(calls, ["Attack", "Attack", "Heal"]);
    });
});
