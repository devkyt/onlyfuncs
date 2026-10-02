import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {constant, flow, identity, pipe} from './index.js';

describe("identity", () => {
    it("returns the same value for simple inputs", () => {
        assert.strictEqual(identity(1), 1);
        assert.strictEqual(identity("link"), "link");
        assert.strictEqual(identity(true), true);
    })

    it("returns the same value for complex inputs", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(identity(ob), ob);
        assert.strictEqual(identity(arr), arr);
    })

    it("return the same value for falsy inputs", () => {
        assert.strictEqual(identity(0), 0);
        assert.strictEqual(identity(""), "");
        assert.strictEqual(identity(false), false);
        assert.strictEqual(identity(null), null);
        assert.strictEqual(identity(undefined), undefined);
        assert.strictEqual(identity(), undefined);
    })
})


describe("constant", () => {
    it("returns the same simple value without input", () => {
        assert.strictEqual(constant(1)(), 1);
        assert.strictEqual(constant("link")(), "link");
        assert.strictEqual(constant(true)(), true);
    })

    it("returns the same simple value with input", () => {
        assert.strictEqual(constant(1)(42), 1);
        assert.strictEqual(constant("link")("zelda"), "link");
        assert.strictEqual(constant(true)(false), true);
    })

    it("returns the same complex value without input", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(constant(ob)(), ob);
        assert.strictEqual(constant(arr)(), arr);
    })

    it("returns the same complex value with input", () => {
        const ob = {"health": 100};
        const arr = [1, 2, 3];

        assert.strictEqual(constant(ob)({"health": 50}), ob);
        assert.strictEqual(constant(arr)([0,0]), arr);
    })

    it("returns falsy values without input", () => {
        assert.strictEqual(constant(0)(), 0);
        assert.strictEqual(constant("")(), "");
        assert.strictEqual(constant(false)(), false);
        assert.strictEqual(constant(null)(), null);
        assert.strictEqual(constant(undefined)(), undefined);
        assert.strictEqual(constant()(), undefined);
    })

    it("returns falsy values with input", () => {
        assert.strictEqual(constant(0)(42), 0);
        assert.strictEqual(constant("")("zelda"), "");
        assert.strictEqual(constant(false)(true), false);
        assert.strictEqual(constant(null)(undefined), null);
        assert.strictEqual(constant(undefined)(null), undefined);
        assert.strictEqual(constant()(null), undefined);
    })

    it("has independent states", () => {
        const health = constant("health");
        const stamina = constant("stamina");

        assert.strictEqual(health(), "health");
        assert.strictEqual(stamina(), "stamina");
    })
})


describe("pipe", () => {
    it("applied in order from left to right", () => {
        const bigLink = pipe(
            "  link ",
            value => value.toLowerCase(),
            value => value.trim(),
            value => value.toUpperCase(),
        );

        const ten = pipe(2,
            value => value + 3,
            value => value * 2);

        assert.strictEqual(bigLink, "LINK");
        assert.strictEqual(ten, 10);
    })

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };

        assert.strictEqual(pipe(input), input);
    })

    it("returns the result of a single step", () => {
        assert.strictEqual(pipe(3, value => value + 1), 4);
    })

    it("passes zero to the next step", () => {
        const one = pipe(5, () => 0, value => value + 1);

        assert.strictEqual(one, 1);
    })

    it("propagates the exact thrown value and skips later steps", () => {
        const error = new Error("failed");
        let laterStepRan = false;

        assert.throws(
            () => pipe(
                42,
                () => { throw error; },
                () => { laterStepRan = true; },
            ),
            actual => actual === error,
        );

        assert.strictEqual(laterStepRan, false);
    })

    it("throws TypeError for a non-function step", () => {
        assert.throws(() => pipe(2, null), TypeError);
    })
})


describe("flow", () => {
    it("creates pipeline applied in order from left to right", () => {
        const bigLink = flow(
            value => value.toLowerCase(),
            value => value.trim(),
            value => value.toUpperCase(),
        );

        const ten = flow(
            value => value + 3,
            value => value * 2);

        assert.strictEqual(bigLink("   Link   "), "LINK");
        assert.strictEqual(ten(2), 10);
    })

    it("returns the original input when there are no steps", () => {
        const input = { health: 100 };
        const empty = flow();

        assert.strictEqual(empty(input), input);
    })

    it("passes zero to the next step", () => {
        const one = flow(() => 0, value => value + 1);

        assert.strictEqual(one(5), 1);
    })

    it("reuses the same pipeline with different inputs", () => {
        const calculate = flow(value => value + 3, value => value * 2);

        assert.strictEqual(calculate(2), 10);
        assert.strictEqual(calculate(5), 16);
    })

    it("returns the result of a single step", () => {
        const addOne = flow(value => value + 1);

        assert.strictEqual(addOne(3), 4);
    })

    it("runs steps only when the pipeline is called", () => {
        let calls = 0;

        const run = flow(value => {
            calls += 1;
            return value;
        });

        assert.strictEqual(calls, 0);
        run(42);
        assert.strictEqual(calls, 1);
    })

    it("propagates the exact thrown value and skips later steps", () => {
        const error = new Error("failed");

        let laterStepRan = false;

        const run = flow(
            () => { throw error; },
            () => { laterStepRan = true; },
        );

        assert.throws(() => run(42), actual => actual === error);
        assert.strictEqual(laterStepRan, false);
    })

    it("throws TypeError for an invalid step when called", () => {
        const run = flow(null);

        assert.throws(() => run(2), TypeError);
    })
})
