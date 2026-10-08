import * as Task from "../task/index.js";
import * as Result from "../result/index.js";


export const ok = (value) => Task.of(Result.ok(value));


export const err = (error) => Task.of(Result.err(error));


export const map = (transform) => (task) => Task.map(Result.map(transform))(task);


export const mapError = (transform) => (task) => Task.map(Result.mapError(transform))(task);


export const flatMap = (transform) => (task) => {
    const callback = (result) =>
        Result.isOk(result) ? transform(result.value) : Task.of(result);

    return Task.flatMap(callback)(task)
};


export const getOrElse = (fallback) => (task) => Task.map(Result.getOrElse(fallback))(task);



