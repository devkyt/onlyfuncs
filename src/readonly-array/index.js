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


