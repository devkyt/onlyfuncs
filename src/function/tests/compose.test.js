import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compose } from '../index.js';

describe("compose", () => {
    it("runs steps from right to left", () => {
        const calculate = compose(value => value * 2, value => value + 3);

        assert.strictEqual(calculate(2), 10);
    });

    it("reuses the same composition with different inputs", () => {
        const calculate = compose(value => value * 2, value => value + 3);

        assert.strictEqual(calculate(2), 10);
        assert.strictEqual(calculate(5), 16);
    });

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };

        assert.strictEqual(compose()(input), input);
    });

    it("returns the result of a single step", () => {
        const addOne = compose(value => value + 1);

        assert.strictEqual(addOne(3), 4);
    });

    it("passes zero to the next step", () => {
        const run = compose(value => value + 1, () => 0);

        assert.strictEqual(run(5), 1);
    });

    it("runs steps only when the composition is called", () => {
        let calls = 0;
        const run = compose(value => {
            calls += 1;
            return value;
        });

        assert.strictEqual(calls, 0);
        run(42);
        assert.strictEqual(calls, 1);
    });

    it("propagates the exact thrown value and skips steps to the left", () => {
        const error = new Error("failed");
        let laterStepRan = false;
        const run = compose(
            () => { laterStepRan = true; },
            () => { throw error; },
        );

        assert.throws(() => run(42), actual => actual === error);
        assert.strictEqual(laterStepRan, false);
    });

    it("throws TypeError for an invalid step when it is reached", () => {
        let firstStepRan = false;
        const run = compose(null, value => {
            firstStepRan = true;
            return value;
        });

        assert.strictEqual(firstStepRan, false);
        assert.throws(() => run(2), TypeError);
        assert.strictEqual(firstStepRan, true);
    });

    it("preserves the caller's array of functions", () => {
        const double = value => value * 2;
        const addThree = value => value + 3;
        const steps = [double, addThree];
        const run = compose(...steps);

        run(2);
        assert.deepStrictEqual(steps, [double, addThree]);
    });
});
