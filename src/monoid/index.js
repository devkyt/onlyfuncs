import * as Semigroup from "../semigroup/index.js"


export const sum = {
    combine: Semigroup.sum.combine,
    empty: () => 0,
};


export const product = {
    combine: Semigroup.product.combine,
    empty: () => 1,
};


export const string = {
    combine: Semigroup.string.combine,
    empty: () => "",
};


export const array = {
    combine: Semigroup.array.combine,
    empty: () => [],
};


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


export const combineAll = (monoid) => (values) =>
    Semigroup.combineMany({ semigroup: monoid, initial: monoid.empty() })(values);



