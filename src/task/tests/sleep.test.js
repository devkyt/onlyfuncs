import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sleep } from '../index.js';

describe("sleep", () => {
    it("schedules only on execution and resolves to undefined after the timer", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", (callback, milliseconds) => {
            timers.push({ callback, milliseconds });
        });
        const task = sleep(500);

        assert.deepStrictEqual(timers, []);

        const pending = task();
        let settled = false;
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.ok(pending instanceof Promise);
        assert.strictEqual(timers.length, 1);
        assert.strictEqual(timers[0].milliseconds, 500);
        assert.strictEqual(settled, false);
        timers[0].callback();

        assert.strictEqual(await pending, undefined);
    });

    it("creates independent timers and promises on repeated execution", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", callback => {
            timers.push(callback);
        });
        const task = sleep(10);
        const first = task();
        const second = task();
        let firstSettled = false;
        first.then(() => {
            firstSettled = true;
        });

        assert.notStrictEqual(first, second);
        assert.strictEqual(timers.length, 2);
        timers[1]();

        assert.strictEqual(await second, undefined);
        assert.strictEqual(firstSettled, false);
        timers[0]();

        assert.strictEqual(await first, undefined);
    });

    it("accepts zero and the maximum delay and still schedules timers", async t => {
        const timers = [];
        t.mock.method(globalThis, "setTimeout", (callback, milliseconds) => {
            timers.push({ callback, milliseconds });
        });
        const zero = sleep(0)();
        const maximum = sleep(2147483647)();

        assert.deepStrictEqual(timers.map(timer => timer.milliseconds), [0, 2147483647]);
        timers[0].callback();
        timers[1].callback();

        assert.strictEqual(await zero, undefined);
        assert.strictEqual(await maximum, undefined);
    });

    it("rejects invalid configuration without scheduling a timer", t => {
        t.mock.method(globalThis, "setTimeout", () => assert.fail("timer should not be scheduled"));
        const invalid = [-1, 0.5, 2147483648, NaN, Infinity, -Infinity, "1", null, undefined, false];

        for (const milliseconds of invalid) {
            assert.throws(() => sleep(milliseconds), RangeError);
        }
    });
});
