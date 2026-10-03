
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

// flow: ...
const flow = (...functions) => (value) => pipe(value, ...functions);


// compose: ...
const compose = (...functions) => flow(...functions.reverse());


// curry2: ...
const curry2 = (fn) => (x) => (y) => fn(x, y);


export { identity, constant, pipe, flow, compose, curry2 };