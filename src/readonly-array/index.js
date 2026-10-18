import * as Option from "../option/index.js";
import * as Result from "../result/index.js";


/**
 * Transforms a finite iterable and collects Some values, skipping None.
 * Returns a new array in input order. Callback throws stop iteration and propagate.
 *
 * @template A, B
 * @param {(value: A) => import("../option/index.js").Option<B>} transform - Called with each element.
 * @returns {(values: Iterable<A>) => B[]} A function collecting present values.
 * @example
 * mapOption(n => n > 0 ? Option.some(n * 2) : Option.none)([1, -1, 3]); // [2, 6]
 */
export const mapOption = (transform) => (values) => {
    const outputs = [];

    for (const value of values) {
        const option = transform(value);

        if (Option.isSome(option)) {
            outputs.push(option.value);
        }
    }

    return outputs;
}


/**
 * Transforms a finite iterable and separates Ok values from Err values.
 * Visits every element, preserving input order in both output arrays.
 * Callback throws stop iteration and propagate.
 *
 * @template A, B, E
 * @param {(value: A) => import("../result/index.js").Result<B, E>} transform -
 * Called with each element.
 * @returns {(values: Iterable<A>) => {values: B[], errors: E[]}}
 * A function separating values and errors.
 * @example
 * mapResult(n => n > 0 ? Result.ok(n) : Result.err("Not positive"))([2, -1, 3]);
 * // { values: [2, 3], errors: ["Not positive"] }
 */
export const mapResult = (transform) => (values) => {
    const outputs = [];
    const errors = [];

    for (const value of values) {
        const result = transform(value);

        Result.isOk(result)
            ? outputs.push(result.value)
            : errors.push(result.error);
    }

    return { values: outputs, errors };
}



/**
 * Returns Some for the first match, or None when no element matches.
 * Stops at the match; a matching undefined is still Some(undefined).
 * Predicate exceptions propagate.
 *
 * @template A
 * @param {(value: A) => boolean} predicate - Called with each element until a match is found.
 * @returns {(values: Iterable<A>) => import("../option/index.js").Option<A>}
 * A function searching for a match.
 * @example
 * findFirst(n => n > 3)([1, 5, 7]); // { type: "some", value: 5 }
 */
export const findFirst = (predicate) => (values) => {
    for (const value of values) {
        if (predicate(value)) {
            return Option.some(value);
        }
    }

    return Option.none;
}


/**
 * Reads an element by index, counting negative indices from the end.
 * Returns None for an out-of-bounds index. An in-bounds hole or undefined value
 * returns Some(undefined). Validates the index before receiving the array.
 *
 * @param {number} index - A safe integer; -1 selects the last element.
 * @returns {<A>(values: ReadonlyArray<A>) => import("../option/index.js").Option<A>}
 * A function reading an array element.
 * @throws {RangeError} If index is not a safe integer.
 * @example
 * at(-1)(["Link", "Zelda"]); // { type: "some", value: "Zelda" }
 * at(2)(["Link"]); // { type: "none" }
 */
export const at = (index) => {
    if (!Number.isSafeInteger(index)) {
        throw new RangeError("Index must be a safe integer");
    }

    return (values) => {
        const position = index < 0 ? values.length + index : index;

        return position >= 0 && position < values.length
            ? Option.some(values[position])
            : Option.none;
    }
}


/**
 * Groups a finite iterable into a new Map of new arrays, preserving element references.
 * Keys appear in first-seen order; each group keeps input order. Uses Map key equality,
 * including reference identity for object keys. Callback exceptions propagate.
 *
 * @template A, K
 * @param {(value: A) => K} keyOf - Computes a key from each element.
 * @returns {(values: Iterable<A>) => Map<K, A[]>} A function grouping elements.
 * @example
 * groupBy(name => name.length)(["Link", "Zelda", "Navi"]);
 * // new Map([[4, ["Link", "Navi"]], [5, ["Zelda"]]])
 */
export const groupBy = (keyOf) => (values) => {
    const outputs = new Map();

    for (const value of values) {
        const key = keyOf(value)

        outputs.has(key)
            ? outputs.get(key).push(value)
            : outputs.set(key, [value])
    }

    return outputs;
}