import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, flatten } from '../index.js';

describe("flatten", () => {
    it("returns the inner Some unchanged", () => {
        const link = some({ health: 100 });
        const input = Object.freeze(some(link));

        assert.strictEqual(flatten(input), link);
    });

    it("returns none for an inner or outer None", () => {
        assert.strictEqual(flatten(some(none)), none);
        assert.strictEqual(flatten(none), none);
    });

    it("removes only one layer and preserves present undefined", () => {
        const inner = some(some(undefined));

        assert.strictEqual(flatten(some(inner)), inner);
        assert.deepStrictEqual(flatten(some(some(undefined))), some(undefined));
    });
});
