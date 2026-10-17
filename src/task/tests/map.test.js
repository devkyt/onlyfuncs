import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, map } from '../index.js';

describe("map", () => {
    it("waits for execution and reruns the source and transform", async () => {
        const link = { health: 100 };
        let sourceCalls = 0;
        let transformCalls = 0;

        const transform = map((...args) => {
            transformCalls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], link);

            return args[0].health - 10;
        });
        const task = transform((...args) => {
            sourceCalls += 1;

            assert.deepStrictEqual(args, []);

            return Promise.resolve(link);
        });

        assert.strictEqual(sourceCalls, 0);
        assert.strictEqual(transformCalls, 0);
        assert.strictEqual(await task(), 90);
        assert.strictEqual(await task(), 90);
        assert.strictEqual(sourceCalls, 2);
        assert.strictEqual(transformCalls, 2);
        assert.deepStrictEqual(link, { health: 100 });
    });

    it("handles undefined input and preserves output references", async () => {
        const zelda = { health: 80 };

        const task = map(value => {
            assert.strictEqual(value, undefined);

            return zelda;
        })(of(undefined));

        assert.strictEqual(await task(), zelda);
        assert.strictEqual(await map(() => false)(of(0))(), false);
    });

    it("adopts a Promise returned by the transform", async () => {
        const task = map(value => Promise.resolve(value + 5))(of(10));

        assert.strictEqual(await task(), 15);
    });

    it("preserves source rejection and skips the transform", async () => {
        const error = { reason: "Missing hero" };

        const task = map(() => {
            assert.fail("transform should not run");
        })(() => Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });

    it("turns a transform throw into a rejection", async () => {
        const error = { reason: "No stamina" };

        const task = map(() => {
            throw error;
        })(of("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves a rejection returned by the transform", async () => {
        const error = new Error("No stamina");

        const task = map(() => Promise.reject(error))(of("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves a returned task as data without running it", async () => {
        const attack = () => assert.fail("returned task should not run");
        const chooseAction = map(() => attack)(of("sword"));

        assert.strictEqual(await chooseAction(), attack);
    });
});
