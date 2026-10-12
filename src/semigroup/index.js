export const sum = {
    combine: (left, right) => left + right,
};


export const product = {
    combine: (left, right) => left * right,
};


export const string = {
    combine: (left, right) => left + right,
};


export const array = {
    combine: (left, right) => [...left, ...right],
};


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


export const combineMany = ({ semigroup, initial } ) => (values) => {
    let accumulator = initial;

    for (const value of values) {
        accumulator = semigroup.combine(accumulator, value);
    }

    return accumulator;
}