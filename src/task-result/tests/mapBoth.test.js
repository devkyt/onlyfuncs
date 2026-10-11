import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, err, fromResult, mapBoth } from '../index.js';

describe("mapBoth", () => {
    it("transforms value once and skips onErr", async () => {
        const link = Object.freeze({ health: 100 });
        const output = { health: 80 };
        const input = Object.freeze(Result.ok(link));
        let calls = 0;
        const run = mapBoth({
            onOk: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return output;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        });
        const result = await run(fromResult(input))();

        assert.deepStrictEqual(result, Result.ok(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("propagates onOk throws", async () => {
        const error = { reason: "No stamina" };
        const run = mapBoth({
            onOk: () => {
                throw error;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        });
        const task = run(ok(undefined));

        await assert.rejects(task(), actual => actual === error);
    });

    it("transforms error once and skips onOk", async () => {
        const link = Object.freeze({ health: 100 });
        const output = { health: 80 };
        const input = Object.freeze(Result.err(link));
        let calls = 0;
        const run = mapBoth({
            onErr: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return output;
            },
            onOk: () => {
                assert.fail("onOk should not run");
            },
        });
        const result = await run(fromResult(input))();

        assert.deepStrictEqual(result, Result.err(output));
        assert.strictEqual(result.error, output);
        assert.strictEqual(calls, 1);
    });

    it("propagates onErr throws", async () => {
        const error = { reason: "No stamina" };
        const run = mapBoth({
            onErr: () => {
                throw error;
            },
            onOk: () => {
                assert.fail("onOk should not run");
            },
        });
        const task = run(err(undefined));

        await assert.rejects(task(), actual => actual === error);
    });

    it("wraps callback outputs without flattening", async () => {
        const output = Result.err("No health");
        const run = mapBoth({ onOk: () => output, onErr: () => undefined });

        assert.deepStrictEqual(await run(ok(null))(), Result.ok(output));
        assert.deepStrictEqual(await run(err(false))(), Result.err(undefined));
    });

    it("defers and repeats the source and matching callback", async () => {
        let sources = 0;
        let callbacks = 0;
        const task = mapBoth({
            onOk: value => {
                callbacks += 1;

                return value;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        })(() => {
            sources += 1;

            return Promise.resolve(Result.ok(sources));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(callbacks, 0);
        assert.deepStrictEqual(await task(), Result.ok(1));
        assert.deepStrictEqual(await task(), Result.ok(2));
        assert.strictEqual(sources, 2);
        assert.strictEqual(callbacks, 2);
    });

    it("preserves source rejection and skips both callbacks", async () => {
        const error = { reason: "Missing hero" };
        const task = mapBoth({
            onOk: () => {
                assert.fail("onOk should not run");
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });
});
