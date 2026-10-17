import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { struct, sum, product, string, array } from '../index.js';

describe("struct", () => {
    it("combines specified fields without changing inputs", () => {
        const monoid = struct(Object.freeze({ damage: sum, actions: array }));
        const left = Object.freeze({ damage: 10, actions: Object.freeze(["Slash"]), ignored: true });
        const right = Object.freeze({ damage: 20, actions: Object.freeze(["Fireball"]) });
        const first = monoid.combine(left, right);
        const second = monoid.combine(left, right);

        assert.deepStrictEqual(first, { damage: 30, actions: ["Slash", "Fireball"] });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.actions, left.actions);
        assert.notStrictEqual(first.actions, second.actions);
    });

    it("provides left and right identities for the supplied field monoids", () => {
        const monoid = struct({ damage: sum, log: string, effects: array });
        const report = Object.freeze({ damage: 100, log: "Slash", effects: Object.freeze(["critical hit"]) });

        assert.deepStrictEqual(monoid.empty(), { damage: 0, log: "", effects: [] });
        assert.deepStrictEqual(monoid.combine(monoid.empty(), report), report);
        assert.deepStrictEqual(monoid.combine(report, monoid.empty()), report);
    });

    it("creates fresh identity records and mutable field identities", () => {
        const monoid = struct({ effects: array });
        const first = monoid.empty();
        const second = monoid.empty();

        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.effects, second.effects);
        first.effects.push("critical hit");

        assert.deepStrictEqual(second, { effects: [] });
    });

    it("calls each empty operation once per invocation in schema order", () => {
        const calls = [];
        const monoid = struct({
            damage: {
                combine: sum.combine,
                empty: (...args) => {
                    calls.push(["damage", ...args]);

                    return 0;
                },
            },
            log: {
                combine: string.combine,
                empty: (...args) => {
                    calls.push(["log", ...args]);

                    return "";
                },
            },
        });

        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(monoid.empty(), { damage: 0, log: "" });
        assert.deepStrictEqual(monoid.empty(), { damage: 0, log: "" });
        assert.deepStrictEqual(calls, [["damage"], ["log"], ["damage"], ["log"]]);
    });

    it("captures only own enumerable string schema entries", () => {
        const fields = Object.create({ inherited: sum });
        fields.damage = sum;
        fields[Symbol("ignored")] = sum;
        Object.defineProperty(fields, "hidden", { value: sum });
        const monoid = struct(fields);

        fields.damage = product;
        fields.hits = sum;

        assert.deepStrictEqual(monoid.empty(), { damage: 0 });
        assert.deepStrictEqual(monoid.combine({ damage: 10 }, { damage: 20 }), { damage: 30 });
    });

    it("treats special keys as own data properties in empty and combined records", () => {
        const monoid = struct({ ["__proto__"]: sum, constructor: string });
        const empty = monoid.empty();
        const result = monoid.combine(empty, empty);

        for (const value of [empty, result]) {
            assert.strictEqual(Object.getPrototypeOf(value), Object.prototype);
            assert.strictEqual(Object.hasOwn(value, "__proto__"), true);
            assert.strictEqual(value.__proto__, 0);
            assert.strictEqual(value.constructor, "");
        }
    });

    it("returns fresh empty records for an empty schema", () => {
        const monoid = struct({});
        const first = monoid.empty();
        const second = monoid.empty();
        const combined = monoid.combine({ damage: 10 }, { damage: 20 });

        assert.deepStrictEqual(first, {});
        assert.deepStrictEqual(second, {});
        assert.deepStrictEqual(combined, {});
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first, combined);
    });

    it("propagates empty failures and skips later fields", () => {
        const error = { reason: "Cannot create identity" };
        const monoid = struct({
            damage: {
                combine: sum.combine,
                empty: () => {
                    throw error;
                },
            },
            log: {
                combine: string.combine,
                empty: () => assert.fail("later field should not run"),
            },
        });

        assert.throws(() => monoid.empty(), actual => actual === error);
    });

    it("propagates combine failures", () => {
        const error = { reason: "Cannot combine" };
        const monoid = struct({
            damage: {
                combine: () => {
                    throw error;
                },
                empty: () => 0,
            },
        });

        assert.throws(() => monoid.combine({ damage: 1 }, { damage: 2 }), actual => actual === error);
    });
});
