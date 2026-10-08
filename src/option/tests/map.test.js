import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, map } from '../index.js';

describe("map", () => {
    it("transforms a present value without changing the input", () => {
        const input = some(100);
        const result = map(health => health - 10)(input);

        assert.deepStrictEqual(result, some(90));
        assert.deepStrictEqual(input, some(100));
        assert.notStrictEqual(result, input);
    });

    it("skips the transform for none", () => {
        const run = map(() => {
            assert.fail("transform should not run");
        });

        assert.strictEqual(run(none), none);
    });

    it("waits for an input, then transforms its value once", () => {
        const link = { health: 100 };
        let calls = 0;

        const healthOf = map((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, [link]);
            assert.strictEqual(args[0], link);

            return args[0].health;
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(healthOf(some(link)), some(100));
        assert.strictEqual(calls, 1);
    });

    it("handles undefined inputs and null or undefined outputs", () => {
        assert.deepStrictEqual(map(value => value === undefined)(some(undefined)), some(true));
        assert.deepStrictEqual(map(() => undefined)(some("Link")), some(undefined));
        assert.deepStrictEqual(map(() => null)(some("Zelda")), some(null));
    });

    it("keeps the object returned by the callback", () => {
        const zelda = { stamina: 50 };

        assert.strictEqual(map(() => zelda)(some("Link")).value, zelda);
    });

    it("lets callback errors pass through unchanged", () => {
        const error = { reason: "No stamina" };

        const run = map(() => {
            throw error;
        });

        assert.throws(() => run(some("Link")), actual => actual === error);
    });
});
