import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, mapBoth } from '../index.js';

describe("mapBoth", () => {
    it("transforms value once and skips onErr", () => {
        const link = Object.freeze({ health: 100 });
        const output = { health: 80 };
        const input = Object.freeze(ok(link));
        let calls = 0;
        const run = mapBoth({
            onOk: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], link);

                return output;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        });
        const result = run(input);

        assert.deepStrictEqual(result, ok(output));
        assert.strictEqual(result.value, output);
        assert.strictEqual(calls, 1);
    });

    it("propagates onOk throws", () => {
        const error = { reason: "No stamina" };
        const run = mapBoth({
            onOk: () => {
                throw error;
            },
            onErr: () => {
                assert.fail("onErr should not run");
            },
        });

        assert.throws(() => run(ok(undefined)), actual => actual === error);
    });

    it("transforms error once and skips onOk", () => {
        const failure = Object.freeze({ action: "castSpell", code: "NO_MANA" });
        const output = { message: "Use an ether before casting" };
        const input = Object.freeze(err(failure));
        let calls = 0;
        const run = mapBoth({
            onErr: (...args) => {
                calls += 1;

                assert.strictEqual(args.length, 1);
                assert.strictEqual(args[0], failure);

                return output;
            },
            onOk: () => {
                assert.fail("onOk should not run");
            },
        });
        const result = run(input);

        assert.deepStrictEqual(result, err(output));
        assert.strictEqual(result.error, output);
        assert.strictEqual(calls, 1);
    });

    it("propagates onErr throws", () => {
        const error = { reason: "No stamina" };
        const run = mapBoth({
            onErr: () => {
                throw error;
            },
            onOk: () => {
                assert.fail("onOk should not run");
            },
        });

        assert.throws(() => run(err(undefined)), actual => actual === error);
    });

    it("wraps callback outputs without flattening", () => {
        const output = err("No health");
        const run = mapBoth({ onOk: () => output, onErr: () => undefined });

        assert.deepStrictEqual(run(ok(null)), ok(output));
        assert.deepStrictEqual(run(err(false)), err(undefined));
    });
});
