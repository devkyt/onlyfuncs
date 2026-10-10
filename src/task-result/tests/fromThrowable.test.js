import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { fromThrowable, map } from '../index.js';

describe("fromThrowable", () => {
    it("waits for execution and calls the function without arguments each time", async () => {
        const link = { health: 100 };
        let calls = 0;

        const task = fromThrowable((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return link;
        });

        assert.strictEqual(calls, 0);

        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.ok(link));
        assert.strictEqual(first.value, link);
        assert.strictEqual(second.value, link);
        assert.strictEqual(calls, 2);
    });

    it("awaits a Promise before wrapping its value", async () => {
        const link = { health: 100 };
        const result = await fromThrowable(() => Promise.resolve(link))();

        assert.deepStrictEqual(result, Result.ok(link));
        assert.strictEqual(result.value, link);
    });

    it("keeps falsy successful values", async () => {
        assert.deepStrictEqual(await fromThrowable(() => 0)(), Result.ok(0));
        assert.deepStrictEqual(await fromThrowable(() => false)(), Result.ok(false));
        assert.deepStrictEqual(await fromThrowable(() => null)(), Result.ok(null));
        assert.deepStrictEqual(await fromThrowable(() => undefined)(), Result.ok(undefined));
    });

    it("catches a synchronous throw without changing the error", async () => {
        const error = new Error("No stamina");

        const task = fromThrowable(() => {
            throw error;
        });

        const result = await task();

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("catches rejection without changing the error", async () => {
        const error = { reason: "Missing hero" };
        const result = await fromThrowable(() => Promise.reject(error))();

        assert.strictEqual(result.type, "err");
        assert.strictEqual(result.error, error);
    });

    it("preserves thrown and rejected values that are not Errors", async () => {
        const text = await fromThrowable(() => {
            throw "No stamina";
        })();

        const zero = await fromThrowable(() => {
            throw 0;
        })();

        const nullValue = await fromThrowable(() => {
            throw null;
        })();

        const falseValue = await fromThrowable(() => Promise.reject(false))();
        const undefinedValue = await fromThrowable(() => Promise.reject(undefined))();

        assert.deepStrictEqual(text, Result.err("No stamina"));
        assert.deepStrictEqual(zero, Result.err(0));
        assert.deepStrictEqual(nullValue, Result.err(null));
        assert.deepStrictEqual(falseValue, Result.err(false));
        assert.deepStrictEqual(undefinedValue, Result.err(undefined));
    });

    it("treats a returned Error as success", async () => {
        const error = new Error("No stamina");

        const result = await fromThrowable(() => error)();

        assert.strictEqual(result.type, "ok");
        assert.strictEqual(result.value, error);
    });

    it("adopts thenables and catches their rejection", async () => {
        const error = { reason: "Missing hero" };
        const resolved = {
            then(resolve) {
                resolve("Link");
            },
        };
        const rejected = {
            then(resolve, reject) {
                reject(error);
            },
        };

        const success = await fromThrowable(() => resolved)();
        const failure = await fromThrowable(() => rejected)();

        assert.deepStrictEqual(success, Result.ok("Link"));
        assert.strictEqual(failure.type, "err");
        assert.strictEqual(failure.error, error);
    });

    it("does not catch exceptions from later transformations", async () => {
        const error = { reason: "No stamina" };
        const source = fromThrowable(() => "Link");

        const task = map(() => {
            throw error;
        })(source);

        await assert.rejects(task(), actual => actual === error);
    });
});
