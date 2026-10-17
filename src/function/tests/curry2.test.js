import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { curry2 } from '../index.js';

describe("curry2", () => {
    it("preserves argument order", () => {
        const chooseItem = curry2((slot, inventory) => inventory[slot]);
        const potion = Object.freeze({ kind: "potion", healing: 25 });
        const inventory = Object.freeze(["sword", potion]);

        assert.strictEqual(chooseItem(1)(inventory), potion);
    });

    it("reuses a partially applied function", () => {
        const subtractFromTen = curry2((a, b) => a - b)(10);

        assert.strictEqual(subtractFromTen(3), 7);
        assert.strictEqual(subtractFromTen(4), 6);
    });

    it("keeps partial applications independent", () => {
        const subtract = curry2((a, b) => a - b);
        const fromTen = subtract(10);
        const fromTwenty = subtract(20);

        assert.strictEqual(fromTen(3), 7);
        assert.strictEqual(fromTwenty(3), 17);
        assert.strictEqual(fromTen(3), 7);
    });

    it("calls the original function only at the final application", () => {
        let calls = 0;
        const add = curry2((a, b) => {
            calls += 1;
            return a + b;
        });

        assert.strictEqual(calls, 0);
        const addTwo = add(2);
        assert.strictEqual(calls, 0);
        assert.strictEqual(addTwo(3), 5);
        assert.strictEqual(calls, 1);
    });

    it("passes omitted arguments as undefined", () => {
        const pair = curry2((a, b) => [a, b]);

        assert.deepStrictEqual(pair()(2), [undefined, 2]);
        assert.deepStrictEqual(pair(1)(), [1, undefined]);
        assert.deepStrictEqual(pair()(), [undefined, undefined]);
    });

    it("passes falsy arguments unchanged", () => {
        const pair = curry2((a, b) => [a, b]);

        assert.deepStrictEqual(pair(0)(false), [0, false]);
        assert.deepStrictEqual(pair("")(null), ["", null]);
    });

    it("preserves argument and return references", () => {
        const first = { health: 100 };
        const second = { stamina: 50 };
        const result = { ready: true };
        const run = curry2((a, b) => {
            assert.strictEqual(a, first);
            assert.strictEqual(b, second);
            return result;
        });

        assert.strictEqual(run(first)(second), result);
    });

    it("propagates the exact thrown value at the final application", () => {
        const error = { reason: "failed" };
        const run = curry2(() => { throw error; });
        const partial = run(1);

        assert.throws(() => partial(2), actual => actual === error);
    });
});
