export const of = (value) => () => Promise.resolve(value);


export const map = (transform) => (task) => () =>
    task().then(transform);


export const flatMap = (transform) => (task) => () =>
    task().then(transform).then((t) => t());


export const all = (tasks) => async () => {
    const promises = tasks.map((task) => task());
    return Promise.all(promises);
}
