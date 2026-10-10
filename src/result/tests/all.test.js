import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, all } from '../index.js';

describe("all", () => {
    it("collects values in order without changing the inputs", () => {
        const link = { health: 100 };
        const first = Object.freeze(ok(link));
        const second = Object.freeze(ok("Zelda"));
        const inputs = Object.freeze([first, second]);

        const result = all(inputs);

        assert.deepStrictEqual(result, ok([link, "Zelda"]));
        assert.strictEqual(result.value[0], link);
        assert.deepStrictEqual(inputs, [ok(link), ok("Zelda")]);
    });

    it("returns Ok of an empty array for empty input", () => {
        assert.deepStrictEqual(all([]), ok([]));
    });

    it("returns the first Err unchanged", () => {
        const failure = err({ stamina: 0 });

        assert.strictEqual(all([ok("Link"), failure, err("Missing hero")]), failure);
        assert.strictEqual(all([failure, ok("Link")]), failure);
    });

    it("stops reading after an Err", () => {
        const failure = err(undefined);
        const inputs = [failure];
        Object.defineProperty(inputs, 1, {
            get() {
                assert.fail("later result should not be read");
            },
        });

        assert.strictEqual(all(inputs), failure);
    });

    it("keeps falsy successful values", () => {
        const inputs = [ok(0), ok(false), ok(""), ok(null), ok(undefined)];

        assert.deepStrictEqual(all(inputs), ok([0, false, "", null, undefined]));
    });

    it("creates a fresh output array on each call", () => {
        const inputs = [ok("Link")];
        const first = all(inputs);
        const second = all(inputs);

        assert.deepStrictEqual(first, second);
        assert.notStrictEqual(first.value, second.value);
    });
});
