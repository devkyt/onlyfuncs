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


export const flatten = (task) => {
    const callback = (result) =>
        Result.isOk(result) ? result.value : Task.of(result);

        return Task.flatMap(callback)(task);
}


export const tap = (effect) => (task) => () =>
    task().then(result => {
        if (Result.isOk(result)) {
            effect(result.value);
        }

        return result;
    });



export const tapError = (effect) => (task) => () =>
    task().then(result => {
        if (Result.isErr(result)) {
            effect(result.error);
        }

        return result;
    });


export const fromOption = (onNone) => (option) => async ()=>
    Result.fromOption(onNone)(option);


export const allParallel = (tasks) =>
    Task.map(Result.all)(Task.all(tasks));


export const traverseParallel = (transform) => (values) =>
    Task.map(Result.all)(Task.traverse(transform)(values));


export const fromNullable = (onNull) => (value) =>
    Task.defer(() => Result.fromNullable(onNull)(value));


export const fromPredicate = ({ predicate, onFalse }) => (value) =>
    Task.defer(() => Result.fromPredicate({ predicate, onFalse })(value));


export const flatMapResult = (transform) => (task) =>
    Task.map(Result.flatMap(transform))(task);


export const flatMapOption = ({transform, onNone}) => (task) =>
    Task.map(Result.flatMapOption({transform, onNone}))(task);