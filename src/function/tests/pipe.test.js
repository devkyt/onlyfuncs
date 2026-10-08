import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pipe } from '../index.js';

describe("pipe", () => {
    it("runs steps from left to right", () => {
        const bigLink = pipe(
            "  link ",
            value => value.toLowerCase(),
            value => value.trim(),
            value => value.toUpperCase(),
        );

        const ten = pipe(2,
            value => value + 3,
            value => value * 2);

        assert.strictEqual(bigLink, "LINK");
        assert.strictEqual(ten, 10);
    })

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };

        assert.strictEqual(pipe(input), input);
    })

    it("returns the result of a single step", () => {
        assert.strictEqual(pipe(3, value => value + 1), 4);
    })

    it("passes zero to the next step", () => {
        const one = pipe(5, () => 0, value => value + 1);

        assert.strictEqual(one, 1);
    })

    it("propagates the exact thrown value and skips later steps", () => {
        const error = new Error("failed");
        let laterStepRan = false;

        assert.throws(
            () => pipe(
                42,
                () => { throw error; },
                () => { laterStepRan = true; },
            ),
            actual => actual === error,
        );

        assert.strictEqual(laterStepRan, false);
    })

    it("throws TypeError for a non-function step", () => {
        assert.throws(() => pipe(2, null), TypeError);
    })
})
