import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromPredicate } from '../index.js';

describe("fromPredicate", () => {
    it("calls the predicate once and preserves a passing value", async () => {
        const link = Object.freeze({ health: 100 });
        let calls = 0;
        const run = fromPredicate({
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

        const result = await run(link)();

        assert.strictEqual(result.value, link);
        assert.strictEqual(calls, 1);
        assert.deepStrictEqual(result, Result.ok(link));
    });

    it("calls onFalse once with the original failing value", async () => {
        const error = { reason: "No health" };
        const calls = [];
        const run = fromPredicate({
            predicate: value => {
                calls.push(["predicate", value]);

                return false;
            },
            onFalse: (...args) => {
                calls.push(["onFalse", ...args]);

                return error;
            },
        });
        const result = await run(0)();

        assert.deepStrictEqual(result, Result.err(error));
        assert.strictEqual(result.error, error);
        assert.deepStrictEqual(calls, [["predicate", 0], ["onFalse", 0]]);
    });

    it("keeps accepted undefined and a falsy failure payload", async () => {
        const run = fromPredicate({
            predicate: value => value === undefined,
            onFalse: () => false,
        });

        assert.deepStrictEqual(await run(undefined)(), Result.ok(undefined));
        assert.deepStrictEqual(await run(0)(), Result.err(false));
    });

    it("propagates predicate throws", async () => {
        const error = { reason: "No stamina" };
        const run = fromPredicate({
            predicate: () => {
                throw error;
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        await assert.rejects(run(0)(), actual => actual === error);
    });

    it("propagates onFalse throws", async () => {
        const error = { reason: "No stamina" };
        const run = fromPredicate({
            predicate: () => false,
            onFalse: () => {
                throw error;
            },
        });

        await assert.rejects(run(0)(), actual => actual === error);
    });

    it("defers callbacks and repeats them on every execution", async () => {
        let predicates = 0;
        let failures = 0;
        const task = fromPredicate({
            predicate: () => {
                predicates += 1;

                return false;
            },
            onFalse: () => {
                failures += 1;

                return failures;
            },
        })(0);

        assert.strictEqual(predicates, 0);
        assert.strictEqual(failures, 0);
        assert.deepStrictEqual(await task(), Result.err(1));
        assert.deepStrictEqual(await task(), Result.err(2));
        assert.strictEqual(predicates, 2);
        assert.strictEqual(failures, 2);
    });
});
