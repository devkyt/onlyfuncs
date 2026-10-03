
export const some = (value) => ({ type: "some", value });


export const isSome = (option) => option.type === "some";


export const none = { type: "none" };


export const isNone = (option) => option.type === "none";


export const fromNullable = (value) =>
    value === null || value === undefined ? none : some(value);


export const map = (transform) => (option) =>
    isSome(option) ? some(transform(option.value)) : none;


export const flatMap = (transform) => (option) =>
    isSome(option) ? transform(option.value) : none;


export const filter = (predicate) => (option) =>
    isSome(option) && predicate(option.value) ? option : none;


export const getOrElse = (fallback) => (option) =>
    isSome(option) ? option.value : fallback();