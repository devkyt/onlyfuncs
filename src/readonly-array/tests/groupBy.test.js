import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { groupBy } from '../index.js';

describe("groupBy", () => {
    it("preserves first-seen key order and element order within each group", () => {
        const sword = Object.freeze({ name: "sword", slot: "hand" });
        const helmet = Object.freeze({ name: "helmet", slot: "head" });
        const shield = Object.freeze({ name: "shield", slot: "hand" });
        const calls = [];
        const groupEquipment = groupBy((...args) => {
            const [item] = args;
            calls.push(args);

            return item.slot;
        });
        const result = groupEquipment(Object.freeze([sword, helmet, shield]));

        assert.deepStrictEqual(result, new Map([
            ["hand", [sword, shield]],
            ["head", [helmet]],
        ]));
        assert.deepStrictEqual(calls, [[sword], [helmet], [shield]]);
        assert.strictEqual(result.get("hand")[0], sword);
        assert.strictEqual(result.get("head")[0], helmet);
        assert.strictEqual(result.get("hand")[1], shield);
    });

    it("uses Map equality for object, NaN, and zero keys", () => {
        const first = {};
        const second = {};
        const result = groupBy(value => value)([first, second, first, NaN, NaN, -0, 0]);

        assert.strictEqual(result.size, 4);
        assert.deepStrictEqual(result.get(first), [first, first]);
        assert.deepStrictEqual(result.get(second), [second]);
        assert.deepStrictEqual(result.get(NaN), [NaN, NaN]);
        assert.deepStrictEqual(result.get(0), [-0, 0]);
    });

    it("supports special string keys without object-property collisions", () => {
        const result = groupBy(value => value)(["__proto__", "constructor", "__proto__"]);

        assert.deepStrictEqual([...result], [
            ["__proto__", ["__proto__", "__proto__"]],
            ["constructor", ["constructor"]],
        ]);
    });

    it("creates fresh Maps and groups for every call", () => {
        const run = groupBy(() => "heroes");
        const first = run(["Link"]);
        const second = run(["Link"]);

        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.get("heroes"), second.get("heroes"));
    });

    it("returns fresh empty Maps without calling the selector", () => {
        const run = groupBy(() => {
            assert.fail("selector should not run");
        });
        const first = run([]);
        const second = run([]);

        assert.deepStrictEqual(first, new Map());
        assert.deepStrictEqual(second, new Map());
        assert.notStrictEqual(first, second);
    });

    it("visits holes as undefined and retains nullish values", () => {
        const values = [undefined, , null];
        const result = groupBy(value => value)(values);

        assert.deepStrictEqual([...result], [[undefined, [undefined, undefined]], [null, [null]]]);
    });

    it("propagates selector throws and stops visiting input", () => {
        const error = { reason: "Missing hero" };
        const calls = [];
        const run = groupBy(value => {
            calls.push(value);

            throw error;
        });

        assert.throws(() => run(["Link", "Zelda"]), actual => actual === error);
        assert.deepStrictEqual(calls, ["Link"]);
    });
});
