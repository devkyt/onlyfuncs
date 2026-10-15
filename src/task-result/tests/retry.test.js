import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromResult, retry } from '../index.js';

describe("retry", () => {
    it("rejects invalid attempt limits when configured", () => {
        const invalid = [0, -1, 1.5, NaN, Infinity, "2", null, undefined, Number.MAX_SAFE_INTEGER + 1];

        for (const attempts of invalid) {
            assert.throws(() => retry({
                attempts,
                retryOn: () => assert.fail("policy should not run"),
                delay: () => assert.fail("delay should not run"),
            }), RangeError);
        }
    });

    it("defers and repeats source execution without arguments and preserves Ok identity", async () => {
        const result = Object.freeze(Result.ok(undefined));
        let calls = 0;
        const task = retry({
            attempts: Number.MAX_SAFE_INTEGER,
            retryOn: () => assert.fail("policy should not run after success"),
            delay: () => assert.fail("delay should not run after success"),
        })((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return Promise.resolve(result);
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(await task(), result);
        assert.strictEqual(await task(), result);
        assert.strictEqual(calls, 2);
    });

    it("returns the first Err without policy or delay when only one attempt is allowed", async () => {
        const result = Object.freeze(Result.err(undefined));
        let calls = 0;
        const task = retry({
            attempts: 1,
            retryOn: () => assert.fail("policy should not run on the final attempt"),
            delay: () => assert.fail("delay should not run on the final attempt"),
        })(() => {
            calls += 1;

            return Promise.resolve(result);
        });

        assert.strictEqual(await task(), result);
        assert.strictEqual(calls, 1);
    });

    it("returns the original Err when the policy declines without calling delay", async () => {
        const error = Object.freeze({ reason: "Missing hero" });
        const result = Object.freeze(Result.err(error));
        const calls = [];
        const task = retry({
            attempts: 3,
            retryOn: (...args) => {
                calls.push(args);

                return false;
            },
            delay: () => assert.fail("delay should not run after a declined retry"),
        })(fromResult(result));

        assert.strictEqual(await task(), result);
        assert.deepStrictEqual(calls, [[error, 1]]);
        assert.strictEqual(calls[0][0], error);
    });

    it("passes errors and attempt numbers to policies and waits for each delay", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", (callback, milliseconds) => {
            timers.push({ callback, milliseconds });
        });
        const firstError = { reason: "Offline" };
        const success = Result.ok("Link");
        const results = [Result.err(firstError), Result.err(undefined), success];
        const events = [];
        let calls = 0;
        const task = retry({
            attempts: 4,
            retryOn: (...args) => {
                events.push(["policy", ...args]);

                return true;
            },
            delay: (...args) => {
                const [, attempt] = args;
                events.push(["delay", ...args]);

                return attempt * 500;
            },
        })(() => {
            const result = results[calls];
            calls += 1;
            events.push(["source", calls]);

            return Promise.resolve(result);
        });

        assert.deepStrictEqual(events, []);
        assert.deepStrictEqual(timers, []);

        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 1);
        assert.strictEqual(timers.length, 1);
        assert.strictEqual(timers[0].milliseconds, 500);
        timers[0].callback();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 2);
        assert.strictEqual(timers.length, 2);
        assert.strictEqual(timers[1].milliseconds, 1000);
        timers[1].callback();

        assert.strictEqual(await pending, success);
        assert.strictEqual(calls, 3);
        assert.strictEqual(timers.length, 2);
        assert.deepStrictEqual(events, [
            ["source", 1],
            ["policy", firstError, 1],
            ["delay", firstError, 1],
            ["source", 2],
            ["policy", undefined, 2],
            ["delay", undefined, 2],
            ["source", 3],
        ]);
        assert.strictEqual(events[1][1], firstError);
        assert.strictEqual(events[2][1], firstError);
    });

    it("counts the initial execution toward the limit and returns the last Err unchanged", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", (callback, milliseconds) => {
            timers.push({ callback, milliseconds });
        });
        const results = [Result.err("offline"), Result.err(null), Result.err(false)];
        const policies = [];
        const delays = [];
        let calls = 0;
        const task = retry({
            attempts: 3,
            retryOn: (error, attempt) => {
                policies.push([error, attempt]);

                return true;
            },
            delay: (error, attempt) => {
                delays.push([error, attempt]);

                return 0;
            },
        })(() => {
            const result = results[calls];
            calls += 1;

            return Promise.resolve(result);
        });
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 1);
        assert.strictEqual(timers.length, 1);
        assert.strictEqual(timers[0].milliseconds, 0);
        timers[0].callback();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 2);
        assert.strictEqual(timers.length, 2);
        assert.strictEqual(timers[1].milliseconds, 0);
        timers[1].callback();

        assert.strictEqual(await pending, results[2]);
        assert.strictEqual(calls, 3);
        assert.strictEqual(timers.length, 2);
        assert.deepStrictEqual(policies, [["offline", 1], [null, 2]]);
        assert.deepStrictEqual(delays, policies);
    });

    it("waits for the source before consulting policies or starting another attempt", async t => {
        let finish;
        const source = new Promise(resolve => {
            finish = resolve;
        });
        const timers = [];
        t.mock.method(globalThis, "setTimeout", callback => {
            timers.push(callback);
        });
        let calls = 0;
        let policies = 0;
        const success = Result.ok("Link");
        const task = retry({
            attempts: 2,
            retryOn: () => {
                policies += 1;

                return true;
            },
            delay: () => 10,
        })(() => {
            calls += 1;

            return calls === 1 ? source : Promise.resolve(success);
        });
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 1);
        assert.strictEqual(policies, 0);
        assert.strictEqual(timers.length, 0);
        finish(Result.err("offline"));

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 1);
        assert.strictEqual(policies, 1);
        assert.strictEqual(timers.length, 1);
        timers[0]();

        assert.strictEqual(await pending, success);
        assert.strictEqual(calls, 2);
    });

    it("resets attempt counts for every execution", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", callback => {
            timers.push(callback);
        });
        const result = Result.err("offline");
        const attempts = [];
        let calls = 0;
        const task = retry({
            attempts: 2,
            retryOn: (error, attempt) => {
                attempts.push(attempt);

                return true;
            },
            delay: () => 0,
        })(() => {
            calls += 1;

            return Promise.resolve(result);
        });
        const first = task();

        await new Promise(resolve => setImmediate(resolve));

        timers[0]();

        assert.strictEqual(await first, result);

        const second = task();

        await new Promise(resolve => setImmediate(resolve));

        timers[1]();

        assert.strictEqual(await second, result);
        assert.strictEqual(calls, 4);
        assert.deepStrictEqual(attempts, [1, 1]);
    });

    it("propagates source rejection without retrying or consulting callbacks", async () => {
        const error = { reason: "Offline" };
        let calls = 0;
        const task = retry({
            attempts: 3,
            retryOn: () => assert.fail("policy should not run after rejection"),
            delay: () => assert.fail("delay should not run after rejection"),
        })(() => {
            calls += 1;

            return Promise.reject(error);
        });

        await assert.rejects(task(), actual => actual === error);
        assert.strictEqual(calls, 1);
    });

    it("propagates a synchronous source throw including undefined without retrying", async () => {
        let calls = 0;
        const task = retry({
            attempts: 3,
            retryOn: () => assert.fail("policy should not run after a throw"),
            delay: () => assert.fail("delay should not run after a throw"),
        })(() => {
            calls += 1;

            throw undefined;
        });

        await assert.rejects(task(), actual => actual === undefined);
        assert.strictEqual(calls, 1);
    });

    it("propagates retry policy throws without running delay", async () => {
        const error = { reason: "Cannot decide" };
        let calls = 0;
        const task = retry({
            attempts: 3,
            retryOn: () => {
                throw error;
            },
            delay: () => assert.fail("delay should not run after policy failure"),
        })(() => {
            calls += 1;

            return Promise.resolve(Result.err("offline"));
        });

        await assert.rejects(task(), actual => actual === error);
        assert.strictEqual(calls, 1);
    });

    it("propagates delay callback throws without retrying or scheduling a timer", async t => {
        t.mock.method(globalThis, "setTimeout", () => assert.fail("timer should not be scheduled"));
        let calls = 0;
        const task = retry({
            attempts: 3,
            retryOn: () => true,
            delay: () => {
                throw undefined;
            },
        })(() => {
            calls += 1;

            return Promise.resolve(Result.err("offline"));
        });

        await assert.rejects(task(), actual => actual === undefined);
        assert.strictEqual(calls, 1);
    });

    it("rejects invalid delay values without starting another attempt", async t => {
        t.mock.method(globalThis, "setTimeout", () => assert.fail("timer should not be scheduled"));
        const invalid = [-1, 0.5, 2147483648, NaN, Infinity, "1", null, undefined];

        for (const milliseconds of invalid) {
            let calls = 0;
            const task = retry({ attempts: 2, retryOn: () => true, delay: () => milliseconds })(() => {
                calls += 1;

                return Promise.resolve(Result.err("offline"));
            });

            await assert.rejects(task(), RangeError);
            assert.strictEqual(calls, 1);
        }
    });

    it("accepts the maximum timer delay", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", (callback, milliseconds) => {
            timers.push({ callback, milliseconds });
        });
        const result = Result.err("offline");
        const task = retry({
            attempts: 2,
            retryOn: () => true,
            delay: () => 2147483647,
        })(fromResult(result));
        const pending = task();

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(timers.length, 1);
        assert.strictEqual(timers[0].milliseconds, 2147483647);
        timers[0].callback();

        assert.strictEqual(await pending, result);
    });
});
