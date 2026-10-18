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
 * Creates a function that always returns the captured value.
 * Each call returns the same value without cloning it.
 *
 * @template A
 * @param {A} value - The value to capture.
 * @returns {function(): A} A function returning the captured value.
 * @example
 * const hero = constant("Link");
 * hero(); // "Link"
 */
export const constant = (value) => () => value;


/**
 * Passes a value through functions from left to right, immediately.
 * Each function receives only the previous result. With no functions,
 * returns the original value. Promises are passed along without awaiting.
 * Exceptions propagate and prevent later functions from running.
 *
 * @param {*} value - The input passed to the first step.
 * @param {...function(*): *} functions - Steps called left to right,
 * each receiving the previous result.
 * @returns {*} The last result, or the initial value when no functions are given.
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
 * Creates a reusable function that runs steps from left to right.
 * Steps run only when the returned function is called. Each step receives
 * only the previous result. With no steps, returns its input unchanged.
 * Promises are passed along without awaiting. Exceptions propagate and
 * prevent later steps from running.
 *
 * @param {...function(*): *} functions - Steps called left to right,
 * each receiving the previous result.
 * @returns {function(*): *} A function passing its input through the steps
 * and returning the last result, or its input when no steps are given.
 * @throws {TypeError} When the returned function reaches a non-function step.
 * @example
 * const calculate = flow(n => n + 1, n => n * 2);
 * calculate(3); // 8
 */
export const flow = (...functions) => (value) => pipe(value, ...functions);


/**
 * Creates a reusable function that runs steps from right to left.
 * Steps run only when the returned function is called. Each step receives
 * only the previous result. With no steps, returns its input unchanged.
 * Promises are passed along without awaiting. Exceptions propagate and
 * prevent remaining steps from running.
 *
 * @param {...function(*): *} functions - Steps called right to left,
 * each receiving the previous result.
 * @returns {function(*): *} A function passing its input through the steps
 * and returning the last result, or its input when no steps are given.
 * @throws {TypeError} When the returned function reaches a non-function step.
 * @example
 * const calculate = compose(n => n * 2, n => n + 1);
 * calculate(3); // 8
 */
export const compose = (...functions) => flow(...functions.reverse());


/**
 * Converts a two-argument function into two successive one-argument calls.
 * Preserves argument order and calls fn only at the second application.
 * Exceptions from fn propagate at that point.
 *
 * @template A, B, R
 * @param {function(A, B): R} fn - Called with both arguments after the
 * second application.
 * @returns {function(A): function(B): R} A function accepting the first
 * argument, then the second, and returning fn's result.
 * @example
 * const subtract = curry2((a, b) => a - b);
 * subtract(10)(3); // 7
 */
export const curry2 = (fn) => (x) => (y) => fn(x, y);


/**
 * Converts a three-argument function into three successive one-argument calls.
 * Preserves argument order and calls fn only at the third application.
 * Exceptions from fn propagate at that point.
 *
 * @template A, B, C, R
 * @param {function(A, B, C): R} fn - Called with all three arguments after
 * the third application.
 * @returns {function(A): function(B): function(C): R} A function accepting
 * the first, second, and third arguments in successive calls, then returning
 * fn's result.
 * @example
 * const cast = curry3((caster, spell, target) => `${caster}: ${spell} on ${target}`);
 * cast("Rauru")("Blizzard")("Goblin"); // "Rauru: Blizzard on Goblin"
 */
export const curry3 = (fn) => (x) => (y) => (z) => fn(x, y, z);

