import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, tapError } from '../index.js';

describe("tapError", () => {
    it("calls the effect once and preserves the original wrapper", () => {
        const failure = Object.freeze({ action: "castSpell", reason: "Cooldown" });
        const input = Object.freeze(err(failure));
        let calls = 0;
        const run = tapError((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], failure);

            return "ignored";
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(run(input), input);
        assert.strictEqual(calls, 1);
    });

    it("skips the effect for Ok", () => {
        const input = ok(undefined);
        const run = tapError(() => {
            assert.fail("effect should not run");
        });

        assert.strictEqual(run(input), input);
    });

    it("passes undefined to the effect", () => {
        let calls = 0;
        const input = err(undefined);
        const run = tapError(value => {
            calls += 1;

            assert.strictEqual(value, undefined);
        });

        assert.strictEqual(run(input), input);
        assert.strictEqual(calls, 1);
    });

    it("does not wait for a returned Promise", () => {
        const input = err("Spell on cooldown");
        const run = tapError(() => new Promise(() => {}));

        assert.strictEqual(run(input), input);
    });

    it("propagates effect throws", () => {
        const error = { reason: "Not enough mana" };
        const run = tapError(() => {
            throw error;
        });

        assert.throws(() => run(err("Spell on cooldown")), actual => actual === error);
    });
});
