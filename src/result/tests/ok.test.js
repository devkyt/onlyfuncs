import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok } from '../index.js';

describe("ok", () => {
    it("wraps a value with its own type and value properties", () => {
        const result = ok("Link");

        assert.deepStrictEqual(result, { type: "ok", value: "Link" });
        assert.strictEqual(Object.hasOwn(result, "type"), true);
        assert.strictEqual(Object.hasOwn(result, "value"), true);
    });

    it("keeps falsy and omitted values inside Ok", () => {
        assert.deepStrictEqual(ok(0), { type: "ok", value: 0 });
        assert.deepStrictEqual(ok(false), { type: "ok", value: false });
        assert.deepStrictEqual(ok(""), { type: "ok", value: "" });
        assert.deepStrictEqual(ok(null), { type: "ok", value: null });
        assert.deepStrictEqual(ok(undefined), { type: "ok", value: undefined });
        assert.deepStrictEqual(ok(NaN), { type: "ok", value: NaN });
        assert.deepStrictEqual(ok(), { type: "ok", value: undefined });
    });

    it("preserves object and array references", () => {
        const loot = { coins: 100 };
        const items = ["sword", "shield"];

        assert.strictEqual(ok(loot).value, loot);
        assert.strictEqual(ok(items).value, items);
    });

    it("creates a fresh wrapper for each call", () => {
        const loot = { coins: 50 };
        const first = ok(loot);
        const second = ok(loot);

        assert.notStrictEqual(first, second);
        assert.strictEqual(first.value, second.value);
    });
});
