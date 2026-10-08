import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, isOk } from '../index.js';

describe("isOk", () => {
    it("returns true for success", () => {
        assert.strictEqual(isOk(ok("Link")), true);
    });

    it("returns false for Err, even with an undefined error", () => {
        assert.strictEqual(isOk(err("No stamina")), false);
        assert.strictEqual(isOk(err(undefined)), false);
    });

    it("returns true for Ok with falsy values", () => {
        assert.strictEqual(isOk(ok(0)), true);
        assert.strictEqual(isOk(ok(false)), true);
        assert.strictEqual(isOk(ok("")), true);
        assert.strictEqual(isOk(ok(null)), true);
        assert.strictEqual(isOk(ok(undefined)), true);
        assert.strictEqual(isOk(ok(NaN)), true);
    });
});
