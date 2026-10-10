import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of } from '../index.js';

describe("of", () => {
    it("returns a task resolving to the original value on every run", async () => {
        const link = { health: 100 };

        const task = of(link);

        assert.strictEqual(typeof task, "function");
        assert.strictEqual(await task(), link);
        assert.strictEqual(await task(), link);
    });

    it("keeps falsy values", async () => {
        assert.strictEqual(await of(0)(), 0);
        assert.strictEqual(await of(false)(), false);
        assert.strictEqual(await of("")(), "");
        assert.strictEqual(await of(null)(), null);
        assert.strictEqual(await of(undefined)(), undefined);
    });

    it("keeps a function as data without calling it", async () => {
        const value = () => {
            assert.fail("stored function should not run");
        };

        assert.strictEqual(await of(value)(), value);
    });

    it("adopts a Promise's value", async () => {
        assert.strictEqual(await of(Promise.resolve("Link"))(), "Link");
    });

    it("adopts a thenable only when executed", async () => {
        let calls = 0;
        const value = {
            then(resolve) {
                calls += 1;
                resolve("Zelda");
            },
        };
        const task = of(value);

        assert.strictEqual(calls, 0);
        assert.strictEqual(await task(), "Zelda");
        assert.strictEqual(calls, 1);
    });

    it("preserves a Promise rejection", async () => {
        const error = { reason: "Missing hero" };

        const task = of(Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });
});
