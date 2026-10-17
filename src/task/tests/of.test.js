import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of } from '../index.js';

describe("of", () => {
    it("returns a task resolving to the original value on every run", async () => {
        const weapon = Object.freeze({ kind: "bow", damage: 12 });
        const task = of(weapon);
        const first = task();
        const second = task();

        assert.ok(first instanceof Promise);
        assert.ok(second instanceof Promise);
        assert.strictEqual(await first, weapon);
        assert.strictEqual(await second, weapon);
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
        assert.strictEqual(await of(Promise.resolve("attack"))(), "attack");
    });

    it("adopts a thenable only when executed", async () => {
        let calls = 0;
        const value = {
            then(resolve) {
                calls += 1;
                resolve("heal");
            },
        };
        const task = of(value);

        assert.strictEqual(calls, 0);
        assert.strictEqual(await task(), "heal");
        assert.strictEqual(calls, 1);
    });

    it("preserves a Promise rejection", async () => {
        const error = { reason: "Item unavailable" };

        const task = of(Promise.reject(error));

        await assert.rejects(task(), actual => actual === error);
    });
});
