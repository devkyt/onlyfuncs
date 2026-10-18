import * as Result from "../result/index.js";

/**
 * A present value. The payload may itself be null or undefined.
 *
 * @template A
 * @typedef {Object} Some
 * @property {"some"} type - Identifies a present value.
 * @property {A} value - The wrapped value.
 */

/**
 * An absent value.
 *
 * @typedef {Object} None
 * @property {"none"} type - Identifies absence.
 */

/**
 * A value that is either present or absent.
 *
 * @template A
 * @typedef {(Some<A>|None)} Option
 */

/**
 * Wraps a value in Some, preserving object references.
 * Unlike fromNullable, null and undefined are treated as present values.
 *
 * @template A
 * @param {A} value - The value to wrap without inspecting or cloning it.
 * @returns {Some<A>} A new Some wrapper containing the value.
 * @example
 * some("Link"); // { type: "some", value: "Link" }
 */
export const some = (value) => ({ type: "some", value });


/**
 * The shared value representing absence. Treat this object as immutable.
 *
 * @type {None}
 * @example
 * none; // { type: "none" }
 */
export const none = { type: "none" };


/**
 * Checks whether an Option is Some, regardless of its payload's truthiness.
 *
 * @template A
 * @param {Option<A>} option - The Option to inspect, not an arbitrary value.
 * @returns {option is Some<A>} Whether the option has the Some tag.
 * @example
 * isSome(some(undefined)); // true
 */
export const isSome = (option) => option.type === "some";


/**
 * Checks whether an Option is None.
 *
 * @template A
 * @param {Option<A>} option - The Option to inspect, not an arbitrary value.
 * @returns {option is None} Whether the option has the None tag.
 * @example
 * isNone(none); // true
 */
export const isNone = (option) => option.type === "none";


/**
 * Converts null and undefined to None; wraps every other value in Some.
 * Values such as 0, false, and an empty string remain present.
 *
 * @template A
 * @param {(A|null|undefined)} value - The possibly missing value.
 * @returns {Option<A>} Some for a non-nullish value, otherwise the shared None.
 * @example
 * fromNullable(0); // { type: "some", value: 0 }
 * fromNullable(null); // { type: "none" }
 */
export const fromNullable = (value) =>
    value === null || value === undefined ? none : some(value);


/**
 * Wraps a value in Some when the predicate passes, otherwise returns None.
 * The predicate runs when the returned function is called, even with undefined.
 * Callback exceptions propagate.
 *
 * @template A
 * @param {function(A): boolean} predicate - Called once with the supplied value.
 * @returns {function(A): Option<A>} A function checking and wrapping its input.
 * @example
 * fromPredicate(health => health > 0)(3); // { type: "some", value: 3 }
 * fromPredicate(value => value === undefined)(undefined); // { type: "some", value: undefined }
 */
export const fromPredicate = (predicate) => (value) =>
    predicate(value) ? some(value) : none;


/**
 * Converts Ok to Some and Err to None, discarding the error payload.
 * Successful null and undefined payloads remain present.
 *
 * @template A, E
 * @param {import("../result/index.js").Result<A, E>} result - The Result to convert.
 * @returns {Option<A>} Some containing the Ok payload, or the shared None for Err.
 * @example
 * fromResult(Result.ok("Link")); // { type: "some", value: "Link" }
 */
export const fromResult = (result) =>
    Result.isOk(result) ? some(result.value) : none;


/**
 * Transforms a Some payload once; skips the callback for None.
 * The callback's output is wrapped without flattening or awaiting it.
 * Callback exceptions propagate.
 *
 * @template A, B
 * @param {function(A): B} transform - Receives the entire Some payload.
 * @returns {function(Option<A>): Option<B>} A function mapping Some or returning None.
 * @example
 * map(health => health + 1)(some(3)); // { type: "some", value: 4 }
 */
export const map = (transform) => (option) =>
    isSome(option) ? some(transform(option.value)) : none;


/**
 * Chains a Some payload into another Option; skips the callback for None.
 * Returns the callback's Option directly. Callback exceptions propagate.
 *
 * @template A, B
 * @param {function(A): Option<B>} transform - Receives the payload and returns an Option.
 * @returns {function(Option<A>): Option<B>} A function chaining Some or returning None.
 * @example
 * const petName = flatMap(hero => fromNullable(hero.pet));
 * petName(some({ pet: "Epona" })); // { type: "some", value: "Epona" }
 * petName(some({})); // { type: "none" }
 */
export const flatMap = (transform) => (option) =>
    isSome(option) ? transform(option.value) : none;


/**
 * Removes one nested Option layer. An outer None stays absent.
 *
 * @template A
 * @param {Option<Option<A>>} option - An Option whose Some payload is another Option.
 * @returns {Option<A>} The inner Option, or the shared None for an outer None.
 * @example
 * flatten(some(some("Link"))); // { type: "some", value: "Link" }
 */
export const flatten = (option) =>
    isSome(option) ? option.value : none;


/**
 * Keeps the original Some when its payload passes the predicate.
 * Returns None on failure and skips the predicate for None. Exceptions propagate.
 *
 * @template A
 * @param {function(A): boolean} predicate - Called once with a Some payload.
 * @returns {function(Option<A>): Option<A>} A function keeping or discarding the value.
 * @example
 * filter(health => health > 0)(some(0)); // { type: "none" }
 */
export const filter = (predicate) => (option) =>
    isSome(option) && predicate(option.value) ? option : none;


/**
 * Calls a fallback only for None; preserves an existing Some unchanged.
 * Callback exceptions propagate.
 *
 * @template B
 * @param {function(): Option<B>} fallback - Called without arguments to supply an Option.
 * @returns {<A>(option: Option<A>) => Option<A | B>} A function that returns the original
 * Some or the fallback Option.
 * @example
 * orElse(() => some("Link"))(none); // { type: "some", value: "Link" }
 */
export const orElse = (fallback) => (option) =>
    isSome(option) ? option : fallback();


/**
 * Runs an effect for Some and returns the original Option.
 * Skips the effect for None. The effect's result is ignored, promises are not
 * awaited, and synchronous exceptions propagate.
 *
 * @template A
 * @param {function(A): *} effect - Called once with the wrapped value; its return value is ignored.
 * @returns {function(Option<A>): Option<A>} A function observing and preserving the Option.
 * @example
 * const seen = [];
 * tap(name => { seen.push(name); })(some("Link"));
 * seen; // ["Link"]
 */
export const tap = (effect) => (option) => {
    if (isSome(option)) {
        effect(option.value);
    }

    return option;
}


/**
 * Unwraps Some or computes a fallback for None.
 * The fallback runs only for None; callback exceptions propagate.
 *
 * @template B
 * @param {function(): B} fallback - Called without arguments to supply the fallback value.
 * @returns {<A>(option: Option<A>) => A | B} A function that returns the Some value
 * or the fallback value.
 * @example
 * getOrElse(() => "Link")(none); // "Link"
 */
export const getOrElse = (fallback) => (option) =>
    isSome(option) ? option.value : fallback();


/**
 * Handles an Option using only the matching callback.
 * Returns the selected callback's output directly. Exceptions propagate.
 *
 * @template A, B, C
 * @param {Object} handlers - Callbacks for the two possible branches.
 * @param {function(A): B} handlers.onSome - Called with the Some payload.
 * @param {function(): C} handlers.onNone - Called without arguments for None.
 * @returns {function(Option<A>): (B|C)} A function returning the selected handler's output.
 * @example
 * const greet = match({ onSome: name => `Hello, ${name}`, onNone: () => "Nobody here" });
 * greet(some("Link")); // "Hello, Link"
 */
export const match = ({ onSome, onNone }) => (option) =>
    isSome(option) ? onSome(option.value) : onNone();


/**
 * Converts Some to a one-element array and None to an empty array.
 * Creates a new array while preserving the payload reference.
 *
 * @template A
 * @param {Option<A>} option - The Option to convert.
 * @returns {A[]} A new array containing zero or one value.
 * @example
 * toArray(some("Link")); // ["Link"]
 */
export const toArray = (option) =>
    isSome(option) ? [option.value] : [];


/**
 * Combines two Some payloads or returns None if either input is absent.
 * The combiner runs only when both inputs are Some. Exceptions propagate.
 *
 * @template A, B, C
 * @param {function(A, B): C} combine - Receives the left payload, then the right payload.
 * @returns {function(Option<A>, Option<B>): Option<C>} A function accepting both Options
 * in one call and wrapping their combined value.
 * @example
 * zipWith((a, b) => a + b)(some(2), some(3)); // { type: "some", value: 5 }
 */
export const zipWith = (combine) => (left, right) =>
    isSome(left) && isSome(right) ? some(combine(left.value, right.value)) : none;


/**
 * Collects Some payloads in iteration order, stopping at the first None.
 * Empty input returns Some containing an empty array.
 *
 * @template A
 * @param {Iterable<Option<A>>} options - A finite iterable of Options to collect.
 * @returns {Option<A[]>} Some containing a new array, or the shared None.
 * @example
 * all([some("Link"), some("Zelda")]); // { type: "some", value: ["Link", "Zelda"] }
 */
export const all = (options) => {
    const outputs = []

    for (const option of options) {
        if (isNone(option)) {
            return none;
        }

        outputs.push(option.value);
    }

    return some(outputs);
}


/**
 * Transforms values in iteration order and collects their Some payloads.
 * Stops at the first None without transforming later inputs. Exceptions propagate.
 * Empty input returns Some containing an empty array.
 *
 * @template A, B
 * @param {function(A): Option<B>} transform - Called once per visited value, with no index.
 * @returns {function(Iterable<A>): Option<B[]>} A function returning Some containing
 * a new array of values, or None if any transformation returns None.
 * @example
 * traverse(name => fromNullable(name))(["Link", null]); // { type: "none" }
 */
export const traverse = (transform) => (values) => {
    const outputs = []

    for (const value of values) {
        const option = transform(value);

        if (isNone(option)) {
            return none;
        }

        outputs.push(option.value);
    }

    return some(outputs);
}
