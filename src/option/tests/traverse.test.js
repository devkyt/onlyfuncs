import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, traverse } from '../index.js';

describe("traverse", () => {
    it("waits for inputs, then transforms each value once in order", () => {
        const link = { health: 100 };
        const zelda = { health: 80 };
        const inputs = Object.freeze([link, zelda]);
        const calls = [];

        const run = traverse((...args) => {
            assert.strictEqual(args.length, 1);
            calls.push(args[0]);

            return some(args[0].health);
        });

        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(run(inputs), some([100, 80]));
        assert.strictEqual(calls[0], link);
        assert.strictEqual(calls[1], zelda);
        assert.strictEqual(calls.length, 2);
    });

    it("returns shared None and skips later transforms", () => {
        const calls = [];

        const run = traverse(value => {
            calls.push(value);

            return value === "Zelda" ? { type: "none" } : some(value);
        });

        assert.strictEqual(run(["Link", "Zelda", "Tingle"]), none);
        assert.deepStrictEqual(calls, ["Link", "Zelda"]);
    });

    it("returns Some of an empty array without calling the transform", () => {
        const run = traverse(() => {
            assert.fail("transform should not run");
        });

        assert.deepStrictEqual(run([]), some([]));
    });

    it("preserves falsy values and object references", () => {
        const link = { health: 100 };
        const result = traverse(some)([0, false, "", null, undefined, link]);

        assert.deepStrictEqual(result, some([0, false, "", null, undefined, link]));
        assert.strictEqual(result.value[5], link);
    });

    it("repeats transforms with fresh output on each call", () => {
        let calls = 0;

        const run = traverse(value => {
            calls += 1;

            return some(value);
        });

        const first = run(["Link"]);
        const second = run(["Link"]);

        assert.strictEqual(calls, 2);
        assert.deepStrictEqual(first, second);
        assert.notStrictEqual(first.value, second.value);
    });

    it("lets transform errors throw and skips later inputs", () => {
        const error = { reason: "Missing hero" };
        const calls = [];

        const run = traverse(value => {
            calls.push(value);

            throw error;
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
