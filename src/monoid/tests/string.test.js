import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { string } from '../index.js';

describe("string", () => {
    it("concatenates strings in order", () => {
        assert.strictEqual(string.combine("Link", " and Zelda"), "Link and Zelda");
    });

    it("returns an identity for either side", () => {
        assert.strictEqual(string.empty(), "");
        assert.strictEqual(string.combine(string.empty(), "Link"), "Link");
        assert.strictEqual(string.combine("Link", string.empty()), "Link");
    });

    it("combines three values associatively", () => {
        const [first, second, third] = ["Cast ", "Fireball", "!"];
        const left = string.combine(string.combine(first, second), third);
        const right = string.combine(first, string.combine(second, third));

        assert.deepStrictEqual(left, right);
    });
});
