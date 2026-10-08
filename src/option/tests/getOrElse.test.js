import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, getOrElse } from '../index.js';

describe("getOrElse", () => {
    it("unwraps Some without calling the fallback", () => {
        const link = { health: 100 };
        const unwrap = getOrElse(() => assert.fail("fallback should not run"));

        assert.strictEqual(unwrap(some(link)), link);
        assert.strictEqual(unwrap(some(0)), 0);
        assert.strictEqual(unwrap(some(false)), false);
        assert.strictEqual(unwrap(some("")), "");
        assert.strictEqual(unwrap(some(null)), null);
        assert.strictEqual(unwrap(some(undefined)), undefined);
        assert.strictEqual(unwrap(some(NaN)), NaN);
    });

    it("waits for none, then calls the fallback once", () => {
        let calls = 0;

        const name = getOrElse((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return "Zelda";
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(name(none), "Zelda");
        assert.strictEqual(calls, 1);
    });

    it("returns the fallback result without wrapping it", () => {
        const zelda = { stamina: 50 };

        assert.strictEqual(getOrElse(() => zelda)(none), zelda);
        assert.strictEqual(getOrElse(() => undefined)(none), undefined);
    });

    it("lets fallback errors pass through unchanged", () => {
        const error = new Error("No health");

        const run = getOrElse(() => {
            throw error;
        });

        assert.throws(() => run(none), actual => actual === error);
    });
});
