
// identity: A -> A
const identity = (value) => value;

const constant = (value) => () => value;

export { identity, constant };