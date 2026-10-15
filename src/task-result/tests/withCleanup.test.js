import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Result from '../../result/index.js';
import { err, fromResult, ok, withCleanup } from '../index.js';

describe("withCleanup", () => {
    it("defers and repeats source and cleanup while preserving Ok identity", async () => {
        const result = Object.freeze(Result.ok({ health: 100 }));
        const calls = [];
        const task = withCleanup((...args) => {
            calls.push(["cleanup", ...args]);

            return "ignored";
        })((...args) => {
            calls.push(["source", ...args]);

            return Promise.resolve(result);
        });

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(await task(), result);
        assert.strictEqual(await task(), result);
        assert.deepStrictEqual(calls, [["source"], ["cleanup"], ["source"], ["cleanup"]]);
    });

    it("preserves an Err including undefined after successful cleanup", async () => {
        const result = Object.freeze(Result.err(undefined));
        let calls = 0;
        const task = withCleanup(() => {
            calls += 1;
        })(fromResult(result));

        assert.strictEqual(await task(), result);
        assert.strictEqual(calls, 1);
    });

    it("awaits cleanup after Ok and ignores its fulfilled value", async () => {
        const result = Object.freeze(Result.ok("Link"));
        let finishCleanup;
        const cleanup = new Promise(resolve => {
            finishCleanup = resolve;
        });
        const task = withCleanup(() => cleanup)(fromResult(result));
        const pending = task();
        let settled = false;
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(settled, false);
        finishCleanup("ignored");

        assert.strictEqual(await pending, result);
    });

    it("waits for the source and awaits cleanup even after Err", async () => {
        const result = Result.err("Missing hero");
        let finishSource;
        const source = new Promise(resolve => {
            finishSource = resolve;
        });
        let finishCleanup;
        const cleanup = new Promise(resolve => {
            finishCleanup = resolve;
        });
        let calls = 0;
        let settled = false;
        const task = withCleanup(() => {
            calls += 1;

            return cleanup;
        })(() => source);
        const pending = task();
        pending.then(() => {
            settled = true;
        });

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 0);
        assert.strictEqual(settled, false);
        finishSource(result);

        await new Promise(resolve => setImmediate(resolve));

        assert.strictEqual(calls, 1);
        assert.strictEqual(settled, false);
        finishCleanup("ignored");

        assert.strictEqual(await pending, result);
    });

    it("awaits cleanup after source rejection and preserves its reason", async () => {
        const error = { reason: "Offline" };
        let finishCleanup;
        const cleanup = new Promise(resolve => {
            finishCleanup = resolve;
        });
        let calls = 0;
        let settled = false;
        const task = withCleanup(() => {
            calls += 1;

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

        assert.strictEqual(calls, 1);
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

    it("rejects with cleanup failure after Ok", async () => {
        const error = { reason: "Cannot clean up" };
        const task = withCleanup(() => {
            throw error;
        })(ok("Link"));

        await assert.rejects(task(), actual => actual === error);
    });

    it("preserves cleanup rejection including undefined after Ok", async () => {
        const task = withCleanup(() => Promise.reject(undefined))(ok(undefined));

        await assert.rejects(task(), actual => actual === undefined);
    });

    it("aggregates an Err payload and cleanup throw in that order", async () => {
        const domainError = { reason: "Missing hero" };
        const cleanupError = { reason: "Cannot clean up" };
        const result = Result.err(domainError);
        const task = withCleanup(() => {
            throw cleanupError;
        })(fromResult(result));

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.strictEqual(error.errors.length, 2);
            assert.strictEqual(error.errors[0], domainError);
            assert.strictEqual(error.errors[1], cleanupError);

            return true;
        });
    });

    it("aggregates undefined Err payload and cleanup rejection", async () => {
        const task = withCleanup(() => Promise.reject(undefined))(err(undefined));

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.deepStrictEqual(error.errors, [undefined, undefined]);

            return true;
        });
    });

    it("aggregates source rejection and cleanup rejection in that order", async () => {
        const sourceError = { reason: "Offline" };
        const cleanupError = { reason: "Cannot clean up" };
        const source = () => Promise.reject(sourceError);
        const task = withCleanup(() => Promise.reject(cleanupError))(source);

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.strictEqual(error.errors.length, 2);
            assert.strictEqual(error.errors[0], sourceError);
            assert.strictEqual(error.errors[1], cleanupError);

            return true;
        });
    });

    it("aggregates synchronous source and cleanup throws including undefined", async () => {
        const source = () => {
            throw undefined;
        };
        const task = withCleanup(() => {
            throw undefined;
        })(source);

        await assert.rejects(task(), error => {
            assert.ok(error instanceof AggregateError);
            assert.deepStrictEqual(error.errors, [undefined, undefined]);

            return true;
        });
    });

    it("starts fresh after a previous source rejection", async () => {
        const error = { reason: "Offline" };
        const result = Result.ok("Link");
        let calls = 0;
        let cleanups = 0;
        const source = () => {
            calls += 1;

            return calls === 1 ? Promise.reject(error) : Promise.resolve(result);
        };
        const task = withCleanup(() => {
            cleanups += 1;
        })(source);

        await assert.rejects(task(), actual => actual === error);
        assert.strictEqual(await task(), result);
        assert.strictEqual(cleanups, 2);
    });
});
