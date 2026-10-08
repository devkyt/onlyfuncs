import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fromNullable, none } from '../index.js';

describe("fromNullable", () => {
    it("wraps a present value", () => {
        assert.deepStrictEqual(fromNullable("Link"), { type: "some", value: "Link" });
    });

    it("returns shared none for null, undefined, and omitted input", () => {
        assert.strictEqual(fromNullable(null), none);
        assert.strictEqual(fromNullable(undefined), none);
        assert.strictEqual(fromNullable(), none);
    });

    it("keeps zero, false, an empty string, and NaN inside Some", () => {
        assert.deepStrictEqual(fromNullable(0), { type: "some", value: 0 });
        assert.deepStrictEqual(fromNullable(false), { type: "some", value: false });
        assert.deepStrictEqual(fromNullable(""), { type: "some", value: "" });
        assert.deepStrictEqual(fromNullable(NaN), { type: "some", value: NaN });
    });

    it("creates new wrappers around the same object", () => {
        const link = { health: 100 };
        const first = fromNullable(link);
        const second = fromNullable(link);

        assert.strictEqual(first.value, link);
        assert.strictEqual(second.value, link);
        assert.notStrictEqual(first, second);
    });
});
