import * as Result from '../result/index.js';


export const all = (semigroup) => (results) => {
    const outputs = [];

    let hasErrors = false;
    let errors;

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