import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { err } from '../index.js';

describe("err", () => {
    it("wraps an error with its own type and error properties", () => {
        const result = err("No stamina");

        assert.deepStrictEqual(result, { type: "err", error: "No stamina" });
        assert.strictEqual(Object.hasOwn(result, "type"), true);
        assert.strictEqual(Object.hasOwn(result, "error"), true);
    });

    it("keeps falsy and omitted errors inside Err", () => {
        assert.deepStrictEqual(err(0), { type: "err", error: 0 });
        assert.deepStrictEqual(err(false), { type: "err", error: false });
        assert.deepStrictEqual(err(""), { type: "err", error: "" });
        assert.deepStrictEqual(err(null), { type: "err", error: null });
        assert.deepStrictEqual(err(undefined), { type: "err", error: undefined });
        assert.deepStrictEqual(err(NaN), { type: "err", error: NaN });
        assert.deepStrictEqual(err(), { type: "err", error: undefined });
    });

    it("preserves object, array, and Error references", () => {
        const reason = { stamina: 0 };
        const reasons = ["No health", "No stamina"];
        const error = new Error("No health");

        assert.strictEqual(err(reason).error, reason);
        assert.strictEqual(err(reasons).error, reasons);
        assert.strictEqual(err(error).error, error);
    });

    it("creates a fresh wrapper for each call", () => {
        const reason = { health: 0 };
        const first = err(reason);
        const second = err(reason);

        assert.notStrictEqual(first, second);
        assert.strictEqual(first.error, second.error);
    });
});
