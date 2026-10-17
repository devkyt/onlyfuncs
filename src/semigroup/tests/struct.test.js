import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { struct, sum, product, string } from '../index.js';

describe("struct", () => {
    it("combines specified fields into fresh records without mutating inputs", () => {
        const fields = Object.freeze({ damage: sum, log: string });
        const combatReport = struct(fields);
        const left = Object.freeze({ damage: 10, log: "Slash. ", ignored: true });
        const right = Object.freeze({ damage: 20, log: "Fireball.", ignored: false });
        const first = combatReport.combine(left, right);
        const second = combatReport.combine(left, right);

        assert.deepStrictEqual(first, { damage: 30, log: "Slash. Fireball." });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
    });

    it("calls each field operation once in schema order and preserves returned references", () => {
        const weapon = Object.freeze({ damage: 100 });
        const calls = [];
        const semigroup = struct({
            weapon: {
                combine: (...args) => {
                    const [left] = args;
                    calls.push(["weapon", ...args]);

                    return left;
                },
            },
            damage: {
                combine: (...args) => {
                    const [left, right] = args;
                    calls.push(["damage", ...args]);

                    return left + right;
                },
            },
        });
        const result = semigroup.combine({ weapon, damage: 10 }, { weapon: null, damage: 20 });

        assert.deepStrictEqual(calls, [["weapon", weapon, null], ["damage", 10, 20]]);
        assert.strictEqual(result.weapon, weapon);
        assert.strictEqual(result.damage, 30);
    });

    it("captures only own enumerable string fields at construction", () => {
        const fields = Object.create({ inherited: sum });
        fields.damage = sum;
        fields[Symbol("ignored")] = sum;
        Object.defineProperty(fields, "hidden", { value: sum });
        const semigroup = struct(fields);

        fields.damage = product;
        fields.hits = sum;

        assert.deepStrictEqual(semigroup.combine({ damage: 10 }, { damage: 20 }), { damage: 30 });
    });

    it("creates own data properties for special keys without changing the prototype", () => {
        const fields = { ["__proto__"]: sum, constructor: string };
        const left = { ["__proto__"]: 10, constructor: "cast" };
        const right = { ["__proto__"]: 20, constructor: "Spell" };
        const result = struct(fields).combine(left, right);

        assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
        assert.strictEqual(Object.hasOwn(result, "__proto__"), true);
        assert.strictEqual(result.__proto__, 30);
        assert.strictEqual(result.constructor, "castSpell");
    });

    it("returns a fresh empty record for an empty schema", () => {
        const semigroup = struct({});
        const first = semigroup.combine({ damage: 10 }, { damage: 20 });
        const second = semigroup.combine({}, {});

        assert.deepStrictEqual(first, {});
        assert.deepStrictEqual(second, {});
        assert.notStrictEqual(first, second);
    });

    it("passes present undefined values to field operations", () => {
        const semigroup = struct({
            weapon: {
                combine: (left, right) => {
                    assert.strictEqual(left, undefined);
                    assert.strictEqual(right, null);

                    return undefined;
                },
            },
        });

        assert.deepStrictEqual(semigroup.combine({ weapon: undefined }, { weapon: null }), {
            weapon: undefined,
        });
    });

    it("propagates field failures and skips later operations", () => {
        const error = { reason: "Cannot calculate damage" };
        const semigroup = struct({
            damage: {
                combine: () => {
                    throw error;
                },
            },
            hits: {
                combine: () => assert.fail("later field should not run"),
            },
        });
        const left = { damage: 10, hits: 5 };
        const right = { damage: 20, hits: 10 };

        assert.throws(() => semigroup.combine(left, right), actual => actual === error);
    });
});
