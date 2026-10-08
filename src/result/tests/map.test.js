import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, map } from '../index.js';

describe("map", () => {
    it("transforms an Ok value without changing the input", () => {
        const input = ok(100);
        const result = map(health => health - 10)(input);

        assert.deepStrictEqual(result, ok(90));
        assert.deepStrictEqual(input, ok(100));
        assert.notStrictEqual(result, input);
    });

    it("leaves Err unchanged and skips the callback", () => {
        const failure = err({ stamina: 0 });

        const run = map(() => {
            assert.fail("transform should not run");
        });

        assert.strictEqual(run(failure), failure);
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
        assert.deepStrictEqual(healthOf(ok(link)), ok(100));
        assert.strictEqual(calls, 1);
    });

    it("handles undefined inputs and null or undefined outputs", () => {
        assert.deepStrictEqual(map(value => value === undefined)(ok(undefined)), ok(true));
        assert.deepStrictEqual(map(() => undefined)(ok("Link")), ok(undefined));
        assert.deepStrictEqual(map(() => null)(ok("Zelda")), ok(null));
    });

    it("keeps the object returned by the callback", () => {
        const zelda = { stamina: 50 };

        assert.strictEqual(map(() => zelda)(ok("Link")).value, zelda);
    });

    it("lets callback errors throw instead of returning Err", () => {
        const error = { reason: "No stamina" };

        const run = map(() => {
            throw error;
        });

        assert.throws(() => run(ok("Link")), actual => actual === error);
    });
});
