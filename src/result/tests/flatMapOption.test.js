import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Option from '../../option/index.js';
import { ok, err, flatMapOption } from '../index.js';

describe("flatMapOption", () => {
    it("calls the transform once and preserves a Some payload", () => {
        const link = Object.freeze({ health: 100 });
        const output = { health: 80 };
        let calls = 0;
        const run = flatMapOption({
            transform: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return Option.some(output);
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });
        const result = run(ok(link));

        assert.deepStrictEqual(result, ok(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("passes the original value to onNone once", () => {
        const link = { health: 0 };
        const error = { reason: "No health" };
        let calls = 0;
        const run = flatMapOption({
            transform: () => Option.none,
            onNone: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return error;
            },
        });
        const result = run(ok(link));

        assert.deepStrictEqual(result, err(error));
        assert.strictEqual(result.error, error);
        assert.strictEqual(calls, 1);
    });

    it("preserves Err and skips both callbacks", () => {
        const failure = Object.freeze(err(undefined));
        const run = flatMapOption({
            transform: () => {
                assert.fail("transform should not run");
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });

        assert.strictEqual(run(failure), failure);
    });

    it("preserves present null and undefined", () => {
        const run = flatMapOption({
            transform: Option.some,
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });

        assert.deepStrictEqual(run(ok(undefined)), ok(undefined));
        assert.deepStrictEqual(run(ok(null)), ok(null));
    });

    it("propagates transform throws", () => {
        const error = { reason: "No stamina" };
        const run = flatMapOption({
            transform: () => {
                throw error;
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });

        assert.throws(() => run(ok(0)), actual => actual === error);
    });

    it("propagates onNone throws", () => {
        const error = { reason: "No stamina" };
        const run = flatMapOption({
            transform: () => Option.none,
            onNone: () => {
                throw error;
            },
        });

        assert.throws(() => run(ok(0)), actual => actual === error);
    });
});
