import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { array } from '../index.js';

describe("array", () => {
    it("combines arrays in order without mutating inputs", () => {
        const sword = Object.freeze({ kind: "sword", damage: 12 });
        const shield = Object.freeze({ kind: "shield", armor: 8 });
        const left = Object.freeze([sword, null]);
        const right = Object.freeze([undefined, shield]);
        const result = array.combine(left, right);

        assert.deepStrictEqual(result, [sword, null, undefined, shield]);
        assert.strictEqual(result[0], sword);
        assert.strictEqual(result[3], shield);
        assert.notStrictEqual(result, left);
        assert.notStrictEqual(result, right);
        assert.deepStrictEqual(left, [sword, null]);
        assert.deepStrictEqual(right, [undefined, shield]);
    });

    it("allocates a new array when either side is empty", () => {
        const input = ["potion"];
        const first = array.combine([], input);
        const second = array.combine(input, []);

        assert.deepStrictEqual(first, input);
        assert.deepStrictEqual(second, input);
        assert.notStrictEqual(first, input);
        assert.notStrictEqual(second, input);
        assert.notStrictEqual(first, second);
    });

    it("returns a fresh mutable identity on every call", () => {
        const first = array.empty();
        const second = array.empty();

        assert.deepStrictEqual(first, []);

        first.push("potion");

        assert.deepStrictEqual(second, []);
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(array.combine(array.empty(), ["arrow"]), ["arrow"]);
        assert.deepStrictEqual(array.combine(["arrow"], array.empty()), ["arrow"]);
    });

    it("combines three values associatively", () => {
        const [first, second, third] = [["sword"], ["potion"], ["shield"]];
        const left = array.combine(array.combine(first, second), third);
        const right = array.combine(first, array.combine(second, third));

        assert.deepStrictEqual(left, right);
    });
});
