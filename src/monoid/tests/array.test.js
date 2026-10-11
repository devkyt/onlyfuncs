import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Semigroup from '../../semigroup/index.js';
import { array } from '../index.js';

describe("array", () => {
    it("combines arrays in order without mutating inputs", () => {
        const link = Object.freeze({ health: 100 });
        const zelda = Object.freeze({ health: 80 });
        const left = Object.freeze([link, null]);
        const right = Object.freeze([undefined, zelda]);
        const result = array.combine(left, right);

        assert.deepStrictEqual(result, [link, null, undefined, zelda]);
        assert.strictEqual(result[0], link);
        assert.strictEqual(result[3], zelda);
        assert.notStrictEqual(result, left);
        assert.notStrictEqual(result, right);
        assert.deepStrictEqual(left, [link, null]);
        assert.deepStrictEqual(right, [undefined, zelda]);
    });

    it("allocates a new array when either side is empty", () => {
        const input = ["Link"];
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

        first.push("Link");

        assert.deepStrictEqual(second, []);
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(array.combine(array.empty(), ["Zelda"]), ["Zelda"]);
        assert.deepStrictEqual(array.combine(["Zelda"], array.empty()), ["Zelda"]);
    });

    it("reuses the Semigroup combining function", () => {
        assert.strictEqual(array.combine, Semigroup.array.combine);
    });
});
