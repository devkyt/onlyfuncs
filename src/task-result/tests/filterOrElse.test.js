import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, fromResult, filterOrElse } from '../index.js';

describe("filterOrElse", () => {
    it("calls the predicate once and preserves a passing value", async () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(Result.ok(link));
        let calls = 0;
        const run = filterOrElse({
            predicate: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return true;
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        assert.strictEqual(calls, 0);

        const result = await run(fromResult(input))();

        assert.strictEqual(result.value, link);
        assert.strictEqual(calls, 1);
        assert.strictEqual(result, input);
    });

    it("calls onFalse once with the original failing value", async () => {
        const error = { reason: "No health" };
        const calls = [];
        const run = filterOrElse({
            predicate: value => {
                calls.push(["predicate", value]);

                return false;
            },
            onFalse: (...args) => {
                calls.push(["onFalse", ...args]);

                return error;
            },
        });
        const result = await run(ok(0))();

        assert.deepStrictEqual(result, Result.err(error));
        assert.strictEqual(result.error, error);
        assert.deepStrictEqual(calls, [["predicate", 0], ["onFalse", 0]]);
    });

    it("keeps accepted undefined and a falsy failure payload", async () => {
        const run = filterOrElse({
            predicate: value => value === undefined,
            onFalse: () => false,
        });
        const result = await run(ok(undefined))();

        assert.deepStrictEqual(result, Result.ok(undefined));
        assert.deepStrictEqual(await run(ok(0))(), Result.err(false));
    });

    it("preserves Err and skips both callbacks", async () => {
        const failure = Object.freeze(Result.err(undefined));
        const run = filterOrElse({
            predicate: () => {
                assert.fail("predicate should not run");
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        assert.strictEqual(await run(fromResult(failure))(), failure);
    });

    it("propagates predicate throws", async () => {
        const error = { reason: "No stamina" };
        const run = filterOrElse({
            predicate: () => {
                throw error;
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });
        const task = run(ok(0));

        await assert.rejects(task(), actual => actual === error);
    });

    it("propagates onFalse throws", async () => {
        const error = { reason: "No stamina" };
        const run = filterOrElse({
            predicate: () => false,
            onFalse: () => {
                throw error;
            },
        });
        const task = run(ok(0));

        await assert.rejects(task(), actual => actual === error);
    });

    it("defers and repeats the source and callbacks", async () => {
        let sources = 0;
        let predicates = 0;
        let failures = 0;
        const task = filterOrElse({
            predicate: () => {
                predicates += 1;

                return false;
            },
            onFalse: () => {
                failures += 1;

                return failures;
            },
        })(() => {
            sources += 1;

            return Promise.resolve(Result.ok(0));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(predicates, 0);
        assert.strictEqual(failures, 0);
        assert.deepStrictEqual(await task(), Result.err(1));
        assert.deepStrictEqual(await task(), Result.err(2));
        assert.strictEqual(sources, 2);
        assert.strictEqual(predicates, 2);
        assert.strictEqual(failures, 2);
    });

    it("preserves source rejection and skips callbacks", async () => {
        const error = { reason: "Missing hero" };
        const task = filterOrElse({
            predicate: () => {
                assert.fail("predicate should not run");
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });
});
