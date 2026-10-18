/**
 * Returns the input unchanged, preserving object references.
 *
 * @template A
 * @param {A} value - The value to return.
 * @returns {A} The original value.
 * @example
 * identity("Link"); // "Link"
 */
export const identity = (value) => value;


/**
 * Creates a function that returns the same captured value on every call.
 * Object references are preserved.
 *
 * @template A
 * @param {A} value - The value to capture.
 * @returns {() => A} The constant function.
 * @example
 * const hero = constant("Link");
 * hero(); // "Link"
 */
export const constant = (value) => () => value;


/**
 * Immediately passes a value through steps from left to right.
 * Each step receives only the previous result. With no steps, returns the input.
 * Promises are passed along without awaiting. A throw stops the remaining steps.
 *
 * @param {any} value - The input passed to the first step.
 * @param {...((value: any) => any)} functions - Steps to apply in order.
 * @returns {any} The final value, or the input if no steps are given.
 * @throws {TypeError} When a non-function step is reached.
 * @example
 * pipe(3, n => n + 1, n => n * 2); // 8
 */
export const pipe = (value, ...functions) => {
    const apply = (value, fn) => {
        if (typeof fn !=='function') {
            throw new TypeError('pipe: expected all arguments to be functions');
        }

        return fn(value)
    }

    return functions.reduce((acc, fn) => apply(acc, fn), value);
}

/**
 * Creates a function that passes its input through steps from left to right.
 * Each step receives only the previous result. With no steps, returns the input.
 * Promises are passed along without awaiting. A throw stops the remaining steps.
 *
 * @param {...((value: any) => any)} functions - Steps to apply in order.
 * @returns {(value: any) => any} The composed function.
 * @throws {TypeError} When the returned function reaches a non-function step.
 * @example
 * const calculate = flow(n => n + 1, n => n * 2);
 * calculate(3); // 8
 */
export const flow = (...functions) => (value) => pipe(value, ...functions);


/**
 * Creates a function that passes its input through steps from right to left.
 * Each step receives only the previous result. With no steps, returns the input.
 * Promises are passed along without awaiting. A throw stops the remaining steps.
 *
 * @param {...((value: any) => any)} functions - Steps to apply in reverse order.
 * @returns {(value: any) => any} The composed function.
 * @throws {TypeError} When the returned function reaches a non-function step.
 * @example
 * const calculate = compose(n => n * 2, n => n + 1);
 * calculate(3); // 8
 */
export const compose = (...functions) => flow(...functions.reverse());


/**
 * Converts a two-argument function into two successive one-argument calls.
 * Calls fn after receiving the second argument, preserving argument order.
 * Exceptions from fn propagate.
 *
 * @template A, B, R
 * @param {(first: A, second: B) => R} fn - The two-argument function.
 * @returns {(first: A) => (second: B) => R} The curried function.
 * @example
 * const subtract = curry2((a, b) => a - b);
 * subtract(10)(3); // 7
 */
export const curry2 = (fn) => (x) => (y) => fn(x, y);


/**
 * Converts a three-argument function into three successive one-argument calls.
 * Calls fn after receiving the third argument, preserving argument order.
 * Exceptions from fn propagate.
 *
 * @template A, B, C, R
 * @param {(first: A, second: B, third: C) => R} fn - The three-argument function.
 * @returns {(first: A) => (second: B) => (third: C) => R} The curried function.
 * @example
 * const cast = curry3((caster, spell, target) => `${caster}: ${spell} on ${target}`);
 * cast("Rauru")("Blizzard")("Goblin"); // "Rauru: Blizzard on Goblin"
 */
export const curry3 = (fn) => (x) => (y) => (z) => fn(x, y, z);

