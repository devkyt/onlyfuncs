import * as Option from "../option/index.js";
import * as Result from "../result/index.js";


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



export const findFirst = (predicate) => (values) => {
    for (const value of values) {
        if (predicate(value)) {
            return Option.some(value);
        }
    }

    return Option.none;
}


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