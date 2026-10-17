import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, zipWith } from '../index.js';

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
        const left = Object.freeze(some(spell));
        const right = Object.freeze(some(target));

        assert.strictEqual(calls, 0);

        const result = castSpell(left, right);

        assert.deepStrictEqual(result, { type: "some", value: cast });
        assert.strictEqual(result.value, cast);
        assert.strictEqual(calls, 1);
    });

    it("skips the callback if either input is None", () => {
        const run = zipWith(() => {
            assert.fail("combine should not run");
        });

        assert.strictEqual(run(none, some("Zelda")), none);
        assert.strictEqual(run(some("Link"), none), none);
        assert.strictEqual(run(none, none), none);
    });

    it("passes nullish payloads and wraps undefined output", () => {
        const run = zipWith((left, right) => {
            assert.strictEqual(left, null);
            assert.strictEqual(right, undefined);

            return undefined;
        });

        assert.deepStrictEqual(run(some(null), some(undefined)), some(undefined));
    });

    it("wraps callback output without flattening", () => {
        const output = some("Link");
        const run = zipWith(() => output);
        const result = run(some(0), some(false));

        assert.strictEqual(result.value, output);
    });

    it("propagates callback throws", () => {
        const error = { reason: "No health" };
        const run = zipWith(() => {
            throw error;
        });

        assert.throws(() => run(some(1), some(2)), actual => actual === error);
    });
});
