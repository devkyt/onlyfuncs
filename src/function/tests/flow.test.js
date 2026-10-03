import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { flow } from '../index.js';

describe("flow", () => {
    it("creates pipeline applied in order from left to right", () => {
        const bigLink = flow(
            value => value.toLowerCase(),
            value => value.trim(),
            value => value.toUpperCase(),
        );

        const ten = flow(
            value => value + 3,
            value => value * 2);

        assert.strictEqual(bigLink("   Link   "), "LINK");
        assert.strictEqual(ten(2), 10);
    })

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };
        const empty = flow();

        assert.strictEqual(empty(input), input);
    })

    it("passes zero to the next step", () => {
        const one = flow(() => 0, value => value + 1);

        assert.strictEqual(one(5), 1);
    })

    it("reuses the same pipeline with different inputs", () => {
        const calculate = flow(value => value + 3, value => value * 2);

        assert.strictEqual(calculate(2), 10);
        assert.strictEqual(calculate(5), 16);
    })

    it("returns the result of a single step", () => {
        const addOne = flow(value => value + 1);

        assert.strictEqual(addOne(3), 4);
    })

    it("runs steps only when the pipeline is called", () => {
        let calls = 0;

        const run = flow(value => {
            calls += 1;
            return value;
        });

        assert.strictEqual(calls, 0);
        run(42);
        assert.strictEqual(calls, 1);
    })

    it("propagates the exact thrown value and skips later steps", () => {
        const error = new Error("failed");

        let laterStepRan = false;

        const run = flow(
            () => { throw error; },
            () => { laterStepRan = true; },
        );

        assert.throws(() => run(42), actual => actual === error);
        assert.strictEqual(laterStepRan, false);
    })

    it("throws TypeError for an invalid step when called", () => {
        const run = flow(null);

        assert.throws(() => run(2), TypeError);
    })
})
