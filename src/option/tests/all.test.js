import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, all } from '../index.js';

describe("all", () => {
    it("collects values in order without changing the inputs", () => {
        const link = { health: 100 };
        const first = Object.freeze(some(link));
        const second = Object.freeze(some("Zelda"));
        const inputs = Object.freeze([first, second]);

        const result = all(inputs);

        assert.deepStrictEqual(result, some([link, "Zelda"]));
        assert.strictEqual(result.value[0], link);
        assert.deepStrictEqual(inputs, [some(link), some("Zelda")]);
    });

    it("returns Some of an empty array for empty input", () => {
        assert.deepStrictEqual(all([]), some([]));
    });

    it("returns the shared None when any value is missing", () => {
        assert.strictEqual(all([none, some("Link")]), none);
        assert.strictEqual(all([some("Link"), none]), none);
        assert.strictEqual(all([{ type: "none" }]), none);
    });

    it("stops reading after the first None", () => {
        const inputs = [some("Link"), none];
        Object.defineProperty(inputs, 2, {
            get() {
                assert.fail("later option should not be read");
            },
        });

        assert.strictEqual(all(inputs), none);
    });

    it("keeps falsy payloads", () => {
        const inputs = [some(0), some(false), some(""), some(null), some(undefined)];

        assert.deepStrictEqual(all(inputs), some([0, false, "", null, undefined]));
    });

    it("creates a fresh output array on each call", () => {
        const inputs = [some("Link")];
        const first = all(inputs);
        const second = all(inputs);

        assert.deepStrictEqual(first, second);
        assert.notStrictEqual(first.value, second.value);
    });
});
