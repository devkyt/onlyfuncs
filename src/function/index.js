// identity: A -> A
export const identity = (value) => value;


// constant: A -> () -> A
export const constant = (value) => () => value;


// pipe: ...
export const pipe = (value, ...functions) => {
    const apply = (value, fn) => {
        if (typeof fn !=='function') {
            throw new TypeError('pipe: expected all arguments to be functions');
        }

        return fn(value)
    }

    return functions.reduce((acc, fn) => apply(acc, fn), value);
}

// flow: ...
export const flow = (...functions) => (value) => pipe(value, ...functions);


// compose: ...
export const compose = (...functions) => flow(...functions.reverse());


// curry2: ...
export const curry2 = (fn) => (x) => (y) => fn(x, y);


// curry3: ...
export const curry3 = (fn) => (x) => (y) => (z) => fn(x, y, z);

