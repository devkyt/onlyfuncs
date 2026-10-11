import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { string } from '../index.js';

describe("string", () => {
    it("concatenates strings in order", () => {
        assert.strictEqual(string.combine("Link", " and Zelda"), "Link and Zelda");
    });

    it("preserves order and handles empty strings", () => {
        assert.strictEqual(string.combine("Zelda", "Link"), "ZeldaLink");
        assert.strictEqual(string.combine("", "Link"), "Link");
        assert.strictEqual(string.combine("Link", ""), "Link");
    });
});
