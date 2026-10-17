import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, zipWith } from '../index.js';

describe("zipWith", () => {
    it("combines both payloads once in left-to-right order", () => {
        const spell = Object.freeze({ name: "Fireball", damage: 20 });
        const target = Object.freeze({ name: "Goblin" });
        const cast = { spell, target };
        let calls = 0;
        const castSpell = zipWith((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 2);
            assert.strictEqual(args[0], spell);
            assert.strictEqual(args[1], target);

            return cast;
        });
        const left = Object.freeze(ok(spell));
        const right = Object.freeze(ok(target));

        assert.strictEqual(calls, 0);

        const result = castSpell(left, right);

        assert.deepStrictEqual(result, { type: "ok", value: cast });
        assert.strictEqual(result.value, cast);
        assert.strictEqual(calls, 1);
    });

    it("skips the callback if either input is Err", () => {
        const left = err("Link missing");
        const right = err("Zelda missing");
        const run = zipWith(() => {
            assert.fail("combine should not run");
        });

        assert.strictEqual(run(left, ok("Zelda")), left);
        assert.strictEqual(run(ok("Link"), right), right);
        assert.strictEqual(run(left, right), left);
    });

    it("passes nullish payloads and wraps undefined output", () => {
        const run = zipWith((left, right) => {
            assert.strictEqual(left, null);
            assert.strictEqual(right, undefined);

            return undefined;
        });

        assert.deepStrictEqual(run(ok(null), ok(undefined)), ok(undefined));
    });

    it("wraps callback output without flattening", () => {
        const output = ok("Link");
        const run = zipWith(() => output);
        const result = run(ok(0), ok(false));

        assert.strictEqual(result.value, output);
    });

    it("propagates callback throws", () => {
        const error = { reason: "No health" };
        const run = zipWith(() => {
            throw error;
        });

        assert.throws(() => run(ok(1), ok(2)), actual => actual === error);
    });
});
