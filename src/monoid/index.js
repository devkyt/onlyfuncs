import * as Semigroup from "../semigroup/index.js"

/**
 * An associative combination operation with an identity value.
 * Combining a value with the identity on either side should preserve that value.
 * Custom combiners should preserve inputs, and empty() should create a fresh identity
 * when it is mutable. JavaScript number rounding can limit numeric associativity.
 *
 * @template A
 * @typedef {Object} Monoid
 * @property {(left: A, right: A) => A} combine - Combines the left and right values in that order.
 * @property {() => A} empty - Supplies the identity for the combination operation.
 */

/**
 * Combines numbers by addition, with zero as the identity.
 * Uses JavaScript number arithmetic.
 *
 * @type {Monoid<number>}
 * @example
 * sum.combine(sum.empty(), 3); // 3
 */
export const sum = {
    combine: Semigroup.sum.combine,
    empty: () => 0,
};


/**
 * Combines numbers by multiplication, with one as the identity.
 * Uses JavaScript number arithmetic.
 *
 * @type {Monoid<number>}
 * @example
 * product.combine(product.empty(), 3); // 3
 */
export const product = {
    combine: Semigroup.product.combine,
    empty: () => 1,
};


/**
 * Concatenates strings in left-to-right order, with the empty string as the identity.
 *
 * @type {Monoid<string>}
 * @example
 * string.combine(string.empty(), "Link"); // "Link"
 */
export const string = {
    combine: Semigroup.string.combine,
    empty: () => "",
};


/**
 * Concatenates arrays without changing them; empty() creates a new empty array.
 * Each combination creates a new array, preserving the elements' references.
 *
 * @type {{
 *   combine: <A, B>(left: ReadonlyArray<A>, right: ReadonlyArray<B>) => (A | B)[],
 *   empty: <A>() => A[]
 * }}
 * @example
 * array.combine(array.empty(), ["Link"]); // ["Link"]
 * array.empty() === array.empty(); // false
 */
export const array = {
    combine: Semigroup.array.combine,
    empty: () => [],
};


/**
 * Creates a monoid that combines matching fields into a new object.
 * Captures the schema's own enumerable string keys and monoid references at creation.
 * Ignores extra input fields. Each empty() call creates a new object and calls each
 * field's empty() once; field monoids control freshness of their values.
 * Field operations run in schema order; exceptions propagate.
 *
 * @template {Record<string, any>} A
 * @param {{[K in keyof A]: Monoid<A[K]>}} fields - A monoid for each field to combine.
 * @returns {Monoid<A>} The record monoid.
 * @example
 * const stats = struct({ health: sum, inventory: array });
 * stats.empty(); // { health: 0, inventory: [] }
 * stats.combine(stats.empty(), { health: 3, inventory: ["Bow"] });
 * // { health: 3, inventory: ["Bow"] }
 */
export const struct = (fields) => {
    const entries = Object.entries(fields);

    return {
        combine: Semigroup.struct(fields).combine,
        empty: () => Object.fromEntries(
            entries.map(([key, monoid]) => [
                key,
                monoid.empty()
            ])
        ),
    };
};


/**
 * Combines a finite iterable left to right, starting from the monoid's identity.
 * Calls empty() once when values are supplied, including for empty input.
 * Iteration, empty(), and combiner exceptions propagate.
 *
 * @template A
 * @param {Monoid<A>} monoid - Supplies the identity and combines the accumulator with each element.
 * @returns {(values: Iterable<A>) => A} A function combining a finite iterable.
 * @example
 * combineAll(sum)([2, 3, 4]); // 9
 * combineAll(sum)([]); // 0
 */
export const combineAll = (monoid) => (values) =>
    Semigroup.combineMany({ semigroup: monoid, initial: monoid.empty() })(values);



