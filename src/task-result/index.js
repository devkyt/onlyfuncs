import * as Task from "../task/index.js";
import * as Result from "../result/index.js";

/**
 * A task resolving to a Result, with a successful value or an explicit error payload.
 * Call the task without arguments to execute it; calling again reruns its body.
 * An Err is a fulfilled result, distinct from a rejected promise. Unless documented
 * otherwise, helpers propagate rejections instead of converting them into Err.
 * Use fromThrowable to capture thrown or rejected failures as Err values.
 *
 * @template A, E
 * @typedef {() => Promise<import("../result/index.js").Result<A, E>>} TaskResult
 */


/**
 * Creates a task resolving to Ok with a captured value.
 * Every run returns the same Ok wrapper. The value is not cloned or awaited.
 *
 * @template A
 * @param {A} value - The successful payload to capture.
 * @returns {TaskResult<A, never>} The task for the captured Ok.
 * @example
 * await ok("Link")(); // { type: "ok", value: "Link" }
 */
export const ok = (value) => Task.of(Result.ok(value));


/**
 * Creates a task resolving to Err with a captured error, without rejecting.
 * Every run returns the same Err wrapper.
 *
 * @template E
 * @param {E} error - The failure payload; an Error instance is not required.
 * @returns {TaskResult<never, E>} The task for the captured Err.
 * @example
 * await err("No stamina")(); // { type: "err", error: "No stamina" }
 */
export const err = (error) => Task.of(Result.err(error));


/**
 * Creates a task converting null or undefined to Err; other values become Ok.
 * Calls onNull only for a missing value, once per run. Callback throws reject the task.
 *
 * @template E
 * @param {(value: null | undefined) => E} onNull - Receives the original null or undefined.
 * @returns {<A>(value: A) => TaskResult<NonNullable<A>, E>}
 * A function capturing a possibly missing value.
 * @example
 * const check = fromNullable(value => value === null ? "Null" : "Undefined");
 * await check(null)(); // { type: "err", error: "Null" }
 * await check(undefined)(); // { type: "err", error: "Undefined" }
 */
export const fromNullable = (onNull) => (value) =>
    Task.defer(() => Result.fromNullable(onNull)(value));


/**
 * Creates a task testing a captured value on each run.
 * Returns Ok when the predicate passes, otherwise Err from onFalse.
 * Callbacks run synchronously; their throws reject the task.
 *
 * @template A, E
 * @param {Object} options - The condition and error factory.
 * @param {(value: A) => boolean} options.predicate - Tests the captured value.
 * @param {(value: A) => E} options.onFalse - Receives the value only when the predicate fails.
 * @returns {(value: A) => TaskResult<A, E>} A function capturing the value to test.
 * @example
 * const check = fromPredicate({ predicate: n => n > 0, onFalse: () => "No stamina" });
 * await check(0)(); // { type: "err", error: "No stamina" }
 */
export const fromPredicate = ({ predicate, onFalse }) => (value) =>
    Task.defer(() => Result.fromPredicate({ predicate, onFalse })(value));


/**
 * Creates a task converting Some to Ok and None to Err on each run.
 * Calls onNone only for None; its throws reject the task. The captured Option and
 * its value are not cloned.
 *
 * @template E
 * @param {() => E} onNone - Supplies the error payload for None.
 * @returns {<A>(option: import("../option/index.js").Option<A>) => TaskResult<A, E>}
 * A function capturing an Option.
 * @example
 * await fromOption(() => "Hero missing")(Option.none)(); // { type: "err", error: "Hero missing" }
 */
export const fromOption = (onNone) => (option) => async ()=>
    Result.fromOption(onNone)(option);


/**
 * Creates a task returning the same captured Result on every run.
 * The Result's value or error is not inspected, cloned, or awaited.
 *
 * @template A, E
 * @param {import("../result/index.js").Result<A, E>} result - The Result to capture.
 * @returns {TaskResult<A, E>} The task for the captured Result.
 * @example
 * await fromResult(Result.ok("Link"))(); // { type: "ok", value: "Link" }
 */
export const fromResult = (result) => Task.of(result);



/**
 * Wraps a task's fulfilled value in Ok on each execution.
 * Rejections propagate; they are not converted to Err. A source throw before it
 * returns a promise throws directly when the resulting task is called.
 *
 * @template A
 * @param {import("../task/index.js").Task<A>} task - The task to execute and wrap.
 * @returns {TaskResult<A, never>} The task wrapping the source value in Ok.
 * @example
 * await fromTask(Task.of("Link"))(); // { type: "ok", value: "Link" }
 */
export const fromTask = (task) => Task.map(Result.ok)(task);


/**
 * Defers a function call and captures its outcome as a Result.
 * Awaits returned promises or thenables. Synchronous throws and rejections become
 * Err with the original failure payload. Calls the function again on every execution.
 * A returned Result is wrapped in Ok as data, rather than flattened.
 *
 * @template A
 * @param {() => A | PromiseLike<A>} func - Called without arguments on each execution.
 * @returns {TaskResult<A, unknown>} The task capturing success or failure.
 * @example
 * await fromThrowable(async () => "Link")(); // { type: "ok", value: "Link" }
 * await fromThrowable(() => { throw new Error("Offline"); })();
 * // { type: "err", error: new Error("Offline") }
 */
export const fromThrowable = (func) => async() => {
    try {
        return Result.ok(await func());
    } catch (error) {
        return Result.err(error);
    }
}


/**
 * Transforms Ok on each run; preserves Err. Stores the output without awaiting it.
 * A callback throw rejects the task; a source throw before returning a promise
 * throws directly.
 *
 * @template A, B
 * @param {(value: A) => B} transform - Receives the Ok payload only.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<B, E>} A function mapping Ok values.
 * @example
 * await map(health => health + 1)(ok(3))(); // { type: "ok", value: 4 }
 * const result = await map(async health => health + 1)(ok(3))();
 * result.type; // "ok"
 * result.value instanceof Promise; // true
 * await result.value; // 4
 */
export const map = (transform) => (task) =>
    Task.map(Result.map(transform))(task);


/**
 * Transforms Err on each run; preserves Ok. Stores the output without awaiting it.
 * Source rejections skip transform. A callback throw rejects the task; a source throw
 * before returning a promise throws directly.
 *
 * @template E, F
 * @param {(error: E) => F} transform - Receives the Err payload only.
 * @returns {<A>(task: TaskResult<A, E>) => TaskResult<A, F>} A function mapping Err values.
 * @example
 * await mapError(message => message.toUpperCase())(err("Offline"))();
 * // { type: "err", error: "OFFLINE" }
 */
export const mapError = (transform) => (task) =>
    Task.map(Result.mapError(transform))(task);


/**
 * Transforms the matching branch on each run, preserving its tag.
 * Stores the output without awaiting it. Source rejections skip both callbacks.
 * A callback throw rejects the task; a source throw before returning a promise throws directly.
 *
 * @template A, B, E, F
 * @param {Object} options - The transformations for each branch.
 * @param {(value: A) => B} options.onOk - Transforms the successful payload.
 * @param {(error: E) => F} options.onErr - Transforms the error payload.
 * @returns {(task: TaskResult<A, E>) => TaskResult<B, F>} A function mapping either branch.
 * @example
 * const label = mapBoth({ onOk: name => `Hero: ${name}`, onErr: message => `Error: ${message}` });
 * await label(ok("Link"))(); // { type: "ok", value: "Hero: Link" }
 */
export const mapBoth = ({ onOk, onErr }) => (task) =>
    Task.map(Result.mapBoth({ onOk, onErr }))(task);


/**
 * Chains Ok into another TaskResult and runs it; preserves an existing Err.
 * The callback may return the next task or a promise of it. Returns the next Result,
 * including Err. Callback and next-task throws or rejections reject the task;
 * a source throw before returning a promise throws directly.
 *
 * @template A, B, F
 * @param {(value: A) => TaskResult<B, F> | PromiseLike<TaskResult<B, F>>} transform -
 * Supplies the next task for Ok.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<B, E | F>} A function chaining TaskResults.
 * @example
 * const heal = flatMap(health => health > 0 ? ok(health + 1) : err("Defeated"));
 * await heal(ok(3))(); // { type: "ok", value: 4 }
 * await heal(ok(0))(); // { type: "err", error: "Defeated" }
 */
export const flatMap = (transform) => (task) => {
    const callback = (result) =>
        Result.isOk(result) ? transform(result.value) : Task.of(result);

    return Task.flatMap(callback)(task)
};


/**
 * Chains Ok into a synchronous Result on each run; preserves an existing Err.
 * A callback throw rejects the task; a source throw before returning a promise throws directly.
 *
 * @template A, B, F
 * @param {(value: A) => import("../result/index.js").Result<B, F>} transform -
 * Supplies the next Result for Ok.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<B, E | F>}
 * A function chaining a Result operation.
 * @example
 * const heal = flatMapResult(health => health > 0 ? Result.ok(health + 1) : Result.err("Defeated"));
 * await heal(ok(0))(); // { type: "err", error: "Defeated" }
 */
export const flatMapResult = (transform) => (task) =>
    Task.map(Result.flatMap(transform))(task);


/**
 * Chains Ok into a synchronous Option on each run; preserves an existing Err.
 * Some becomes Ok; None becomes Err from onNone, which receives the original Ok value.
 * Callback throws reject the task; a source throw before returning a promise throws directly.
 *
 * @template A, B, F
 * @param {Object} options - The Option transformation and missing-value error factory.
 * @param {(value: A) => import("../option/index.js").Option<B>} options.transform -
 * Supplies an Option for Ok.
 * @param {(value: A) => F} options.onNone - Supplies the error when transform returns None.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<B, E | F>}
 * A function chaining an Option operation.
 * @example
 * const lookup = flatMapOption({
 *     transform: name => name === "Link" ? Option.some("Bow") : Option.none,
 *     onNone: name => `No item for ${name}`,
 * });
 * await lookup(ok("Link"))(); // { type: "ok", value: "Bow" }
 * await lookup(ok("Zelda"))(); // { type: "err", error: "No item for Zelda" }
 */
export const flatMapOption = ({ transform, onNone }) => (task) =>
    Task.map(Result.flatMapOption({transform, onNone}))(task);


/**
 * Runs an outer TaskResult, then the task inside its Ok payload.
 * An outer Err skips the inner task. Otherwise, returns the inner Result, including Err.
 * Rejections propagate. An inner-task throw rejects the returned promise; an
 * outer-task throw before returning a promise throws directly.
 *
 * @template A, E, F
 * @param {TaskResult<TaskResult<A, F>, E>} task - The task containing another task on success.
 * @returns {TaskResult<A, E | F>} The task for the inner Result.
 * @example
 * await flatten(ok(ok("Link")))(); // { type: "ok", value: "Link" }
 * await flatten(ok(err("Offline")))(); // { type: "err", error: "Offline" }
 */
export const flatten = (task) => {
    const callback = (result) =>
        Result.isOk(result) ? result.value : Task.of(result);

        return Task.flatMap(callback)(task);
}



/**
 * Keeps a passing Ok or replaces it with Err from onFalse; preserves an existing Err.
 * Callbacks run synchronously during execution. Their throws reject the task;
 * a source throw before returning a promise throws directly.
 *
 * @template A, F
 * @param {Object} options - The success condition and error factory.
 * @param {(value: A) => boolean} options.predicate - Tests the successful payload.
 * @param {(value: A) => F} options.onFalse - Supplies an error when the predicate fails.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<A, E | F>} A function filtering Ok values.
 * @example
 * const check = filterOrElse({ predicate: n => n > 0, onFalse: () => "No stamina" });
 * await check(ok(0))(); // { type: "err", error: "No stamina" }
 */
export const filterOrElse = ({ predicate, onFalse }) => (task) =>
    Task.map(Result.filterOrElse({ predicate, onFalse }))(task);


/**
 * Recovers Err by running a fallback task; preserves Ok. Rejections bypass recovery.
 * The callback may return a task or a promise of it. Returns the fallback Result,
 * including Err. Callback and fallback-task throws or rejections reject the task;
 * a source throw before returning a promise throws directly.
 *
 * @template E, B, F
 * @param {(error: E) => TaskResult<B, F> | PromiseLike<TaskResult<B, F>>} fallback -
 * Supplies a recovery task for Err.
 * @returns {<A>(task: TaskResult<A, E>) => TaskResult<A | B, F>} A function recovering from Err.
 * @example
 * await orElse(() => ok("Guest"))(err("Hero missing"))(); // { type: "ok", value: "Guest" }
 */
export const orElse = (fallback) => (task) => {
    const callback = (result) =>
        Result.isErr(result) ? fallback(result.error) : Task.of(result);

    return Task.flatMap(callback)(task);
}


/**
 * Runs an effect for Ok and returns the same Result; skips Err.
 * Ignores the effect's return value without awaiting it; use tapAsync for async effects.
 * An effect throw rejects the task; a source throw before returning a promise throws directly.
 *
 * @template A
 * @param {(value: A) => unknown} effect - Observes the Ok value.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<A, E>} A function observing Ok values.
 * @example
 * const seen = [];
 * await tap(value => seen.push(value))(ok("Link"))(); // { type: "ok", value: "Link" }
 * seen; // ["Link"]
 */
export const tap = (effect) => (task) => () =>
    task().then(result => {
        if (Result.isOk(result)) {
            effect(result.value);
        }

        return result;
    });


/**
 * Awaits an effect for Ok and returns the same Result object.
 * Skips the effect for Err. Source or effect throws and rejections reject the task.
 *
 * @template A
 * @param {(value: A) => unknown} effect - Observes the Ok value; may return a promise.
 * @returns {<E>(task: TaskResult<A, E>) => TaskResult<A, E>} A function awaiting an effect for Ok.
 * @example
 * const seen = [];
 * await tapAsync(async value => {
 *     await Promise.resolve();
 *     seen.push(value);
 * })(ok("Link"))(); // { type: "ok", value: "Link" }
 * seen; // ["Link"]
 */
export const tapAsync = (effect) => (task) => async () => {
    const result = await task();

    if (Result.isOk(result)) {
        await effect(result.value);
    }

    return result;
}


/**
 * Runs an effect for Err and returns the same Result; skips Ok and source rejections.
 * Ignores the effect's return value without awaiting it; use tapErrorAsync for async effects.
 * An effect throw rejects the task; a source throw before returning a promise throws directly.
 *
 * @template E
 * @param {(error: E) => unknown} effect - Observes the Err value.
 * @returns {<A>(task: TaskResult<A, E>) => TaskResult<A, E>} A function observing Err values.
 * @example
 * const seen = [];
 * await tapError(error => seen.push(error))(err("Offline"))(); // { type: "err", error: "Offline" }
 * seen; // ["Offline"]
 */
export const tapError = (effect) => (task) => () =>
    task().then(result => {
        if (Result.isErr(result)) {
            effect(result.error);
        }

        return result;
    });


/**
 * Awaits an effect for Err and returns the same Result object.
 * Skips the effect for Ok and for rejected promises. Source or effect throws and
 * rejections reject the task.
 *
 * @template E
 * @param {(error: E) => unknown} effect - Observes the Err value; may return a promise.
 * @returns {<A>(task: TaskResult<A, E>) => TaskResult<A, E>} A function awaiting an effect for Err.
 * @example
 * const seen = [];
 * await tapErrorAsync(async error => {
 *     await Promise.resolve();
 *     seen.push(error);
 * })(err("Offline"))(); // { type: "err", error: "Offline" }
 * seen; // ["Offline"]
 */
export const tapErrorAsync = (effect) => (task) => async () => {
    const result = await task();

    if (Result.isErr(result)) {
        await effect(result.error);
    }

    return result;
}


/**
 * Unwraps Ok or calls fallback for Err, producing a plain Task.
 * Awaits the selected value if promise-like. Source rejections skip fallback.
 * A fallback throw rejects the task; a source throw before returning a promise throws directly.
 *
 * @template E, B
 * @param {(error: E) => B} fallback - Receives the Err payload and returns a value or promise.
 * @returns {<A>(task: TaskResult<A, E>) => import("../task/index.js").Task<Awaited<A | B>>}
 * A function unwrapping a TaskResult.
 * @example
 * await getOrElse(() => "Guest")(err("Hero missing"))(); // "Guest"
 */
export const getOrElse = (fallback) => (task) =>
    Task.map(Result.getOrElse(fallback))(task);


/**
 * Calls the matching handler, producing a plain Task that awaits its output.
 * Source rejections skip both handlers. A callback throw rejects the task;
 * a source throw before returning a promise throws directly.
 *
 * @template A, B, E, C
 * @param {Object} options - The handlers for each Result branch.
 * @param {(value: A) => B} options.onOk - Handles the Ok value; may return a promise.
 * @param {(error: E) => C} options.onErr - Handles the Err value; may return a promise.
 * @returns {(task: TaskResult<A, E>) => import("../task/index.js").Task<Awaited<B | C>>}
 * A function handling either branch.
 * @example
 * const describe = match({ onOk: name => `Hello, ${name}`, onErr: error => `Error: ${error}` });
 * await describe(ok("Link"))(); // "Hello, Link"
 */
export const match = ({ onOk, onErr }) => (task) =>
    Task.map(Result.match({ onOk, onErr }))(task);


/**
 * Runs tasks sequentially, collecting Ok values in iteration order.
 * Stops at the first Err and returns it unchanged. Throws or rejections also stop
 * execution and reject the task. Empty input resolves to Ok([]).
 * Each run traverses the iterable again; iterators may be single-use.
 *
 * @template A, E
 * @param {Iterable<TaskResult<A, E>>} tasks - Tasks to execute in iteration order.
 * @returns {TaskResult<A[], E>} The task collecting sequential results.
 * @example
 * const visited = [];
 * const later = async () => { visited.push("Zelda"); return Result.ok("Zelda"); };
 * await all([err("Offline"), later])(); // { type: "err", error: "Offline" }
 * visited; // []
 */
export const all = (tasks) => async () => {
    const outputs = [];

    for (const task of tasks) {
        const result = await task();

        if (Result.isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return Result.ok(outputs);
}


/**
 * Starts tasks concurrently and collects Ok values in input order.
 * Err does not stop work. After all fulfill, returns the first Err in input order,
 * or Ok with all values. Empty input resolves to Ok([]). Repeats tasks on each run.
 * Rejections do not cancel running tasks. A synchronous source throw rejects the
 * combined task and prevents later tasks from starting.
 *
 * @template A, E
 * @param {ReadonlyArray<TaskResult<A, E>>} tasks - Tasks to run; the array must have no holes.
 * @returns {TaskResult<A[], E>} The task collecting parallel results.
 * @example
 * const visited = [];
 * const later = async () => { visited.push("Zelda"); return Result.ok("Zelda"); };
 * await allParallel([err("Offline"), later])(); // { type: "err", error: "Offline" }
 * visited; // ["Zelda"]
 */
export const allParallel = (tasks) =>
    Task.map(Result.all)(Task.all(tasks));


/**
 * Runs at most concurrency tasks at once, collecting values in input order.
 * Err does not stop queued work, even with concurrency 1. After all fulfill, returns
 * the first Err in input order, or Ok with all values. Empty input resolves to Ok([]).
 * A throw or rejection rejects the task and stops queued work once observed;
 * running tasks are not cancelled. Scheduling resets each run.
 *
 * @param {number} concurrency - A positive safe integer, validated immediately.
 * @returns {<A, E>(tasks: ReadonlyArray<TaskResult<A, E>>) => TaskResult<A[], E>}
 * A function collecting tasks with limited concurrency.
 * @throws {RangeError} If concurrency is not a positive safe integer.
 * @example
 * const visited = [];
 * const later = async () => { visited.push("Zelda"); return Result.ok("Zelda"); };
 * await allParallelLimit(1)([err("Offline"), later])(); // { type: "err", error: "Offline" }
 * visited; // ["Zelda"]
 */
export const allParallelLimit = (concurrency) =>
    traverseParallelLimit({ concurrency, transform: task => task });


/**
 * Creates and runs tasks sequentially, collecting Ok values in iteration order.
 * Stops at the first Err without transforming later elements. Throws or rejections
 * stop iteration and reject the task. Empty input resolves to Ok([]).
 * Each run traverses the iterable again; iterators may be single-use.
 *
 * @template A, B, E
 * @param {(value: A) => TaskResult<B, E>} transform - Creates each task during execution.
 * @returns {(values: Iterable<A>) => TaskResult<B[], E>}
 * A function collecting sequential task results.
 * @example
 * const visited = [];
 * const load = traverse(name => {
 *     visited.push(name);
 *     return name === "Link" ? err("Offline") : ok(name);
 * });
 * await load(["Link", "Zelda"])(); // { type: "err", error: "Offline" }
 * visited; // ["Link"]
 */
export const traverse = (transform) => (values) => async () => {
    const outputs = [];

    for (const value of values) {
        const task = transform(value)
        const result = await task()

        if (Result.isErr(result)) {
            return result;
        }

        outputs.push(result.value);
    }

    return Result.ok(outputs);
}


/**
 * Creates and runs tasks concurrently, collecting Ok values in input order.
 * Err does not stop work. After all fulfill, returns the first Err in input order,
 * or Ok with all values. Empty input resolves to Ok([]). Repeats transforms and tasks each run.
 * Rejections do not cancel running tasks. A synchronous transform or task throw
 * rejects the combined task and skips later elements. Supply an array without holes:
 * skipped elements leave undefined Results, which can cause a TypeError during collection.
 *
 * @template A, B, E
 * @param {(value: A) => TaskResult<B, E>} transform - Creates a task from each element in input order.
 * @returns {(values: ReadonlyArray<A>) => TaskResult<B[], E>}
 * A function collecting parallel task results.
 * @example
 * const visited = [];
 * const load = traverseParallel(name => {
 *     visited.push(name);
 *     return name === "Link" ? err("Offline") : ok(name);
 * });
 * await load(["Link", "Zelda"])(); // { type: "err", error: "Offline" }
 * visited; // ["Link", "Zelda"]
 */
export const traverseParallel = (transform) => (values) =>
    Task.map(Result.all)(Task.traverse(transform)(values));


/**
 * Creates and runs at most concurrency tasks at once, starting the next when a slot opens.
 * Err does not stop queued work. After all fulfill, returns the first Err in input order,
 * or Ok with values in input order. Empty input resolves to Ok([]).
 * Throws or rejections reject the task and stop queued work once observed, without
 * cancelling running tasks. Scheduling resets each run.
 *
 * @template A, B, E
 * @param {Object} options - The concurrency limit and task factory.
 * @param {number} options.concurrency - A positive safe integer, validated immediately.
 * @param {(value: A) => TaskResult<B, E>} options.transform - Creates a task when a slot opens.
 * @returns {(values: ReadonlyArray<A>) => TaskResult<B[], E>}
 * A function collecting tasks with limited concurrency.
 * @throws {RangeError} If concurrency is not a positive safe integer.
 * @example
 * let active = 0;
 * let peak = 0;
 * const load = traverseParallelLimit({
 *     concurrency: 2,
 *     transform: name => async () => {
 *         peak = Math.max(peak, ++active);
 *         await Promise.resolve();
 *         active--;
 *         return Result.ok(name);
 *     },
 * });
 * await load(["Link", "Zelda", "Epona"])(); // { type: "ok", value: ["Link", "Zelda", "Epona"] }
 * peak; // 2
 */
export const traverseParallelLimit = ({ concurrency, transform }) => {
    if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
        throw new RangeError('concurrency must be a positive safe integer');
    }

    return (values) => async () => {
        const results = new Array(values.length);

        let index = 0;
        let stopped = false;

        const worker = async () => {
            while (!stopped && index < values.length) {
                const currentIndex = index;
                index ++;

                try {
                    results[currentIndex] = await transform(values[currentIndex])();
                } catch (error) {
                    stopped = true;
                    throw error;
                }
            }
        }

        const workers = []
        const parallel = Math.min(concurrency, values.length);

        for (let count = 0; count < parallel; count++) {
            workers.push(worker());
        }

        await Promise.all(workers);

        return Result.all(results);
    }
}


/**
 * Runs and awaits cleanup after the source settles, including after a throw or rejection.
 * If cleanup succeeds, preserves the original Result or rejection. If cleanup fails
 * after Ok, rejects with the cleanup failure. After Err or a source failure, rejects
 * with AggregateError whose errors array contains [original error, cleanup error].
 * The original error is the Err payload or the source's thrown value or rejection reason.
 * Cleanup runs once on every execution; its failures are not converted into Err.
 *
 * @param {() => unknown} cleanup - Cleanup to run and await without arguments.
 * @returns {<A, E>(task: TaskResult<A, E>) => TaskResult<A, E>} A function attaching cleanup.
 * @example
 * const events = [];
 * const load = withCleanup(async () => {
 *     await Promise.resolve();
 *     events.push("cleaned");
 * })(err("Offline"));
 * await load(); // { type: "err", error: "Offline" }
 * events; // ["cleaned"]
 */
export const withCleanup = (cleanup) => (task) => async () => {
    let result;

    let taskError;
    let taskFailed = false;

    try {
        result = await task();
    } catch (error) {
        taskError = error;
        taskFailed = true;
    }

    try {
        await cleanup();
    } catch (error) {
        if (taskFailed) {
            throw new AggregateError([taskError, error]);
        }

        if (Result.isErr(result)) {
            throw new AggregateError([result.error, error]);
        }

        throw error;
    }

    if (taskFailed) {
        throw taskError;
    }

    return result;
}



/**
 * Retries an Err when the retry policy allows it, waiting between attempts.
 * The attempt limit includes the first run. Callbacks receive the failed attempt's
 * number, starting at 1, and are skipped for Ok or the final attempt. Calls delay only
 * if retryOn permits another attempt. Throws and rejections reject the task without
 * retrying. The attempt count resets on each execution.
 *
 * @template E
 * @param {Object} options - The retry limit, policy, and delay calculation.
 * @param {number} options.attempts - A positive safe integer, validated immediately.
 * @param {(error: E, attempt: number) => boolean} options.retryOn -
 * Whether to retry the error from this attempt.
 * @param {(error: E, attempt: number) => number} options.delay -
 * Delay in milliseconds: an integer from 0 to 2147483647. An invalid delay rejects the task with
 * RangeError when a retry is scheduled.
 * @returns {<A>(task: TaskResult<A, E>) => TaskResult<A, E>} A function retrying Err results.
 * @throws {RangeError} If attempts is not a positive safe integer.
 * @example
 * let calls = 0;
 * const source = async () => ++calls < 2 ? Result.err("Offline") : Result.ok("Link");
 * const load = retry({ attempts: 3, retryOn: error => error === "Offline", delay: () => 0 })(source);
 * await load(); // { type: "ok", value: "Link" }
 * calls; // 2
 */
export const retry = ({ attempts, retryOn, delay }) => {
    if (!Number.isSafeInteger(attempts) || attempts < 1) {
        throw new RangeError('attempts must be a positive integer');
    }

    return (task) => async () => {
        for (let attempt = 1; attempt <= attempts; attempt++) {
            const result = await task();

            if (Result.isOk(result) || attempt === attempts || !retryOn(result.error, attempt)) {
                return result;
            }

            await Task.sleep(delay(result.error, attempt))();
        }
    }
}
