export const of = (value) => () => Promise.resolve(value);


export const map = (transform) => (task) => () => task().then(transform);


export const flatMap = (transform) => (task) => () =>
    task().then(transform).then((t) => t());