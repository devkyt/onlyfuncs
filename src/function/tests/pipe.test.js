import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pipe } from '../index.js';

describe("pipe", () => {
    it("runs steps from left to right", () => {
        const heal = hero => ({ ...hero, health: hero.health + 20 });
        const attack = hero => ({ ...hero, health: hero.health / 2 });
        const hero = Object.freeze({ name: "Samus", health: 60 });
        const result = pipe(hero, heal, attack);

        assert.deepStrictEqual(result, { name: "Samus", health: 40 });
        assert.notStrictEqual(result, hero);
    });

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };

        assert.strictEqual(pipe(input), input);
    });

    it("returns the result of a single step", () => {
        assert.strictEqual(pipe(3, value => value + 1), 4);
    });

    it("passes zero to the next step", () => {
        const one = pipe(5, () => 0, value => value + 1);

        assert.strictEqual(one, 1);
    });

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
    });

    it("throws TypeError for a non-function step", () => {
        assert.throws(() => pipe(2, null), TypeError);
    });
});
