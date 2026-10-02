
// identity: A -> A
const identity = (value) => value;

// constant: A -> () -> A
const constant = (value) => () => value;

// pipe: ...
const pipe = (value, ...functions) => {
    const apply = (value, fn) => {
        if (typeof fn !=='function') {
            throw new TypeError('pipe: expected all arguments to be functions');
        }

        return fn(value)
    }

    return functions.reduce((acc, fn) => apply(acc, fn), value);
}


export { identity, constant, pipe };