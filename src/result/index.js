import * as Option from "../option/index.js";

/**
 * A successful value.
 *
 * @template A
 * @typedef {Object} Ok
 * @property {"ok"} type - Identifies success.
 * @property {A} value - The successful payload.
 */

/**
 * A failure value. Its payload need not be an Error instance.
 *
 * @template E
 * @typedef {Object} Err
 * @property {"err"} type - Identifies failure.
 * @property {E} error - The failure payload.
 */

/**
 * The outcome of an operation that may succeed or fail.
 *
 * @template A, E
 * @typedef {Ok<A> | Err<E>} Result
 */


/**
 * Wraps a successful value without inspecting, cloning, or awaiting it.
 *
 * @template A
 * @param {A} value - The successful payload, including null or undefined.
 * @returns {Ok<A>} A new Ok.
 * @example
 * ok("Link"); // { type: "ok", value: "Link" }
 */
export const ok = (value) => ({ type: "ok", value: value });


/**
 * Wraps a failure payload without inspecting or cloning it.
 *
 * @template E
 * @param {E} error - Any failure value; an Error instance is not required.
 * @returns {Err<E>} A new Err.
 * @example
 * err("No stamina"); // { type: "err", error: "No stamina" }
 */
export const err = (error) => ({ type: "err", error: error });


/**
 * Checks whether a Result is Ok, regardless of its payload's truthiness.
 *
 * @template A, E
 * @param {Result<A, E>} result - The Result to inspect, not an arbitrary value.
 * @returns {result is Ok<A>} Whether the result has the Ok tag.
 * @example
 * isOk(ok(undefined)); // true
 */
export const isOk = (result) => result.type === "ok";


/**
 * Checks whether a Result is Err, regardless of its payload's truthiness.
 *
 * @template A, E
 * @param {Result<A, E>} result - The Result to inspect, not an arbitrary value.
 * @returns {result is Err<E>} Whether the result has the Err tag.
 * @example
 * isErr(err(false)); // true
 */
export const isErr = (result) => result.type === "err";


/**
 * Wraps a non-nullish value in Ok or builds Err for null and undefined.
 * The error callback runs only for a missing value. Exceptions propagate.
 *
 * @template E
 * @param {(value: null | undefined) => E} onNull - Receives the original null or undefined.
 * @returns {<A>(value: A) => Result<NonNullable<A>, E>} A function wrapping a possibly missing value.
 * @example
 * fromNullable(() => "Missing hero")(null); // { type: "err", error: "Missing hero" }
 */
export const fromNullable = (onNull) => (value) =>
    value !== null && value !== undefined ? ok(value) : err(onNull(value));


/**
 * Returns Ok when the predicate passes, otherwise Err from onFalse.
 * Tests the input even when it is undefined. Callback exceptions propagate.
 *
 * @template A, E
 * @param {Object} options - The check and its failure handler.
 * @param {(value: A) => boolean} options.predicate - Called once with the input value.
 * @param {(value: A) => E} options.onFalse - Receives the same value only when the check fails.
 * @returns {(value: A) => Result<A, E>} A function testing and wrapping a value.
 * @example
 * const alive = fromPredicate({ predicate: health => health > 0, onFalse: () => "Defeated" });
 * alive(0); // { type: "err", error: "Defeated" }
 */
export const fromPredicate = ({ predicate, onFalse }) => (value) =>
    predicate(value) ? ok(value) : err(onFalse(value));


/**
 * Converts Some to Ok or computes an error for None.
 * Some payloads are preserved, including null and undefined. Exceptions propagate.
 *
 * @template E
 * @param {() => E} onNone - Called without arguments only for None.
 * @returns {<A>(option: import("../option/index.js").Option<A>) => Result<A, E>}
 * A function converting an Option.
 * @example
 * fromOption(() => "Missing hero")(Option.none); // { type: "err", error: "Missing hero" }
 */
export const fromOption = (onNone) => (option) =>
    Option.isSome(option) ? ok(option.value) : err(onNone());


/**
 * Runs a function immediately, wrapping its return value in Ok or a throw in Err.
 * Preserves thrown values exactly. Does not await promises or catch rejections;
 * use TaskResult.fromThrowable for asynchronous operations.
 *
 * @template A
 * @param {() => A} func - Called once without arguments, immediately.
 * @returns {Result<A, unknown>} Ok with the return value, or Err with the thrown value.
 * @example
 * fromThrowable(() => JSON.parse('"Link"')); // { type: "ok", value: "Link" }
 * fromThrowable(() => { throw "No stamina"; }); // { type: "err", error: "No stamina" }
 */
export const fromThrowable = (func) => {
    try {
        return ok(func());
    } catch (error) {
        return err(error);
    }
}


/**
 * Transforms an Ok value; preserves Err. Wraps the output without flattening
 * or awaiting it. Callback exceptions propagate.
 *
 * @template A, B
 * @param {(value: A) => B} transform - Receives the entire Ok payload.
 * @returns {<E>(result: Result<A, E>) => Result<B, E>} A function mapping Ok values.
 * @example
 * map(health => health + 1)(ok(3)); // { type: "ok", value: 4 }
 * map(health => ok(health + 1))(ok(3));
 * // { type: "ok", value: { type: "ok", value: 4 } }
 */
export const map = (transform) => (result) =>
    isOk(result) ? ok(transform(result.value)) : result;


/**
 * Transforms an Err value; preserves Ok.
 * Callback exceptions propagate instead of becoming Err.
 *
 * @template E, F
 * @param {(error: E) => F} transform - Receives the original error payload.
 * @returns {<A>(result: Result<A, E>) => Result<A, F>} A function mapping Err values.
 * @example
 * mapError(message => `Failed: ${message}`)(err("No stamina"));
 * // { type: "err", error: "Failed: No stamina" }
 */
export const mapError = (transform) => (result) =>
    isErr(result) ? err(transform(result.error)) : result;


/**
 * Transforms the matching branch, keeping its Ok or Err tag.
 * Wraps the callback's output without flattening or awaiting it. Exceptions propagate.
 *
 * @template A, B, E, F
 * @param {Object} handlers - A transform for each branch.
 * @param {(value: A) => B} handlers.onOk - Called with the successful payload for Ok.
 * @param {(error: E) => F} handlers.onErr - Called with the error payload for Err.
 * @returns {(result: Result<A, E>) => Result<B, F>} A function mapping either branch.
 * @example
 * mapBoth({ onOk: health => health + 1, onErr: String })(ok(3));
 * // { type: "ok", value: 4 }
 */
export const mapBoth = ({ onOk, onErr }) => (result) =>
    isOk(result) ? ok(onOk(result.value)) : err(onErr(result.error));


/**
 * Chains an Ok value into another Result; preserves an existing Err.
 * Returns the callback's Result directly. Callback exceptions propagate.
 *
 * @template A, B, F
 * @param {(value: A) => Result<B, F>} transform - Receives the Ok payload and returns a Result.
 * @returns {<E>(result: Result<A, E>) => Result<B, E | F>} A function chaining Results.
 * @example
 * flatMap(health => health > 0 ? ok(health) : err("Defeated"))(ok(0));
 * // { type: "err", error: "Defeated" }
 */
export const flatMap = (transform) => (result) =>
    isOk(result) ? transform(result.value) : result;



/**
 * Transforms Ok into an Option, converting Some to Ok and None to a computed Err.
 * Preserves an existing Err and skips both callbacks. Exceptions propagate.
 *
 * @template A, B, F
 * @param {Object} options - The Option-producing transform and missing-value handler.
 * @param {(value: A) => import("../option/index.js").Option<B>} options.transform -
 * Receives the Ok payload and returns an Option.
 * @param {(value: A) => F} options.onNone - Receives the original Ok payload if the Option is None.
 * @returns {<E>(result: Result<A, E>) => Result<B, E | F>} A function chaining an Option operation.
 * @example
 * const heroName = flatMapOption({
 *     transform: hero => Option.fromNullable(hero.name),
 *     onNone: () => "Missing name",
 * });
 * heroName(ok({})); // { type: "err", error: "Missing name" }
 */
export const flatMapOption = ({ transform, onNone }) => (result) => {
    if (isErr(result)) {
        return result;
    }

    const option = transform(result.value);

    return Option.isSome(option) ? ok(option.value) : err(onNone(result.value));
}


/**
 * Removes one nested Result layer, preserving either failure payload.
 *
 * @template A, E, F
 * @param {Result<Result<A, F>, E>} result - A Result whose Ok payload is another Result.
 * @returns {Result<A, E | F>} The inner Result, or the original outer Err.
 * @example
 * flatten(ok(ok("Link"))); // { type: "ok", value: "Link" }
 */
export const flatten = (result) =>
    isOk(result) ? result.value : result;


/**
 * Keeps a passing Ok or replaces it with Err from onFalse.
 * Preserves an existing Err and skips both callbacks. Exceptions propagate.
 *
 * @template A, F
 * @param {Object} options - The check and its failure handler.
 * @param {(value: A) => boolean} options.predicate - Called once with the Ok payload.
 * @param {(value: A) => F} options.onFalse - Receives that payload only when the check fails.
 * @returns {<E>(result: Result<A, E>) => Result<A, E | F>} A function filtering Ok values.
 * @example
 * const alive = filterOrElse({ predicate: health => health > 0, onFalse: () => "Defeated" });
 * alive(ok(0)); // { type: "err", error: "Defeated" }
 */
export const filterOrElse = ({ predicate, onFalse }) => (result) => {
    if (isErr(result) || predicate(result.value)) {
        return result;
    }

    return err(onFalse(result.value));
}


/**
 * Recovers from Err using another Result; preserves an existing Ok.
 * Callback exceptions propagate.
 *
 * @template B, E, F
 * @param {(error: E) => Result<B, F>} fallback - Called only for Err, with its error payload.
 * @returns {<A>(result: Result<A, E>) => Result<A | B, F>} A function recovering from Err.
 * @example
 * orElse(() => ok("Link"))(err("Missing hero")); // { type: "ok", value: "Link" }
 */
export const orElse = (fallback) => (result) =>
    isErr(result) ? fallback(result.error) : result;


/**
 * Runs an effect for Ok and returns the original Result; skips the effect for Err.
 * The effect's result is ignored, promises are not awaited, and synchronous
 * exceptions propagate.
 *
 * @template A
 * @param {(value: A) => unknown} effect - Observes the Ok value.
 * @returns {<E>(result: Result<A, E>) => Result<A, E>} A function observing Ok values.
 * @example
 * const seen = [];
 * tap(name => { seen.push(name); })(ok("Link"));
 * seen; // ["Link"]
 */
export const tap = (effect) => (result) => {
    if (isOk(result)) {
        effect(result.value);
    }

    return result;
}


/**
 * Runs an effect for Err and returns the original Result; skips the effect for Ok.
 * The effect's result is ignored, promises are not awaited, and synchronous
 * exceptions propagate.
 *
 * @template E
 * @param {(error: E) => unknown} effect - Observes the Err value.
 * @returns {<A>(result: Result<A, E>) => Result<A, E>} A function observing Err values.
 * @example
 * const errors = [];
 * tapError(message => { errors.push(message); })(err("No stamina"));
 * errors; // ["No stamina"]
 */
export const tapError = (effect) => (result) => {
    if (isErr(result)) {
        effect(result.error);
    }

    return result;
}


/**
 * Unwraps Ok or computes a fallback from Err. Callback exceptions propagate.
 *
 * @template B, E
 * @param {(error: E) => B} fallback - Called only for Err, with its error payload.
 * @returns {<A>(result: Result<A, E>) => A | B} A function unwrapping a Result.
 * @example
 * getOrElse(() => "Link")(err("Missing hero")); // "Link"
 */
export const getOrElse = (fallback) => (result) =>
    isOk(result) ? result.value : fallback(result.error);


/**
 * Unwraps Ok or throws the original Err payload without converting it to an Error.
 *
 * @template A, E
 * @param {Result<A, E>} result - The Result to unwrap.
 * @returns {A} The successful payload.
 * @throws {*} The original Err payload, including non-Error values.
 * @example
 * getOrThrow(ok("Link")); // "Link"
 */
export const getOrThrow = (result) => {
    if (isErr(result)) {
        throw result.error;
    }

    return result.value;
}


/**
 * Calls the matching handler and returns its output directly.
 * Callback exceptions propagate.
 *
 * @template A, B, E, C
 * @param {Object} handlers - Callbacks for the two possible branches.
 * @param {(value: A) => B} handlers.onOk - Called with the successful payload for Ok.
 * @param {(error: E) => C} handlers.onErr - Called with the error payload for Err.
 * @returns {(result: Result<A, E>) => B | C} A function handling either branch.
 * @example
 * const greet = match({ onOk: name => `Hello, ${name}`, onErr: message => message });
 * greet(ok("Link")); // "Hello, Link"
 */
export const match = ({ onOk, onErr }) => (result) =>
    isOk(result) ? onOk(result.value) : onErr(result.error);


/**
 * Combines two Ok payloads or returns the first Err, checking the left input first.
 * Calls the combiner only when both inputs are Ok. Exceptions propagate.
 *
 * @template A, B, C
 * @param {(left: A, right: B) => C} combine - Combines the two Ok values.
 * @returns {<E, F>(left: Result<A, E>, right: Result<B, F>) => Result<C, E | F>}
 * A function combining two Results.
 * @example
 * const add = zipWith((a, b) => a + b);
 * add(ok(2), ok(3)); // { type: "ok", value: 5 }
 * add(err(["Left missing"]), err(["Right missing"]));
 * // { type: "err", error: ["Left missing"] }
 */
export const zipWith = (combine) => (left, right) => {
    for (const result of [left, right]) {
        if (isErr(result)) {
            return result;
        }
    }

    return ok(combine(left.value, right.value));
}


/**
 * Collects Ok payloads in iteration order, stopping at the first Err.
 * Empty input returns Ok containing an empty array.
 *
 * @template A, E
 * @param {Iterable<Result<A, E>>} results - A finite iterable of Results to collect.
 * @returns {Result<A[], E>} Ok containing a new array, or the original first Err.
 * @example
 * all([ok("Link"), ok("Zelda")]); // { type: "ok", value: ["Link", "Zelda"] }
 * all([err(["Name required"]), err(["Age required"])]);
 * // { type: "err", error: ["Name required"] }
 */
export const all = (results) => {
    const outputs = [];

    for (const result of results) {
        if (isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return ok(outputs);
}


/**
 * Transforms values in iteration order and collects their Ok payloads.
 * Stops at the first Err without transforming later inputs. Exceptions propagate.
 * Empty input returns Ok containing an empty array.
 *
 * @template A, B, E
 * @param {(value: A) => Result<B, E>} transform - Called once per visited value, with no index.
 * @returns {(values: Iterable<A>) => Result<B[], E>} A function collecting transformed values.
 * @example
 * traverse(health => ok(health + 1))([2, 3]); // { type: "ok", value: [3, 4] }
 */
export const traverse = (transform) => (values) => {
    const outputs = []

    for (const value of values) {
        const result = transform(value)

        if (isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return ok(outputs);
}
