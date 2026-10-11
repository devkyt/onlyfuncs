import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, getOrThrow } from '../index.js';

describe("getOrThrow", () => {
    it("returns the Ok payload unchanged", () => {
        const link = Object.freeze({ health: 100 });

        assert.strictEqual(getOrThrow(ok(link)), link);
        assert.strictEqual(getOrThrow(ok(0)), 0);
        assert.strictEqual(getOrThrow(ok(false)), false);
        assert.strictEqual(getOrThrow(ok(null)), null);
        assert.strictEqual(getOrThrow(ok(undefined)), undefined);
    });

    it("throws the exact error object", () => {
        const error = new Error("No health");

        assert.throws(() => getOrThrow(err(error)), actual => actual === error);
    });

    it("throws non-Error and falsy payloads without normalization", () => {
        assert.throws(() => getOrThrow(err("No health")), actual => actual === "No health");
        assert.throws(() => getOrThrow(err(0)), actual => actual === 0);
        assert.throws(() => getOrThrow(err(false)), actual => actual === false);
        assert.throws(() => getOrThrow(err(null)), actual => actual === null);
        assert.throws(() => getOrThrow(err(undefined)), actual => actual === undefined);
    });
});
