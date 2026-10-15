import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { struct, sum, product, string } from '../index.js';

describe("struct", () => {
    it("combines specified fields into fresh records without mutating inputs", () => {
        const fields = Object.freeze({ health: sum, name: string });
        const semigroup = struct(fields);
        const left = Object.freeze({ health: 10, name: "Link", ignored: true });
        const right = Object.freeze({ health: 20, name: "Zelda", ignored: false });
        const first = semigroup.combine(left, right);
        const second = semigroup.combine(left, right);

        assert.deepStrictEqual(first, { health: 30, name: "LinkZelda" });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(first, second);
    });

    it("calls each field operation once in schema order and preserves returned references", () => {
        const link = Object.freeze({ health: 100 });
        const calls = [];
        const semigroup = struct({
            hero: {
                combine: (...args) => {
                    const [left] = args;
                    calls.push(["hero", ...args]);

                    return left;
                },
            },
            health: {
                combine: (...args) => {
                    const [left, right] = args;
                    calls.push(["health", ...args]);

                    return left + right;
                },
            },
        });
        const result = semigroup.combine({ hero: link, health: 10 }, { hero: null, health: 20 });

        assert.deepStrictEqual(calls, [["hero", link, null], ["health", 10, 20]]);
        assert.strictEqual(result.hero, link);
        assert.strictEqual(result.health, 30);
    });

    it("captures only own enumerable string fields at construction", () => {
        const fields = Object.create({ inherited: sum });
        fields.health = sum;
        fields[Symbol("ignored")] = sum;
        Object.defineProperty(fields, "hidden", { value: sum });
        const semigroup = struct(fields);

        fields.health = product;
        fields.stamina = sum;

        assert.deepStrictEqual(semigroup.combine({ health: 10 }, { health: 20 }), { health: 30 });
    });

    it("creates own data properties for special keys without changing the prototype", () => {
        const fields = { ["__proto__"]: sum, constructor: string };
        const left = { ["__proto__"]: 10, constructor: "Link" };
        const right = { ["__proto__"]: 20, constructor: "Zelda" };
        const result = struct(fields).combine(left, right);

        assert.strictEqual(Object.getPrototypeOf(result), Object.prototype);
        assert.strictEqual(Object.hasOwn(result, "__proto__"), true);
        assert.strictEqual(result.__proto__, 30);
        assert.strictEqual(result.constructor, "LinkZelda");
    });

    it("returns a fresh empty record for an empty schema", () => {
        const semigroup = struct({});
        const first = semigroup.combine({ health: 10 }, { health: 20 });
        const second = semigroup.combine({}, {});

        assert.deepStrictEqual(first, {});
        assert.deepStrictEqual(second, {});
        assert.notStrictEqual(first, second);
    });

    it("passes present undefined values to field operations", () => {
        const semigroup = struct({
            hero: {
                combine: (left, right) => {
                    assert.strictEqual(left, undefined);
                    assert.strictEqual(right, null);

                    return undefined;
                },
            },
        });

        assert.deepStrictEqual(semigroup.combine({ hero: undefined }, { hero: null }), {
            hero: undefined,
        });
    });

    it("propagates field failures and skips later operations", () => {
        const error = { reason: "No health" };
        const semigroup = struct({
            health: {
                combine: () => {
                    throw error;
                },
            },
            stamina: {
                combine: () => assert.fail("later field should not run"),
            },
        });
        const left = { health: 10, stamina: 5 };
        const right = { health: 20, stamina: 10 };

        assert.throws(() => semigroup.combine(left, right), actual => actual === error);
    });
});
