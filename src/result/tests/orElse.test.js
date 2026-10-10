import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, orElse } from '../index.js';

describe("orElse", () => {
    it("keeps Ok unchanged and skips the fallback", () => {
        const input = ok(undefined);

        const run = orElse(() => {
            assert.fail("fallback should not run");
        });

        assert.strictEqual(run(input), input);
    });

    it("waits for Err, then passes only its error to the fallback", () => {
        const error = { stamina: 0 };
        const recovered = ok("Zelda");
        let calls = 0;

        const run = orElse((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], error);

            return recovered;
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(run(err(error)), recovered);
        assert.strictEqual(calls, 1);
        assert.strictEqual(run(err(error)), recovered);
        assert.strictEqual(calls, 2);
    });

    it("returns a replacement Err unchanged", () => {
        const replacement = err("Missing hero");

        assert.strictEqual(orElse(() => replacement)(err("No stamina")), replacement);
    });

    it("passes falsy errors to the fallback", () => {
        const run = orElse(ok);

        assert.deepStrictEqual(run(err(0)), ok(0));
        assert.deepStrictEqual(run(err(false)), ok(false));
        assert.deepStrictEqual(run(err(null)), ok(null));
        assert.deepStrictEqual(run(err(undefined)), ok(undefined));
    });

    it("lets fallback errors throw unchanged", () => {
        const error = { reason: "Missing hero" };

        const run = orElse(() => {
            throw error;
        });

        assert.throws(() => run(err("No stamina")), actual => actual === error);
    });
});
