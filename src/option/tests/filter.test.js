import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, filter } from '../index.js';

describe("filter", () => {
    it("keeps the original Some when the check passes", () => {
        const link = some({ health: 100 });

        assert.strictEqual(filter(value => value.health > 0)(link), link);
    });

    it("returns none when the check fails", () => {
        const input = some(0);

        assert.strictEqual(filter(health => health > 0)(input), none);
        assert.deepStrictEqual(input, some(0));
    });

    it("skips the predicate for none", () => {
        const run = filter(() => {
            assert.fail("predicate should not run");
        });

        assert.strictEqual(run(none), none);
    });

    it("waits for an input, then checks its value once", () => {
        let calls = 0;

        const hasStamina = filter((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, [50]);

            return args[0] > 0;
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(hasStamina(some(50)), some(50));
        assert.strictEqual(calls, 1);
    });

    it("can keep zero and undefined when the check passes", () => {
        const zero = some(0);
        const missing = some(undefined);

        assert.strictEqual(filter(value => value === 0)(zero), zero);
        assert.strictEqual(filter(value => value === undefined)(missing), missing);
    });

    it("lets callback errors pass through unchanged", () => {
        const error = new Error("No health");

        const run = filter(() => {
            throw error;
        });

        assert.throws(() => run(some("Link")), actual => actual === error);
    });
});
