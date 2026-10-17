import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { string } from '../index.js';

describe("string", () => {
    it("concatenates strings in order", () => {
        assert.strictEqual(string.combine("Cast ", "Fireball"), "Cast Fireball");
    });

    it("preserves order and handles empty strings", () => {
        assert.strictEqual(string.combine("Fireball", " ready"), "Fireball ready");
        assert.strictEqual(string.combine("", "Fireball"), "Fireball");
        assert.strictEqual(string.combine("Fireball", ""), "Fireball");
    });
});
