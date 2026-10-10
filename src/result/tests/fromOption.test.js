import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none } from '../../option/index.js';
import { ok, err, fromOption } from '../index.js';

describe("fromOption", () => {
    it("wraps a present value and skips the error callback", () => {
        const link = { health: 100 };
        const input = some(link);

        const run = fromOption(() => {
            assert.fail("error callback should not run");
        });

        const result = run(input);

        assert.deepStrictEqual(result, ok(link));
        assert.strictEqual(result.value, link);
        assert.deepStrictEqual(input, some(link));
    });

    it("waits for None, then creates an error without arguments", () => {
        const error = { reason: "Missing hero" };
        let calls = 0;

        const run = fromOption((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return error;
        });

        assert.strictEqual(calls, 0);

        const first = run(none);

        assert.deepStrictEqual(first, err(error));
        assert.strictEqual(first.error, error);
        assert.strictEqual(calls, 1);

        const second = run(none);

        assert.deepStrictEqual(second, err(error));
        assert.strictEqual(second.error, error);
        assert.strictEqual(calls, 2);
    });

    it("keeps falsy present values inside Ok", () => {
        const run = fromOption(() => "Missing hero");

        assert.deepStrictEqual(run(some(0)), ok(0));
        assert.deepStrictEqual(run(some(false)), ok(false));
        assert.deepStrictEqual(run(some(null)), ok(null));
        assert.deepStrictEqual(run(some(undefined)), ok(undefined));
    });

    it("allows an undefined error", () => {
        assert.deepStrictEqual(fromOption(() => undefined)(none), err(undefined));
    });

    it("lets error callback exceptions throw unchanged", () => {
        const error = new Error("Missing hero");

        const run = fromOption(() => {
            throw error;
        });

        assert.throws(() => run(none), actual => actual === error);
    });
});
