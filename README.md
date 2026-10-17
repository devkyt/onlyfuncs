# OnlyFuncs

Lightweight and hopefully ready to use library for functional programming in JavaScript. 
It was written out of curiosity and because someone got really bored with OOP.

## Description 

Provides a wide set of functions and types that are quite regular for functional programming. For example map, 
pipe, compose, result, option, traverse etc. So you don't have to write them all yourself if you want to give a FP
a shot, but you are too lazy or busy to implement everything from scratch.


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


console.log(racer('{"name": "Mario"}')); // "Select: Mario"
console.log(racer('{"na": "Luigi"}')); // Could not choose a racer: name is missing
console.log(racer('{')); // Could not choose a racer: invalid JSON
console.log(racer('{"name": "Bowser", "power": "fireball"}')); // "Select: Bowser"
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
