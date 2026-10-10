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


export const combineMany = ({ semigroup, initial} ) => (values) => {
    let accumulator = initial;

    for (const value of values) {
        accumulator = semigroup.combine(accumulator, value);
    }

    return accumulator;
}