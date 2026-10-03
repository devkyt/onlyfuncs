import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none } from '../index.js';

describe("some", () => {
    it("wraps a value with its own type and value properties", () => {
        const option = some("Link");

        assert.deepStrictEqual(option, { type: "some", value: "Link" });
        assert.strictEqual(Object.hasOwn(option, "type"), true);
        assert.strictEqual(Object.hasOwn(option, "value"), true);
    });

    it("preserves falsy values as present values", () => {
        assert.deepStrictEqual(some(0), { type: "some", value: 0 });
        assert.deepStrictEqual(some(false), { type: "some", value: false });
        assert.deepStrictEqual(some(""), { type: "some", value: "" });
        assert.deepStrictEqual(some(null), { type: "some", value: null });
        assert.deepStrictEqual(some(undefined), { type: "some", value: undefined });
        assert.deepStrictEqual(some(NaN), { type: "some", value: NaN });
    });

    it("wraps an omitted argument as undefined", () => {
        assert.deepStrictEqual(some(), { type: "some", value: undefined });
    });

    it("preserves object and array references", () => {
        const user = { name: "Link" };
        const items = [1, 2, 3];

        assert.strictEqual(some(user).value, user);
        assert.strictEqual(some(items).value, items);
    });

    it("creates a fresh wrapper for each call", () => {
        const user = { name: "Link" };
        const first = some(user);
        const second = some(user);

        assert.notStrictEqual(first, second);
        assert.strictEqual(first.value, user);
        assert.strictEqual(second.value, user);
    });

    it("distinguishes a present undefined value from absence", () => {
        assert.notDeepStrictEqual(some(undefined), none);
    });
});
