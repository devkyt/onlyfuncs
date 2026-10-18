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
 * @typedef {Some<A> | None} Option
 */

/**
 * Wraps a value in Some, preserving object references.
 * Unlike fromNullable, null and undefined are treated as present values.
 *
 * @template A
 * @param {A} value - The value to wrap.
 * @returns {Some<A>} A new Some.
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
 * @param {A} value - The possibly missing value.
 * @returns {Option<NonNullable<A>>} Some for a present value, otherwise None.
 * @example
 * fromNullable(0); // { type: "some", value: 0 }
 * fromNullable(null); // { type: "none" }
 */
export const fromNullable = (value) =>
    value === null || value === undefined ? none : some(value);


/**
 * Returns Some when the predicate passes, otherwise None.
 * Calls the predicate with the input, including undefined. Exceptions propagate.
 *
 * @template A
 * @param {(value: A) => boolean} predicate - Called once with the supplied value.
 * @returns {(value: A) => Option<A>} A function testing and wrapping a value.
 * @example
 * fromPredicate(health => health > 0)(3); // { type: "some", value: 3 }
 * fromPredicate(value => value === undefined)(undefined); // { type: "some", value: undefined }
 */
export const fromPredicate = (predicate) => (value) =>
    predicate(value) ? some(value) : none;


/**
 * Converts Ok to Some and Err to None, discarding the error.
 * Successful null and undefined values remain present.
 *
 * @template A, E
 * @param {import("../result/index.js").Result<A, E>} result - The Result to convert.
 * @returns {Option<A>} The converted Option.
 * @example
 * fromResult(Result.ok("Link")); // { type: "some", value: "Link" }
 */
export const fromResult = (result) =>
    Result.isOk(result) ? some(result.value) : none;


/**
 * Transforms a Some value; skips None. Wraps the output without flattening
 * or awaiting it. Callback exceptions propagate.
 *
 * @template A, B
 * @param {(value: A) => B} transform - Receives the entire Some payload.
 * @returns {(option: Option<A>) => Option<B>} A function mapping Some values.
 * @example
 * map(name => name.toUpperCase())(some("Link")); // { type: "some", value: "LINK" }
 * map(name => some(name.toUpperCase()))(some("Link"));
 * // { type: "some", value: { type: "some", value: "LINK" } }
 */
export const map = (transform) => (option) =>
    isSome(option) ? some(transform(option.value)) : none;


/**
 * Chains a Some value into another Option; skips None.
 * Returns the callback's Option directly. Callback exceptions propagate.
 *
 * @template A, B
 * @param {(value: A) => Option<B>} transform - Receives the payload and returns an Option.
 * @returns {(option: Option<A>) => Option<B>} A function chaining Options.
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
 * @param {(value: A) => boolean} predicate - Called once with a Some payload.
 * @returns {(option: Option<A>) => Option<A>} A function filtering Some values.
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
 * @param {() => Option<B>} fallback - Called without arguments to supply an Option.
 * @returns {<A>(option: Option<A>) => Option<A | B>} A function supplying a fallback Option.
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
 * @param {(value: A) => unknown} effect - Observes the Some value.
 * @returns {(option: Option<A>) => Option<A>} A function observing an Option.
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
 * Unwraps Some or calls fallback for None. Callback exceptions propagate.
 *
 * @template B
 * @param {() => B} fallback - Called without arguments to supply the fallback value.
 * @returns {<A>(option: Option<A>) => A | B} A function unwrapping an Option.
 * @example
 * getOrElse(() => "Link")(none); // "Link"
 */
export const getOrElse = (fallback) => (option) =>
    isSome(option) ? option.value : fallback();


/**
 * Calls the matching handler and returns its output directly.
 * Callback exceptions propagate.
 *
 * @template A, B, C
 * @param {Object} handlers - Callbacks for the two possible branches.
 * @param {(value: A) => B} handlers.onSome - Called with the Some payload.
 * @param {() => C} handlers.onNone - Called without arguments for None.
 * @returns {(option: Option<A>) => B | C} A function handling either branch.
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
 * @param {(left: A, right: B) => C} combine - Combines the two Some values.
 * @returns {(left: Option<A>, right: Option<B>) => Option<C>} A function combining two Options.
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
 * all([some("Link"), none]); // { type: "none" }
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
 * @param {(value: A) => Option<B>} transform - Called once per visited value, with no index.
 * @returns {(values: Iterable<A>) => Option<B[]>} A function collecting transformed values.
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
