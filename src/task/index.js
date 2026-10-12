export const of = (value) => () => Promise.resolve(value);


export const map = (transform) => (task) => () =>
    task().then(transform);


export const flatMap = (transform) => (task) => () =>
    task().then(transform).then((t) => t());


export const all = (tasks) => async () => {
    const promises = tasks.map((task) => task());
    return Promise.all(promises);
}


export const traverse = (transform) => (values) => async () => {
    const promises = values.map((value) => {
        const task = transform(value);
        return task();
    });

    return Promise.all(promises);
}


export const flatten = (task) => () =>
    task().then((t) => t());


export const tap = (effect) => (task) => () =>
    task().then(result => {
        effect(result);
        return result;
    });


export const tapAsync = (effect) => (task) => async () => {
    const result = await task();

    await effect(result);

    return result;
}


export const defer = (func) => async() =>
    func();


export const sleep = (ms) => {
    if (!Number.isInteger(ms) || ms < 0 || ms > 2147483647) {
        throw new RangeError("Milliseconds must be an integer between 0 and 2147483647");
    }

    return () =>
        new Promise((resolve) => setTimeout(resolve, ms));
}


export const withCleanup = (cleanup) => (task) => async () => {
    let result;

    let taskError;
    let taskFailed = false;

    try {
        result = await task();
    } catch (error) {
        taskError = error;
        taskFailed = true;
    }

    try {
        await cleanup();
    } catch (error) {
        throw taskFailed
            ? new AggregateError([taskError, error])
            : error;
    }

    if (taskFailed) {
        throw taskError;
    }

    return result;
}