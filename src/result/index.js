import * as Option from "../option/index.js";


export const ok = (value) => ({ type: "ok", value: value });


export const isOk = (result) => result.type === "ok";


export const err = (error) => ({ type: "err", error: error });


export const isErr = (result) => result.type === "err";


export const map = (transform) => (result) =>
    isOk(result) ? ok(transform(result.value)) : result;


export const mapError = (transform) => (result) =>
    isErr(result) ? err(transform(result.error)) : result;


export const flatMap = (transform) => (result) =>
    isOk(result) ? transform(result.value) : result;


export const getOrElse = (fallback) => (result) =>
    isOk(result) ? result.value : fallback(result.error);


export const orElse = (fallback) => (result) =>
    isErr(result) ? fallback(result.error) : result;


export const match = ({ onOk, onErr }) => (result) =>
    isOk(result) ? onOk(result.value) : onErr(result.error);


export const fromThrowable = (func) => {
    try {
        return ok(func());
    } catch (error) {
        return err(error);
    }
}


export const fromOption = (onNone) => (option) =>
    Option.isSome(option) ? ok(option.value) : err(onNone());



export const all = (results) => {
    const values = [];

    for (const result of results) {
        if (isErr(result)) {
            return result;
        }

        values.push(result.value);
    }

    return ok(values);
}
