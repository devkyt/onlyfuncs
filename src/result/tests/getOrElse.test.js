import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, getOrElse } from '../index.js';

describe("getOrElse", () => {
    it("unwraps Ok without calling the fallback", () => {
        const link = { health: 100 };
        const unwrap = getOrElse(() => assert.fail("fallback should not run"));

        assert.strictEqual(unwrap(ok(link)), link);
        assert.strictEqual(unwrap(ok(0)), 0);
        assert.strictEqual(unwrap(ok(false)), false);
        assert.strictEqual(unwrap(ok("")), "");
        assert.strictEqual(unwrap(ok(null)), null);
        assert.strictEqual(unwrap(ok(undefined)), undefined);
        assert.strictEqual(unwrap(ok(NaN)), NaN);
    });

    it("waits for Err, then passes its error to the fallback", () => {
        const reason = { stamina: 0 };
        let calls = 0;

        const recover = getOrElse((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, [reason]);
            assert.strictEqual(args[0], reason);

            return "Zelda";
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(recover(err(reason)), "Zelda");
        assert.strictEqual(calls, 1);
    });

    it("lets the fallback use the failure reason", () => {
        const explain = getOrElse(reason => `Link: ${reason}`);

        assert.strictEqual(explain(err("No health")), "Link: No health");
    });

    it("calls the fallback even for an undefined error", () => {
        const recover = getOrElse(reason => {
            assert.strictEqual(reason, undefined);

            return "Zelda";
        });

        assert.strictEqual(recover(err(undefined)), "Zelda");
    });

    it("returns the fallback result without wrapping it", () => {
        const zelda = { stamina: 50 };

        assert.strictEqual(getOrElse(() => zelda)(err("No stamina")), zelda);
        assert.strictEqual(getOrElse(() => undefined)(err("No health")), undefined);
    });

    it("lets fallback errors pass through unchanged", () => {
        const error = new Error("No health");

        const run = getOrElse(() => {
            throw error;
        });

        assert.throws(() => run(err("No stamina")), actual => actual === error);
    });
});
