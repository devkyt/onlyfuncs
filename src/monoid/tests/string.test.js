import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Semigroup from '../../semigroup/index.js';
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

    it("reuses the Semigroup combining function", () => {
        assert.strictEqual(string.combine, Semigroup.string.combine);
    });
});
