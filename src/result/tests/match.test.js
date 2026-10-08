import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, match } from '../index.js';

describe("match", () => {
    it("waits for Ok, then calls only onOk", () => {
        const link = { health: 100 };
        const zelda = { stamina: 50 };
        let calls = 0;

        const choose = match({
            onOk: (...args) => {
                calls += 1;

                assert.deepStrictEqual(args, [link]);
                assert.strictEqual(args[0], link);

                return zelda;
            },
            onErr: () => assert.fail("onErr should not run"),
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(choose(ok(link)), zelda);
        assert.strictEqual(calls, 1);
    });

    it("waits for Err, then calls only onErr", () => {
        const reason = { stamina: 0 };
        const zelda = { stamina: 50 };
        let calls = 0;

        const choose = match({
            onOk: () => assert.fail("onOk should not run"),
            onErr: (...args) => {
                calls += 1;

                assert.deepStrictEqual(args, [reason]);
                assert.strictEqual(args[0], reason);

                return zelda;
            },
        });

        assert.strictEqual(calls, 0);
        assert.strictEqual(choose(err(reason)), zelda);
        assert.strictEqual(calls, 1);
    });

    it("uses onOk even when the value is falsy", () => {
        const unwrap = match({
            onOk: value => value,
            onErr: () => assert.fail("onErr should not run"),
        });

        assert.strictEqual(unwrap(ok(0)), 0);
        assert.strictEqual(unwrap(ok(false)), false);
        assert.strictEqual(unwrap(ok(null)), null);
        assert.strictEqual(unwrap(ok(undefined)), undefined);
    });

    it("uses onErr even when the error is falsy", () => {
        const unwrap = match({
            onOk: () => assert.fail("onOk should not run"),
            onErr: error => error,
        });

        assert.strictEqual(unwrap(err(0)), 0);
        assert.strictEqual(unwrap(err(false)), false);
        assert.strictEqual(unwrap(err(null)), null);
        assert.strictEqual(unwrap(err(undefined)), undefined);
    });

    it("lets errors from either handler pass through unchanged", () => {
        const error = { reason: "No stamina" };
        const choose = match({
            onOk: () => {
                throw error;
            },
            onErr: () => {
                throw error;
            },
        });

        assert.throws(() => choose(ok("Link")), actual => actual === error);
        assert.throws(() => choose(err("No health")), actual => actual === error);
    });
});
