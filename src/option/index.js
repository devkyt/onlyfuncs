import * as Result from "../result/index.js";

export const some = (value) => ({ type: "some", value });


export const none = { type: "none" };


export const isSome = (option) => option.type === "some";


export const isNone = (option) => option.type === "none";


export const fromNullable = (value) =>
    value === null || value === undefined ? none : some(value);


export const fromPredicate = (predicate) => (value) =>
    predicate(value) ? some(value) : none;


export const fromResult = (result) =>
    Result.isOk(result) ? some(result.value) : none;


export const map = (transform) => (option) =>
    isSome(option) ? some(transform(option.value)) : none;


export const flatMap = (transform) => (option) =>
    isSome(option) ? transform(option.value) : none;


export const flatten = (option) =>
    isSome(option) ? option.value : none;


export const filter = (predicate) => (option) =>
    isSome(option) && predicate(option.value) ? option : none;


export const orElse = (fallback) => (option) =>
    isSome(option) ? option : fallback();


export const tap = (effect) => (option) => {
    if (isSome(option)) {
        effect(option.value);
    }

    return option;
}


export const getOrElse = (fallback) => (option) =>
    isSome(option) ? option.value : fallback();


export const match = ({ onSome, onNone }) => (option) =>
    isSome(option) ? onSome(option.value) : onNone();


export const toArray = (option) =>
    isSome(option) ? [option.value] : [];


export const zipWith = (combine) => (left, right) =>
    isSome(left) && isSome(right) ? some(combine(left.value, right.value)) : none;


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