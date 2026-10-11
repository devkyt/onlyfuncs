import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, toArray } from '../index.js';

describe("toArray", () => {
    it("puts the Some payload in a fresh array", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(some(link));
        const first = toArray(input);
        const second = toArray(input);

        assert.deepStrictEqual(first, [link]);
        assert.deepStrictEqual(second, [link]);
        assert.strictEqual(first[0], link);
        assert.notStrictEqual(first, second);
    });

    it("returns a fresh empty array for None", () => {
        const first = toArray(none);
        const second = toArray(none);

        assert.deepStrictEqual(first, []);

        first.push("Link");

        assert.deepStrictEqual(second, []);
        assert.notStrictEqual(first, second);
    });

    it("keeps null and undefined as actual elements", () => {
        assert.deepStrictEqual(toArray(some(null)), [null]);
        assert.deepStrictEqual(toArray(some(undefined)), [undefined]);
    });
});
