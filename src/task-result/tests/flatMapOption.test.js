import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import * as Option from '../../option/index.js';
import { ok, fromResult, flatMapOption } from '../index.js';

describe("flatMapOption", () => {
    it("calls the transform once and preserves a Some payload", async () => {
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
        const result = await run(ok(link))();

        assert.deepStrictEqual(result, Result.ok(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("passes the original value to onNone once", async () => {
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
        const result = await run(ok(link))();

        assert.deepStrictEqual(result, Result.err(error));
        assert.strictEqual(result.error, error);
        assert.strictEqual(calls, 1);
    });

    it("preserves Err and skips both callbacks", async () => {
        const failure = Object.freeze(Result.err(undefined));
        const run = flatMapOption({
            transform: () => {
                assert.fail("transform should not run");
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });

        assert.strictEqual(await run(fromResult(failure))(), failure);
    });

    it("preserves present null and undefined", async () => {
        const run = flatMapOption({
            transform: Option.some,
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });
        const result = await run(ok(undefined))();

        assert.deepStrictEqual(result, Result.ok(undefined));
        assert.deepStrictEqual(await run(ok(null))(), Result.ok(null));
    });

    it("propagates transform throws", async () => {
        const error = { reason: "No stamina" };
        const run = flatMapOption({
            transform: () => {
                throw error;
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        });
        const task = run(ok(0));

        await assert.rejects(task(), actual => actual === error);
    });

    it("propagates onNone throws", async () => {
        const error = { reason: "No stamina" };
        const run = flatMapOption({
            transform: () => Option.none,
            onNone: () => {
                throw error;
            },
        });
        const task = run(ok(0));

        await assert.rejects(task(), actual => actual === error);
    });

    it("defers and repeats the source, transform, and fallback", async () => {
        let sources = 0;
        let transforms = 0;
        let fallbacks = 0;
        const task = flatMapOption({
            transform: () => {
                transforms += 1;

                return Option.none;
            },
            onNone: value => {
                fallbacks += 1;

                return value;
            },
        })(() => {
            sources += 1;

            return Promise.resolve(Result.ok(sources));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(transforms, 0);
        assert.strictEqual(fallbacks, 0);
        assert.deepStrictEqual(await task(), Result.err(1));
        assert.deepStrictEqual(await task(), Result.err(2));
        assert.strictEqual(sources, 2);
        assert.strictEqual(transforms, 2);
        assert.strictEqual(fallbacks, 2);
    });

    it("preserves source rejection and skips both callbacks", async () => {
        const error = { reason: "Missing hero" };
        const task = flatMapOption({
            transform: () => {
                assert.fail("transform should not run");
            },
            onNone: () => {
                assert.fail("onNone should not run");
            },
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });
});
