import { pipe } from "../src/function/index.js";
import * as TaskResult from "../src/task-result/index.js";


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
