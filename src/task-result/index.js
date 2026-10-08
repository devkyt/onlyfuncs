import * as Task from "../task/index.js";
import * as Result from "../result/index.js";


export const ok = (value) => Task.of(Result.ok(value));


export const err = (error) => Task.of(Result.err(error));


export const map = (transform) => (task) => Task.map(Result.map(transform))(task);




