import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, flatMap } from '../index.js';

describe("flatMap", () => {
    it("returns the callback's Option without nesting it", () => {
        const input = some("Link");
        const zelda = some("Zelda");

        assert.strictEqual(flatMap(() => zelda)(input), zelda);
        assert.deepStrictEqual(input, some("Link"));
    });

    it("allows a present value to become none", () => {
        assert.strictEqual(flatMap(() => none)(some(0)), none);
    });

    it("skips the callback for none", () => {
        const run = flatMap(() => {
            assert.fail("callback should not run");
        });

        assert.strictEqual(run(none), none);
    });

    it("waits for an input, then calls the callback once", () => {
        const link = { stamina: 50 };
        let calls = 0;

        const staminaOf = flatMap((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, [link]);
            assert.strictEqual(args[0], link);

            return some(args[0].stamina);
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(staminaOf(some(link)), some(50));
        assert.strictEqual(calls, 1);
    });

    it("passes a present undefined to the callback", () => {
        const isUndefined = flatMap(value => some(value === undefined));

        assert.deepStrictEqual(isUndefined(some(undefined)), some(true));
    });

    it("lets callback errors pass through unchanged", () => {
        const error = new Error("No stamina");

        const run = flatMap(() => {
            throw error;
        });

        assert.throws(() => run(some("Link")), actual => actual === error);
    });
});
