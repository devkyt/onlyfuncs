import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, isErr } from '../index.js';

describe("isErr", () => {
    it("returns true for failure", () => {
        assert.strictEqual(isErr(err("No health")), true);
    });

    it("returns false for Ok, even with an undefined value", () => {
        assert.strictEqual(isErr(ok("Zelda")), false);
        assert.strictEqual(isErr(ok(undefined)), false);
    });

    it("returns true for Err with falsy errors", () => {
        assert.strictEqual(isErr(err(0)), true);
        assert.strictEqual(isErr(err(false)), true);
        assert.strictEqual(isErr(err("")), true);
        assert.strictEqual(isErr(err(null)), true);
        assert.strictEqual(isErr(err(undefined)), true);
        assert.strictEqual(isErr(err(NaN)), true);
    });
});
