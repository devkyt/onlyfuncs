import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, map } from '../index.js';

describe("map", () => {
    it("transforms an Ok value without changing the input", () => {
        const hero = Object.freeze({ name: "Samus", health: 40 });
        const input = Object.freeze(ok(hero));
        const heal = map(value => ({ ...value, health: value.health + 25 }));
        const result = heal(input);

        assert.deepStrictEqual(result, { type: "ok", value: { name: "Samus", health: 65 } });
        assert.strictEqual(input.value, hero);
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

            assert.strictEqual(args.length, 1);
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

    it("wraps a returned Result without flattening it", () => {
        const selected = ok({ kind: "potion", healing: 25 });
        const result = map(() => selected)(ok("potion"));

        assert.deepStrictEqual(result, { type: "ok", value: selected });
        assert.strictEqual(result.value, selected);
    });
});
