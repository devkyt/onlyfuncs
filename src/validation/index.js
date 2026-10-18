import * as Result from '../result/index.js';


/**
 * Collects Ok values or combines every Err in a finite iterable.
 * Continues after Err, combining errors left to right from the first error.
 * A single error needs no combination; empty input returns Ok([]).
 * Iteration and combiner exceptions propagate.
 *
 * @template E
 * @param {import("../semigroup/index.js").Semigroup<E>} semigroup - Combines error payloads.
 * @returns {<A>(results: Iterable<import("../result/index.js").Result<A, E>>) =>
 *   import("../result/index.js").Result<A[], E>}
 * A function collecting values or accumulated errors.
 * @example
 * all(Semigroup.array)([Result.err(["Name required"]), Result.ok(3), Result.err(["Age required"])]);
 * // { type: "err", error: ["Name required", "Age required"] }
 */
export const all = (semigroup) => (results) => {
    const outputs = [];

    let errors;
    let hasErrors = false;

    for (const result of results) {
        if (Result.isOk(result)) {
            outputs.push(result.value);
            continue;
        }

        errors = hasErrors
            ? semigroup.combine(errors, result.error)
            : result.error;


        hasErrors = true;
    }

    return hasErrors ? Result.err(errors) : Result.ok(outputs);
}


/**
 * Validates every element synchronously, collecting Ok values or combining all errors.
 * Continues after Err, combining errors left to right from the first error.
 * Empty input returns Ok([]). Throws stop iteration and propagate without becoming Err.
 *
 * @template A, B, E
 * @param {Object} options - The validation function and error combination operation.
 * @param {import("../semigroup/index.js").Semigroup<E>} options.semigroup - Combines error payloads.
 * @param {(value: A) => import("../result/index.js").Result<B, E>} options.transform -
 * Validates each element.
 * @returns {(values: Iterable<A>) => import("../result/index.js").Result<B[], E>}
 * A function validating a finite iterable.
 * @example
 * const validate = traverse({
 *     semigroup: Semigroup.array,
 *     transform: n => n > 0 ? Result.ok(n) : Result.err(["Not positive"]),
 * });
 * validate([1, 0, -1]); // { type: "err", error: ["Not positive", "Not positive"] }
 */
export const traverse = ( { semigroup, transform }) => (values) => {
    const outputs = [];

    let errors;
    let hasErrors = false;

    for (const value of values) {
        const result = transform(value);

        if (Result.isOk(result)) {
            outputs.push(result.value);
            continue;
        }

        errors = hasErrors
            ? semigroup.combine(errors, result.error)
            : result.error;

        hasErrors = true;
    }

    return hasErrors ? Result.err(errors) : Result.ok(outputs);
}


/**
 * Combines two Ok values, or combines their errors when both are Err.
 * With just one Err, returns that same Result. Calls only the relevant combiner;
 * callback exceptions propagate.
 *
 * @template A, B, C, E
 * @param {Object} options - Operations for combining successes and errors.
 * @param {import("../semigroup/index.js").Semigroup<E>} options.semigroup -
 * Combines two error payloads.
 * @param {(left: A, right: B) => C} options.combine - Combines the left and right successful values.
 * @returns {(
 *   left: import("../result/index.js").Result<A, E>,
 *   right: import("../result/index.js").Result<B, E>
 * ) => import("../result/index.js").Result<C, E>}
 * A function combining two Results.
 * @example
 * const add = zipWith({ semigroup: Semigroup.array, combine: (left, right) => left + right });
 * add(Result.ok(2), Result.ok(3)); // { type: "ok", value: 5 }
 * add(Result.err(["Left missing"]), Result.err(["Right missing"]));
 * // { type: "err", error: ["Left missing", "Right missing"] }
 */
export const zipWith = ({ semigroup, combine }) => (left, right) => {
    if (Result.isOk(left) && Result.isOk(right)) {
        return Result.ok(combine(left.value, right.value));
    }

    if (Result.isErr(left)) {
        if (Result.isErr(right)) {
            return Result.err(semigroup.combine(left.error, right.error));
        }

        return left;
    }

    return right;
}