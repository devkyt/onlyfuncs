import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, orElse } from '../index.js';

describe("orElse", () => {
    it("keeps Some unchanged and skips the fallback", () => {
        const input = some(undefined);

        const run = orElse(() => {
            assert.fail("fallback should not run");
        });

        assert.strictEqual(run(input), input);
    });

    it("waits for None, then calls the fallback without arguments", () => {
        const zelda = some("Zelda");
        let calls = 0;

        const run = orElse((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return zelda;
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(run(none), zelda);
        assert.strictEqual(calls, 1);
        assert.strictEqual(run(none), zelda);
        assert.strictEqual(calls, 2);
    });

    it("allows the fallback to return None", () => {
        assert.strictEqual(orElse(() => none)(none), none);
    });

    it("lets fallback errors pass through unchanged", () => {
        const error = { reason: "Missing hero" };

        const run = orElse(() => {
            throw error;
        });

        assert.throws(() => run(none), actual => actual === error);
    });
});
