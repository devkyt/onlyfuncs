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
    task().then(t => {
        effect(t);
        return t;
    });