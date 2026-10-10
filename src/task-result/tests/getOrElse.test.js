import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, err, getOrElse } from '../index.js';

describe("getOrElse", () => {
    it("unwraps Ok and skips the fallback", async () => {
        const link = { health: 100 };

        const task = getOrElse(() => {
            assert.fail("fallback should not run");
        })(ok(link));

        assert.strictEqual(await task(), link);
    });

    it("lazily unwraps Err through the fallback on each run", async () => {
        const error = { reason: "Missing hero" };
        const zelda = { health: 80 };
        let sources = 0;
        let fallbacks = 0;

        const task = getOrElse((...args) => {
            fallbacks += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], error);

            return zelda;
        })(() => {
            sources += 1;

            return Promise.resolve(Result.err(error));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(fallbacks, 0);
        assert.strictEqual(await task(), zelda);
        assert.strictEqual(await task(), zelda);
        assert.strictEqual(sources, 2);
        assert.strictEqual(fallbacks, 2);
    });

    it("keeps falsy success and fallback values", async () => {
        const run = getOrElse(() => {
            assert.fail("fallback should not run");
        });

        assert.strictEqual(await run(ok(0))(), 0);
        assert.strictEqual(await run(ok(false))(), false);
        assert.strictEqual(await run(ok(undefined))(), undefined);
        assert.strictEqual(await getOrElse(value => value)(err(undefined))(), undefined);
    });

    it("returns a fallback function as data without executing it", async () => {
        const value = () => {
            assert.fail("returned function should not run");
        };

        assert.strictEqual(await getOrElse(() => value)(err("Missing hero"))(), value);
    });

    it("preserves source rejection and skips the fallback", async () => {
        const error = { reason: "Missing hero" };

        const task = getOrElse(() => {
            assert.fail("fallback should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a fallback throw", async () => {
        const error = { reason: "No stamina" };

        const task = getOrElse(() => {
            throw error;
        })(err("Missing hero"));

        await assert.rejects(task(), actual => actual === error);
    });
});
