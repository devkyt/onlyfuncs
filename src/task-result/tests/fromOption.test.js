import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Option from '../../option/index.js';
import * as Result from '../../result/index.js';
import { fromOption } from '../index.js';

describe("fromOption", () => {
    it("converts Some and preserves its payload without calling onNone", async () => {
        const spell = Object.freeze({ name: "Cure", cost: 8 });
        const run = fromOption(() => {
            assert.fail("onNone should not run");
        });
        const result = await run(Object.freeze(Option.some(spell)))();

        assert.deepStrictEqual(result, Result.ok(spell));
        assert.strictEqual(result.value, spell);
        assert.deepStrictEqual(await run(Option.some(null))(), Result.ok(null));
        assert.deepStrictEqual(await run(Option.some(undefined))(), Result.ok(undefined));
    });

    it("defers onNone and calls it without arguments once per execution", async () => {
        const error = { reason: "Spell unavailable" };
        let calls = 0;
        const task = fromOption((...args) => {
            calls += 1;

            assert.deepStrictEqual(args, []);

            return error;
        })(Option.none);

        assert.strictEqual(calls, 0);

        const first = await task();
        const second = await task();

        assert.deepStrictEqual(first, Result.err(error));
        assert.strictEqual(first.error, error);
        assert.strictEqual(second.type, "err");
        assert.strictEqual(second.error, error);
        assert.strictEqual(calls, 2);
    });

    it("keeps a falsy error payload", async () => {
        const task = fromOption(() => undefined)(Option.none);

        assert.deepStrictEqual(await task(), Result.err(undefined));
    });

    it("turns onNone throws into rejections", async () => {
        const error = { reason: "Spell unavailable" };
        const task = fromOption(() => {
            throw error;
        })(Option.none);

        await assert.rejects(task(), actual => actual === error);
    });
});
