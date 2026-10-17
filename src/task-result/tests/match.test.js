import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, err, match } from '../index.js';

describe("match", () => {
    it("lazily calls only onOk with the original payload on each run", async () => {
        const link = { health: 100 };
        let sources = 0;
        let handlers = 0;

        const run = match({
            onOk: (...args) => {
                handlers += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return args[0].health;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        });
        const task = run(() => {
            sources += 1;

            return Promise.resolve(Result.ok(link));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(handlers, 0);
        assert.strictEqual(await task(), 100);
        assert.strictEqual(await task(), 100);
        assert.strictEqual(sources, 2);
        assert.strictEqual(handlers, 2);
    });

    it("calls only onErr with the original error", async () => {
        const error = { stamina: 0 };
        const output = { health: 80 };
        let calls = 0;

        const task = match({
            onOk: () => {
                assert.fail("onOk should not run");
            },
            onErr: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], error);

                return output;
            },
        })(err(error));

        assert.strictEqual(calls, 0);
        assert.strictEqual(await task(), output);
        assert.strictEqual(calls, 1);
    });

    it("passes falsy payloads to the correct handler", async () => {
        const unwrapSuccess = match({
            onOk: value => value,
            onErr: () => assert.fail("onErr should not run"),
        });
        const unwrapFailure = match({
            onOk: () => assert.fail("onOk should not run"),
            onErr: error => error,
        });

        for (const value of [0, false, "", null, undefined, NaN]) {
            assert.strictEqual(await unwrapSuccess(ok(value))(), value);
            assert.strictEqual(await unwrapFailure(err(value))(), value);
        }
    });

    it("keeps a returned function as data", async () => {
        const value = () => {
            assert.fail("returned function should not run");
        };
        const task = match({ onOk: () => value, onErr: () => null })(ok("Link"));

        assert.strictEqual(await task(), value);
    });

    it("preserves source rejection and skips both handlers", async () => {
        const error = { reason: "Missing hero" };

        const task = match({
            onOk: () => {
                assert.fail("onOk should not run");
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects errors thrown by either selected handler", async () => {
        const error = { reason: "No stamina" };

        const run = match({
            onOk: () => {
                throw error;
            },
            onErr: () => {
                throw error;
            },
        });

        await assert.rejects(run(ok("Link"))(), actual => actual === error);
        await assert.rejects(run(err("Missing hero"))(), actual => actual === error);
    });
});
