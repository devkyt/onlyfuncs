import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { ok, map } from '../index.js';

describe("map", () => {
    it("lazily transforms Ok and repeats the work on each run", async () => {
        const link = { health: 100 };
        const input = Result.ok(link);
        let sources = 0;
        let transforms = 0;

        const run = map((...args) => {
            transforms += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return args[0].health - 10;
        });
        const task = run(() => {
            sources += 1;

            return Promise.resolve(input);
        });

        assert.strictEqual(sources, 0);
        assert.strictEqual(transforms, 0);
        assert.deepStrictEqual(await task(), Result.ok(90));
        assert.deepStrictEqual(await task(), Result.ok(90));
        assert.strictEqual(sources, 2);
        assert.strictEqual(transforms, 2);
        assert.deepStrictEqual(input, Result.ok({ health: 100 }));
    });

    it("preserves Err identity and skips the transform", async () => {
        const failure = Result.err(undefined);

        const task = map(() => {
            assert.fail("transform should not run");
        })(() => Promise.resolve(failure));

        assert.strictEqual(await task(), failure);
    });

    it("passes undefined to the transform and preserves its output reference", async () => {
        const link = { health: 100 };

        const task = map(value => {
            assert.strictEqual(value, undefined);

            return link;
        })(ok(undefined));

        const result = await task();
        const falsyResult = await map(() => false)(ok(0))();

        assert.deepStrictEqual(result, Result.ok(link));
        assert.strictEqual(result.value, link);
        assert.deepStrictEqual(falsyResult, Result.ok(false));
    });

    it("preserves source rejection and skips the transform", async () => {
        const error = { reason: "Missing hero" };

        const task = map(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("rejects a transform throw instead of returning Err", async () => {
        const error = { reason: "No stamina" };

        const task = map(() => {
            throw error;
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("keeps a returned Result nested inside Ok", async () => {
        const payload = Result.err("No stamina");

        const result = await map(() => payload)(ok("Link"))();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, payload);
    });
});
