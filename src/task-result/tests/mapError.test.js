import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, mapError } from '../index.js';

describe("mapError", () => {
    it("lazily transforms Err and repeats the work on each run", async () => {
        const error = { stamina: 0 };
        const replacement = { reason: "No stamina" };
        const input = Result.err(error);
        let sources = 0;
        let transforms = 0;

        const task = mapError((...args) => {
            transforms += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], error);

            return replacement;
        })(() => {
            sources += 1;

            return Promise.resolve(input);
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(transforms, 0);

        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.err(replacement));
        assert.strictEqual(first.error, replacement);
        assert.strictEqual(second.error, replacement);
        assert.strictEqual(sources, 2);
        assert.strictEqual(transforms, 2);
        assert.strictEqual(input.error, error);
    });

    it("preserves Ok identity and skips the transform", async () => {
        const input = Result.ok(undefined);

        const task = mapError(() => {
            assert.fail("transform should not run");
        })(() => Promise.resolve(input));

        assert.strictEqual(await task(), input);
    });

    it("transforms an undefined error and keeps a falsy replacement", async () => {
        const task = mapError(value => {
            assert.strictEqual(value, undefined);

            return false;
        })(err(undefined));

        assert.deepStrictEqual(await task(), Result.err(false));
    });

    it("does not transform Promise rejections", async () => {
        const error = { reason: "Missing hero" };

        const task = mapError(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a transform throw instead of returning Err", async () => {
        const error = { reason: "No stamina" };

        const task = mapError(() => {
            throw error;
        })(err("Missing hero"));

        await assert.rejects(task(), actual => actual === error);
    });
});
