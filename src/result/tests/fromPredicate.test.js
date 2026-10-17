import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, fromPredicate } from '../index.js';

describe("fromPredicate", () => {
    it("calls the predicate once and preserves a passing value", () => {
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

        const result = run(link);

        assert.strictEqual(result.value, link);
        assert.strictEqual(calls, 1);
        assert.deepStrictEqual(result, ok(link));
    });

    it("calls onFalse once with the original failing value", () => {
        const spell = Object.freeze({ name: "Meteor", cost: 50 });
        const error = Object.freeze({ action: "castSpell", reason: "Not enough mana" });
        const calls = [];
        const run = fromPredicate({
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
        const result = run(spell);

        assert.deepStrictEqual(result, err(error));
        assert.strictEqual(result.error, error);
        assert.deepStrictEqual(calls, ["predicate", "onFalse"]);
    });

    it("keeps accepted undefined and a falsy failure payload", () => {
        const run = fromPredicate({
            predicate: value => value === undefined,
            onFalse: () => false,
        });

        assert.deepStrictEqual(run(undefined), ok(undefined));
        assert.deepStrictEqual(run(0), err(false));
    });

    it("propagates predicate throws", () => {
        const error = { reason: "No stamina" };
        const run = fromPredicate({
            predicate: () => {
                throw error;
            },
            onFalse: () => {
                assert.fail("onFalse should not run");
            },
        });

        assert.throws(() => run(0), actual => actual === error);
    });

    it("propagates onFalse throws", () => {
        const error = { reason: "No stamina" };
        const run = fromPredicate({
            predicate: () => false,
            onFalse: () => {
                throw error;
            },
        });

        assert.throws(() => run(0), actual => actual === error);
    });
});
