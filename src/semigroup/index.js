/**
 * An associative operation for combining two values of the same type.
 * Custom combiners should preserve input values. Associativity means grouping
 * combinations differently produces the same result; JavaScript number rounding
 * can limit this property for the numeric helpers.
 *
 * @template A
 * @typedef {Object} Semigroup
 * @property {(left: A, right: A) => A} combine - Combines the left and right values in that order.
 */

/**
 * Combines numbers by addition, using JavaScript number arithmetic.
 *
 * @type {Semigroup<number>}
 * @example
 * sum.combine(2, 3); // 5
 */
export const sum = {
    combine: (left, right) => left + right,
};


/**
 * Combines numbers by multiplication, using JavaScript number arithmetic.
 *
 * @type {Semigroup<number>}
 * @example
 * product.combine(2, 3); // 6
 */
export const product = {
    combine: (left, right) => left * right,
};


/**
 * Concatenates strings in left-to-right order without a separator.
 *
 * @type {Semigroup<string>}
 * @example
 * string.combine("Hello, ", "Link"); // "Hello, Link"
 */
export const string = {
    combine: (left, right) => left + right,
};


/**
 * Concatenates arrays into a new array without changing either input.
 * Elements retain their references; nested values are not cloned.
 *
 * @type {{combine: <A, B>(left: ReadonlyArray<A>, right: ReadonlyArray<B>) => (A | B)[]}}
 * @example
 * array.combine(["Link"], ["Zelda"]); // ["Link", "Zelda"]
 */
export const array = {
    combine: (left, right) => [...left, ...right],
};


/**
 * Creates a semigroup that combines matching fields into a new object.
 * Captures the schema's own enumerable string keys and semigroup references at creation.
 * Ignores extra input fields. Field combiners run in schema order; exceptions propagate.
 *
 * @template {Record<string, any>} A
 * @param {{[K in keyof A]: Semigroup<A[K]>}} fields - A semigroup for each field to combine.
 * @returns {Semigroup<A>} The record semigroup.
 * @example
 * const stats = struct({ health: sum, inventory: array });
 * stats.combine({ health: 3, inventory: ["Bow"] }, { health: 2, inventory: ["Shield"] });
 * // { health: 5, inventory: ["Bow", "Shield"] }
 */
export const struct = (fields) => {
    const entries = Object.entries(fields);

    return {
        combine: (left, right) => Object.fromEntries(
           entries.map(([key, semigroup])=> [
               key,
               semigroup.combine(left[key], right[key])
           ])
        ),
    };
};


/**
 * Combines a finite iterable left to right using combine(accumulator, value).
 * Each call starts from the same initial value; empty input returns it unchanged.
 * The initial value is not cloned, so a mutating combiner can affect later calls.
 * Iteration and combiner exceptions propagate.
 *
 * @template A
 * @param {Object} options - The combination operation and starting value.
 * @param {Semigroup<A>} options.semigroup - Combines the accumulator with each element.
 * @param {A} options.initial - The starting value.
 * @returns {(values: Iterable<A>) => A} A function combining a finite iterable.
 * @example
 * const total = combineMany({ semigroup: sum, initial: 10 });
 * total([2, 3]); // 15
 * total([]); // 10
 */
export const combineMany = ({ semigroup, initial } ) => (values) => {
    let accumulator = initial;

    for (const value of values) {
        accumulator = semigroup.combine(accumulator, value);
    }

    return accumulator;
}