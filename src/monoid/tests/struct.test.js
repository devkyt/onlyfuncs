import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { struct, sum, product, string, array } from '../index.js';

describe("struct", () => {
    it("combines specified fields without changing inputs", () => {
        const monoid = struct(Object.freeze({ health: sum, names: array }));
        const left = Object.freeze({ health: 10, names: Object.freeze(["Link"]), ignored: true });
        const right = Object.freeze({ health: 20, names: Object.freeze(["Zelda"]) });
        const first = monoid.combine(left, right);
        const second = monoid.combine(left, right);

        assert.deepStrictEqual(first, { health: 30, names: ["Link", "Zelda"] });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.names, left.names);
        assert.notStrictEqual(first.names, second.names);
    });

    it("provides left and right identities for the supplied field monoids", () => {
        const monoid = struct({ health: sum, name: string, items: array });
        const link = Object.freeze({ health: 100, name: "Link", items: Object.freeze(["sword"]) });

        assert.deepStrictEqual(monoid.empty(), { health: 0, name: "", items: [] });
        assert.deepStrictEqual(monoid.combine(monoid.empty(), link), link);
        assert.deepStrictEqual(monoid.combine(link, monoid.empty()), link);
    });

    it("creates fresh identity records and mutable field identities", () => {
        const monoid = struct({ items: array });
        const first = monoid.empty();
        const second = monoid.empty();

        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first.items, second.items);
        first.items.push("sword");

        assert.deepStrictEqual(second, { items: [] });
    });

    it("calls each empty operation once per invocation in schema order", () => {
        const calls = [];
        const monoid = struct({
            health: {
                combine: sum.combine,
                empty: (...args) => {
                    calls.push(["health", ...args]);

                    return 0;
                },
            },
            name: {
                combine: string.combine,
                empty: (...args) => {
                    calls.push(["name", ...args]);

                    return "";
                },
            },
        });

        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(monoid.empty(), { health: 0, name: "" });
        assert.deepStrictEqual(monoid.empty(), { health: 0, name: "" });
        assert.deepStrictEqual(calls, [["health"], ["name"], ["health"], ["name"]]);
    });

    it("captures only own enumerable string schema entries", () => {
        const fields = Object.create({ inherited: sum });
        fields.health = sum;
        fields[Symbol("ignored")] = sum;
        Object.defineProperty(fields, "hidden", { value: sum });
        const monoid = struct(fields);

        fields.health = product;
        fields.stamina = sum;

        assert.deepStrictEqual(monoid.empty(), { health: 0 });
        assert.deepStrictEqual(monoid.combine({ health: 10 }, { health: 20 }), { health: 30 });
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
        const combined = monoid.combine({ health: 10 }, { health: 20 });

        assert.deepStrictEqual(first, {});
        assert.deepStrictEqual(second, {});
        assert.deepStrictEqual(combined, {});
        assert.notStrictEqual(first, second);
        assert.notStrictEqual(first, combined);
    });

    it("propagates empty failures and skips later fields", () => {
        const error = { reason: "Cannot create identity" };
        const monoid = struct({
            health: {
                combine: sum.combine,
                empty: () => {
                    throw error;
                },
            },
            name: {
                combine: string.combine,
                empty: () => assert.fail("later field should not run"),
            },
        });

        assert.throws(() => monoid.empty(), actual => actual === error);
    });

    it("propagates combine failures", () => {
        const error = { reason: "Cannot combine" };
        const monoid = struct({
            health: {
                combine: () => {
                    throw error;
                },
                empty: () => 0,
            },
        });

        assert.throws(() => monoid.combine({ health: 1 }, { health: 2 }), actual => actual === error);
    });
});
