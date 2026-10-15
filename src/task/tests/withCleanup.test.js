import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { of, withCleanup } from '../index.js';

describe("withCleanup", () => {
    it("defers and repeats source and cleanup without arguments", async () => {
        const calls = [];
        const link = Object.freeze({ health: 100 });
        const task = withCleanup((...args) => {
            calls.push(["cleanup", ...args]);

            return "ignored";
        })((...args) => {
            calls.push(["source", ...args]);

            return Promise.resolve(link);
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), link);
        assert.strictEqual(await task(), link);
        assert.deepStrictEqual(calls, [["source"], ["cleanup"], ["source"], ["cleanup"]]);
    });

    it("waits for the source and then for cleanup before settling", async () => {
        let finishSource;
        const source = new Promise(resolve => {
            finishSource = resolve;
        });
        let finishCleanup;
        const cleanup = new Promise(resolve => {
            finishCleanup = resolve;
        });
        let cleanupCalls = 0;
        let settled = false;
        const task = withCleanup(() => {
            cleanupCalls += 1;

            return cleanup;
        })(() => source);
        const pending = task();
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(cleanupCalls, 0);
        assert.strictEqual(settled, false);
        finishSource("Link");

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(cleanupCalls, 1);
        assert.strictEqual(settled, false);
        finishCleanup("ignored");

        assert.strictEqual(await pending, "Link");
    });

    it("awaits cleanup after source rejection and preserves the rejection", async () => {
        const error = { reason: "Missing hero" };
        let finishCleanup;
        const cleanup = new Promise(resolve => {
            finishCleanup = resolve;
        });
        let settled = false;
        let cleanupCalls = 0;
        const task = withCleanup(() => {
            cleanupCalls += 1;

            return cleanup;
        })(() => Promise.reject(error));
        const pending = task();
        pending.then(
            () => {
                settled = true;
            },
            () => {
                settled = true;
            },
        );
        const rejection = assert.rejects(pending, actual => actual === error);

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(cleanupCalls, 1);
        assert.strictEqual(settled, false);
        finishCleanup();

        await rejection;
    });

    it("cleans up after a synchronous source throw including undefined", async () => {
        let calls = 0;
        const source = () => {
            throw undefined;
        };
        const task = withCleanup(() => {
            calls += 1;
        })(source);

        await assert.rejects(task(), actual => actual === undefined);
        assert.strictEqual(calls, 1);
    });

    it("preserves a successful undefined after cleanup", async () => {
        const task = withCleanup(() => "ignored")(of(undefined));

        assert.strictEqual(await task(), undefined);
    });

    it("rejects with a cleanup throw after source success", async () => {
        const error = { reason: "Cannot clean up" };
        const task = withCleanup(() => {
            throw error;
        })(of("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves a cleanup rejection including undefined", async () => {
        const task = withCleanup(() => Promise.reject(undefined))(of("Link"));

        await assert.rejects(task(), actual => actual === undefined);
    });

    it("aggregates source rejection and cleanup throw in that order", async () => {
        const sourceError = { reason: "Missing hero" };
        const cleanupError = { reason: "Cannot clean up" };
        const source = () => Promise.reject(sourceError);
        const task = withCleanup(() => {
            throw cleanupError;
        })(source);

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.strictEqual(error.errors.length, 2);
            assert.strictEqual(error.errors[0], sourceError);
            assert.strictEqual(error.errors[1], cleanupError);

            return true;
        });
    });

    it("aggregates synchronous source failure and cleanup rejection including undefined", async () => {
        const source = () => {
            throw undefined;
        };
        const task = withCleanup(() => Promise.reject(undefined))(source);

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.deepStrictEqual(error.errors, [undefined, undefined]);

            return true;
        });
    });

    it("does not retain a previous source failure on the next run", async () => {
        const error = { reason: "Missing hero" };
        let calls = 0;
        let cleanups = 0;
        const source = () => {
            calls += 1;

            return calls === 1 ? Promise.reject(error) : Promise.resolve("Link");
        };
        const task = withCleanup(() => {
            cleanups += 1;
        })(source);

        await assert.rejects(task(), actual => actual === error);
        assert.strictEqual(await task(), "Link");
        assert.strictEqual(cleanups, 2);
    });
});
