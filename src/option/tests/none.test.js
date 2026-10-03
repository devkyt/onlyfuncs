import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { none } from '../index.js';

describe("none", () => {
    it("is an object with its own none tag and no value property", () => {
        assert.deepStrictEqual(none, { type: "none" });
        assert.strictEqual(Object.hasOwn(none, "type"), true);
        assert.strictEqual("value" in none, false);
    });
});
