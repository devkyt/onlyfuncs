import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, mapError } from '../index.js';

describe("mapError", () => {
    it("transforms an Err value without changing the input", () => {
        const input = err("No stamina");
        const result = mapError(reason => `Link: ${reason}`)(input);

        assert.deepStrictEqual(result, err("Link: No stamina"));
        assert.deepStrictEqual(input, err("No stamina"));
        assert.notStrictEqual(result, input);
    });

    it("leaves Ok unchanged and skips the callback", () => {
        const link = ok({ health: 100 });

        const run = mapError(() => {
            assert.fail("transform should not run");
        });

        assert.strictEqual(run(link), link);
    });

    it("waits for a Result, then transforms its error once", () => {
        const reason = { stamina: 0 };
        let calls = 0;

        const explain = mapError((...args) => {
            calls += 1;

            assert.strictEqual(args.length, 1);
            assert.strictEqual(args[0], reason);

            return "No stamina";
        });

        assert.strictEqual(calls, 0);
        assert.deepStrictEqual(explain(err(reason)), err("No stamina"));
        assert.strictEqual(calls, 1);
    });

    it("keeps null and undefined errors as Err", () => {
        assert.deepStrictEqual(mapError(value => value === undefined)(err(undefined)), err(true));
        assert.deepStrictEqual(mapError(() => undefined)(err("No health")), err(undefined));
        assert.deepStrictEqual(mapError(() => null)(err("No stamina")), err(null));
    });

    it("keeps the error object returned by the callback", () => {
        const reason = { health: 0 };

        assert.strictEqual(mapError(() => reason)(err("No health")).error, reason);
    });

    it("lets callback errors pass through unchanged", () => {
        const error = new Error("No health");

        const run = mapError(() => {
            throw error;
        });

        assert.throws(() => run(err("No stamina")), actual => actual === error);
    });
});
