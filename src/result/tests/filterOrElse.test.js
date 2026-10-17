import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, filterOrElse } from '../index.js';

describe("filterOrElse", () => {
    it("calls the predicate once and preserves a passing value", () => {
        const link = Object.freeze({ health: 100 });
        const input = Object.freeze(ok(link));
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

        const result = run(input);

        assert.strictEqual(result.value, link);
        assert.strictEqual(calls, 1);
        assert.strictEqual(result, input);
    });

    it("calls onFalse once with the original failing value", () => {
        const spell = Object.freeze({ name: "Meteor", cost: 50 });
        const error = Object.freeze({ action: "castSpell", reason: "Not enough mana" });
        const calls = [];
        const run = filterOrElse({
            predicate: (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], spell);
                calls.push("predicate");

                return args[0].cost <= 20;
            },
            onFalse: (...args) => {
                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], spell);
                calls.push("onFalse");

                return error;
            },
        });
        const result = run(ok(spell));

        assert.deepStrictEqual(result, err(error));
        assert.strictEqual(result.error, error);
        assert.deepStrictEqual(calls, ["predicate", "onFalse"]);
    });

    it("keeps accepted undefined and a falsy failure payload", () => {
        const run = filterOrElse({
            predicate: value => value === undefined,
            onFalse: () => false,
        });

        assert.deepStrictEqual(run(ok(undefined)), ok(undefined));
        assert.deepStrictEqual(run(ok(0)), err(false));
    });

    it("preserves Err and skips both callbacks", () => {
        const failure = Object.freeze(err(undefined));
        const run = filterOrElse({
            predicate: () => {
                assert.fail("predicate should not run");
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        assert.strictEqual(run(failure), failure);
    });

    it("propagates predicate throws", () => {
        const error = { reason: "No stamina" };
        const run = filterOrElse({
            predicate: () => {
                throw error;
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        assert.throws(() => run(ok(0)), actual => actual === error);
    });

    it("propagates onFalse throws", () => {
        const error = { reason: "No stamina" };
        const run = filterOrElse({
            predicate: () => false,
            onFalse: () => {
                throw error;
            },
        });

        assert.throws(() => run(ok(0)), actual => actual === error);
    });
});
