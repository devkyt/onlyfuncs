<p align="center">
  <img src="public/logo-transparent.png" alt="OnlyFuncs banner" width="700">
</p>

# OnlyFuncs

Lightweight and hopefully ready to use library for functional programming in JavaScript. 
It was written out of curiosity and because someone got really bored with OOP.


## Description 

Provides a wide set of functions and types that are quite regular for functional programming. For example map, 
pipe, compose, result, option, traverse etc. So if you want to give FP a shot, save yourself some time and try 
the lib. It doesn't byte. Mostly.

Also, it does its best to be readable and supports asynchronous operations.


## Installation 

```bash
npm install onlyfuncs
```


## Quick Start

Import the functions you need from the library module:

```js
import { pipe } from "onlyfuncs/function";
import * as Option from "onlyfuncs/option";
import * as Result from "onlyfuncs/result";
```

Or directly from the root:

```js
import { Option, Result } from "onlyfuncs";
```

Use them in chains:

```js
const racer = (name) => pipe(
    Option.fromNullable(name),
    Option.map((name) => name.trim()),
    Option.filter((name) => name.length > 0),
    Option.getOrElse(() => "Luigi")
);

console.log(racer(" Mario   ")) // Mario
console.log(racer("   ")) // Luigi
console.log(racer()) // Luigi
console.log(racer("Bowser")) // Bowser
```

Reach out to Result if you want to check why operation failed:

```js
const racer = (value) => pipe(
    Result.fromThrowable(() => JSON.parse(value)),
    Result.mapError((_) => "invalid JSON"),
    Result.map((user) => user?.name),
    Result.flatMap((name) => typeof name === "string" && name.trim().length > 0
        ? Result.ok(name.trim())
        : Result.err("name is missing")),
    Result.match({
        onOk: (name) => `Select: ${name}`,
        onErr: (err) => `Could not choose a racer: ${err}`
    })
);


console.log(racer('{"name": "Mario"}')); // Mario
console.log(racer('{"na": "Luigi"}')); // Name is missing
console.log(racer('{')); // Invalid JSON
console.log(racer('{"name": "Bowser", "power": "fireball"}')); // Bowser
```

Reach out to TaskResult for running async operations that may fail:

```js
import { pipe } from "onlyfuncs/function";
import * as TaskResult from "onlyfuncs/task-result";

const lookupItem = async (name) => {
    const response = await fetch(
        `https://dummyjson.com/products/search?q=${encodeURIComponent(name)}`,
    );

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
};

const item = (name) => pipe(
    TaskResult.fromThrowable(() => lookupItem(name)),
    TaskResult.mapError((err) => err.message),
    TaskResult.map((data) => data.products[0]),
    TaskResult.filterOrElse({
        predicate: (item) => item !== undefined,
        onFalse: () => `${name} was not found`,
    }),
    TaskResult.map((item) => item.title),
    TaskResult.match({
        onOk: (title) => `Gotcha ${title}`,
        onErr: (err) => `Could not get item: ${err}`,
    }),
);

console.log(await item("cup")()); 
console.log(await item("apple")());
console.log(await item("moonstone")());
```


## Modules

| Module | Import | Purpose |
| --- | --- | --- |
| Function | `onlyfuncs/function` | Compose and transform functions with `pipe`, `flow`, and `compose`|
| Option | `onlyfuncs/option` | Represent optional values and handle missing data|
| Result | `onlyfuncs/result` | Represent success or failure and recover from errors|
| Predicate | `onlyfuncs/predicate` | Combine and adapt boolean checks |
| ReadonlyArray | `onlyfuncs/readonly-array` | Find, group, and transform array values |
| Task | `onlyfuncs/task` | Define lazy asynchronous computations |
| TaskResult | `onlyfuncs/task-result` | Combine asynchronous computations with success and failure handling |
| Semigroup | `onlyfuncs/semigroup` | Combine values, such as strings, arrays, and records |
| Monoid | `onlyfuncs/monoid` | Combine values with an identity |
| Validation | `onlyfuncs/validation` | Accumulate errors from independent checks |


## License

MIT © 2026 Kyrylo Tykhanskyi. See [LICENSE](LICENSE).
