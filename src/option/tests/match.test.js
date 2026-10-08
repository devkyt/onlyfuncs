import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { some, none, match } from '../index.js';

describe("match", () => {
    it("waits for Some, then calls only onSome", () => {
        const link = { health: 100 };
        const zelda = { stamina: 50 };
        let calls = 0;

        const choose = match({
            onSome: (...args) => {
                calls += 1;

                assert.deepStrictEqual(args, [link]);
                assert.strictEqual(args[0], link);

                return zelda;
            },
            onNone: () => assert.fail("onNone should not run"),
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(choose(some(link)), zelda);
        assert.strictEqual(calls, 1);
    });

    it("waits for none, then calls only onNone", () => {
        const zelda = { stamina: 50 };
        let calls = 0;

        const choose = match({
            onSome: () => assert.fail("onSome should not run"),
            onNone: (...args) => {
                calls += 1;

                assert.deepStrictEqual(args, []);

                return zelda;
            },
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(choose(none), zelda);
        assert.strictEqual(calls, 1);
    });

    it("uses onSome even when the value is falsy", () => {
        const unwrap = match({
            onSome: value => value,
            onNone: () => assert.fail("onNone should not run"),
        });

        assert.strictEqual(unwrap(some(0)), 0);
        assert.strictEqual(unwrap(some(false)), false);
        assert.strictEqual(unwrap(some(null)), null);
        assert.strictEqual(unwrap(some(undefined)), undefined);
    });

    it("lets errors from either handler pass through unchanged", () => {
        const error = { reason: "No stamina" };
        const choose = match({
            onSome: () => {
                throw error;
            },
            onNone: () => {
                throw error;
            },
        });

        assert.throws(() => choose(some("Link")), actual => actual === error);
        assert.throws(() => choose(none), actual => actual === error);
    });
});
