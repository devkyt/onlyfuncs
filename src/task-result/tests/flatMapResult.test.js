import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromResult, ok, flatMapResult } from '../index.js';

describe("flatMapResult", () => {
    it("defers and repeats the source and transform", async () => {
        const link = Object.freeze({ health: 100 });
        const output = Object.freeze(Result.ok(link));
        let sources = 0;
        let transforms = 0;
        const task = flatMapResult((...args) => {
            transforms += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return output;
        })(() => {
            sources += 1;

            return Promise.resolve(Result.ok(link));
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(transforms, 0);
        assert.strictEqual(await task(), output);
        assert.strictEqual(await task(), output);
        assert.strictEqual(sources, 2);
        assert.strictEqual(transforms, 2);
    });

    it("returns the callback's Err without nesting", async () => {
        const failure = Result.err(undefined);
        const task = flatMapResult(() => failure)(ok("Link"));

        assert.strictEqual(await task(), failure);
    });

    it("preserves an existing Err and skips the callback", async () => {
        const failure = Object.freeze(Result.err(undefined));
        const task = flatMapResult(() => {
            assert.fail("transform should not run");
        })(fromResult(failure));

        assert.strictEqual(await task(), failure);
    });

    it("passes successful undefined to the callback", async () => {
        const task = flatMapResult(value => Result.ok(value === undefined))(ok(undefined));

        assert.deepStrictEqual(await task(), Result.ok(true));
    });

    it("preserves source rejection and skips the callback", async () => {
        const error = { reason: "Missing hero" };
        const task = flatMapResult(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns callback throws into rejections", async () => {
        const error = { reason: "No stamina" };
        const task = flatMapResult(() => {
            throw error;
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });
});
