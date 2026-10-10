import * as Result from '../result/index.js';


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