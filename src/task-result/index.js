import * as Task from "../task/index.js";
import * as Result from "../result/index.js";


export const ok = (value) => Task.of(Result.ok(value));


export const err = (error) => Task.of(Result.err(error));


export const map = (transform) => (task) =>
    Task.map(Result.map(transform))(task);


export const mapError = (transform) => (task) =>
    Task.map(Result.mapError(transform))(task);


export const flatMap = (transform) => (task) => {
    const callback = (result) =>
        Result.isOk(result) ? transform(result.value) : Task.of(result);

    return Task.flatMap(callback)(task)
};


export const getOrElse = (fallback) => (task) =>
    Task.map(Result.getOrElse(fallback))(task);



export const orElse = (fallback) => (task) => {
    const callback = (result) =>
        Result.isErr(result) ? fallback(result.error) : Task.of(result);

    return Task.flatMap(callback)(task);
}


export const match = ({ onOk, onErr }) => (task) =>
    Task.map(Result.match({ onOk, onErr }))(task);


export const fromThrowable = (func) => async() => {
    try {
        return Result.ok(await func());
    } catch (error) {
        return Result.err(error);
    }
}


export const fromResult = (result) => Task.of(result);


export const fromTask = (task) => Task.map(Result.ok)(task);


export const all = (tasks) => async () => {
    const outputs = [];

    for (const task of tasks) {
        const result = await task();

        if (Result.isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return Result.ok(outputs);
}


export const traverse = (transform) => (values) => async () => {
    const outputs = [];

    for (const value of values) {
        const task = transform(value)
        const result = await task()

        if (Result.isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return Result.ok(outputs);
}