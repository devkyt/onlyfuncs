import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, flatten } from '../index.js';

describe("flatten", () => {
    it("returns the inner Ok or Err unchanged", () => {
        const success = ok({ kind: "potion", healing: 25 });
        const failure = err(undefined);

        assert.strictEqual(flatten(Object.freeze(ok(success))), success);
        assert.strictEqual(flatten(ok(failure)), failure);
    });

    it("preserves an outer Err unchanged", () => {
        const failure = Object.freeze(err({ reason: "Item unavailable" }));

        assert.strictEqual(flatten(failure), failure);
    });

    it("removes only one layer and preserves undefined", () => {
        const inner = ok(ok(undefined));

        assert.strictEqual(flatten(ok(inner)), inner);
        assert.deepStrictEqual(flatten(ok(ok(undefined))), ok(undefined));
    });
});
