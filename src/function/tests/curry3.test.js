import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { curry3 } from '../index.js';

describe("curry3", () => {
    it("preserves argument order", () => {
        const format = curry3((level, scope, message) =>
            `[${level}] ${scope}: ${message}`);

        assert.strictEqual(
            format("ERROR")("database")("Connection failed"),
            "[ERROR] database: Connection failed",
        );
    });

    it("reuses the first partial application independently", () => {
        const triple = curry3((a, b, c) => [a, b, c]);
        const withOne = triple(1);
        const withOneTwo = withOne(2);
        const withOneThree = withOne(3);

        assert.deepStrictEqual(withOneTwo(4), [1, 2, 4]);
        assert.deepStrictEqual(withOneThree(4), [1, 3, 4]);
        assert.deepStrictEqual(withOneTwo(4), [1, 2, 4]);
    });

    it("reuses the second partial application", () => {
        const triple = curry3((a, b, c) => [a, b, c]);
        const withOneTwo = triple(1)(2);

        assert.deepStrictEqual(withOneTwo(3), [1, 2, 3]);
        assert.deepStrictEqual(withOneTwo(4), [1, 2, 4]);
    });

    it("keeps different first arguments independent", () => {
        const triple = curry3((a, b, c) => [a, b, c]);
        const withOne = triple(1);
        const withTwo = triple(2);

        assert.deepStrictEqual(withOne(3)(4), [1, 3, 4]);
        assert.deepStrictEqual(withTwo(3)(4), [2, 3, 4]);
        assert.deepStrictEqual(withOne(3)(4), [1, 3, 4]);
    });

    it("calls the original function only at the final application", () => {
        let calls = 0;
        const add = curry3((a, b, c) => {
            calls += 1;
            return a + b + c;
        });

        assert.strictEqual(calls, 0);
        const withOne = add(1);
        assert.strictEqual(calls, 0);
        const withOneTwo = withOne(2);
        assert.strictEqual(calls, 0);
        assert.strictEqual(withOneTwo(3), 6);
        assert.strictEqual(calls, 1);
        assert.strictEqual(withOneTwo(4), 7);
        assert.strictEqual(calls, 2);
    });

    it("passes omitted arguments as undefined", () => {
        const triple = curry3((a, b, c) => [a, b, c]);

        assert.deepStrictEqual(triple()(2)(3), [undefined, 2, 3]);
        assert.deepStrictEqual(triple(1)()(3), [1, undefined, 3]);
        assert.deepStrictEqual(triple(1)(2)(), [1, 2, undefined]);
        assert.deepStrictEqual(triple()()(), [undefined, undefined, undefined]);
    });

    it("passes falsy arguments unchanged", () => {
        const triple = curry3((a, b, c) => [a, b, c]);

        assert.deepStrictEqual(triple(0)(false)(""), [0, false, ""]);
        assert.deepStrictEqual(triple(null)(undefined)(0), [null, undefined, 0]);
    });

    it("preserves argument and return references", () => {
        const first = { health: 100 };
        const second = { stamina: 50 };
        const third = { magic: 20 };
        const result = { ready: true };
        const run = curry3((a, b, c) => {
            assert.strictEqual(a, first);
            assert.strictEqual(b, second);
            assert.strictEqual(c, third);
            return result;
        });

        assert.strictEqual(run(first)(second)(third), result);
    });

    it("propagates the exact thrown value at the final application", () => {
        const error = { reason: "failed" };
        const run = curry3(() => { throw error; });
        const partial = run(1)(2);

        assert.throws(() => partial(3), actual => actual === error);
    });
});
