/**
 * A computation invoked without arguments to obtain a Promise.
 * Call the task to run it; calling it again reruns its body. Tasks do not cache
 * results automatically. A captured promise may already be running or settled.
 *
 * @template A
 * @typedef {() => Promise<A>} Task
 */

/**
 * Creates a task for a captured value, preserving object references.
 * Functions remain data. Promises and thenables are adopted when the task runs;
 * an already-created promise is not restarted or made lazy.
 *
 * @template A
 * @param {A | PromiseLike<A>} value - The value or promise-like result to capture.
 * @returns {Task<A>} The task for the captured value.
 * @example
 * const hero = of("Link");
 * await hero(); // "Link"
 */
export const of = (value) => () => Promise.resolve(value);


/**
 * Defers a function call until task execution, repeating it on every run.
 * Adopts returned promises and thenables. Synchronous throws become rejections.
 *
 * @template A
 * @param {() => A | PromiseLike<A>} func - Called without arguments on each execution.
 * @returns {Task<A>} The deferred task.
 * @example
 * let calls = 0;
 * const count = defer(() => ++calls);
 * await count(); // 1
 * await count(); // 2
 */
export const defer = (func) => async() =>
    func();


/**
 * Creates a delay task. Each execution schedules a new timer.
 * Validates the delay immediately, before any task is run.
 *
 * @param {number} ms - An integer delay in milliseconds, from 0 through 2147483647.
 * @returns {Task<undefined>} A task resolving to undefined after the delay.
 * @throws {RangeError} If ms is not an integer in the supported range.
 * @example
 * await sleep(0)(); // undefined
 */
export const sleep = (ms) => {
    if (!Number.isInteger(ms) || ms < 0 || ms > 2147483647) {
        throw new RangeError("Milliseconds must be an integer between 0 and 2147483647");
    }

    return () =>
        new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Transforms a task's resolved value, awaiting a returned promise or thenable.
 * Repeats the source and transform on each execution; a rejection skips transform.
 * A callback throw rejects the promise; a source throw before returning a promise
 * throws directly.
 *
 * @template A, B
 * @param {(value: A) => B | PromiseLike<B>} transform - Called once with the fulfilled value.
 * @returns {(task: Task<A>) => Task<B>} A function mapping a task.
 * @example
 * const heal = map(async health => health + 1)(of(3));
 * await heal(); // 4
 */
export const map = (transform) => (task) => () =>
    task().then(transform);


/**
 * Chains a resolved value into another task and runs it.
 * The callback may return the next task or a promise of it. Repeats the chain on
 * each execution; a source rejection skips the callback. Callback and next-task
 * failures reject the promise; a source throw before returning a promise throws directly.
 *
 * @template A, B
 * @param {(value: A) => Task<B> | PromiseLike<Task<B>>} transform -
 * Supplies the next task for the resolved value.
 * @returns {(task: Task<A>) => Task<B>} A function chaining tasks.
 * @example
 * const heal = flatMap(health => of(health + 1))(of(3));
 * await heal(); // 4
 */
export const flatMap = (transform) => (task) => () =>
    task().then(transform).then((t) => t());


/**
 * Removes one nested Task layer by running the outer task, then the resolved task.
 * Runs the inner task only if the outer task fulfills. Rejections propagate.
 * An outer-task throw before returning a promise throws directly; an inner-task
 * throw rejects the returned promise.
 *
 * @template A
 * @param {Task<Task<A>>} task - A task resolving to another task.
 * @returns {Task<A>} The task for the inner result.
 * @example
 * await flatten(of(of("Link")))(); // "Link"
 */
export const flatten = (task) => () =>
    task().then((t) => t());


/**
 * Runs an effect after fulfillment and preserves the value; skips the effect on rejection.
 * Repeats on each execution. Ignores the effect's return value without awaiting it;
 * use tapAsync for async effects. An effect throw rejects the promise; a source throw
 * before returning a promise throws directly.
 *
 * @template A
 * @param {(value: A) => unknown} effect - Observes the resolved value.
 * @returns {(task: Task<A>) => Task<A>} A function adding a synchronous effect.
 * @example
 * const seen = [];
 * const hero = tap(name => { seen.push(name); })(of("Link"));
 * await hero(); // "Link"
 * seen; // ["Link"]
 */
export const tap = (effect) => (task) => () =>
    task().then(result => {
        effect(result);
        return result;
    });


/**
 * Awaits an effect after fulfillment and preserves the value; skips it on failure.
 * Repeats on each execution. Source or effect throws and rejections reject the task.
 *
 * @template A
 * @param {(value: A) => unknown} effect - Observes the resolved value; may return a promise.
 * @returns {(task: Task<A>) => Task<A>} A function adding an awaited effect.
 * @example
 * const seen = [];
 * const hero = tapAsync(async name => {
 *     await Promise.resolve();
 *     seen.push(name);
 * })(of("Link"));
 * await hero(); // "Link"
 * seen; // ["Link"]
 */
export const tapAsync = (effect) => (task) => async () => {
    const result = await task();

    await effect(result);

    return result;
}


/**
 * Runs tasks concurrently and collects their results in input order.
 * Each execution calls the supplied task functions again and produces a new array.
 * Empty input resolves to an empty array. Rejections do not cancel started tasks.
 * A synchronous task throw rejects the combined task and prevents later tasks
 * from starting.
 * Array holes become undefined entries in the output.
 *
 * @template A
 * @param {ReadonlyArray<Task<A>>} tasks - Tasks invoked without arguments in array order.
 * @returns {Task<A[]>} The task collecting all values.
 * @example
 * await all([of("Link"), of("Zelda")])(); // ["Link", "Zelda"]
 */
export const all = (tasks) => async () => {
    const promises = tasks.map((task) => task());
    return Promise.all(promises);
}


/**
 * Creates and runs tasks concurrently, collecting values in input order.
 * Repeats transforms and tasks on each execution. Empty input resolves to [].
 * Rejections do not cancel running tasks. A synchronous transform or task throw rejects
 * the combined task and skips later inputs. Array holes skip transform and produce undefined.
 *
 * @template A, B
 * @param {(value: A) => Task<B>} transform - Creates a task from each value, without an index.
 * @returns {(values: ReadonlyArray<A>) => Task<B[]>} A function collecting transformed tasks.
 * @example
 * const healAll = traverse(health => of(health + 1))([2, 3]);
 * await healAll(); // [3, 4]
 */
export const traverse = (transform) => (values) => async () => {
    const promises = values.map((value) => {
        const task = transform(value);
        return task();
    });

    return Promise.all(promises);
}


/**
 * Awaits cleanup after the source succeeds, rejects, or throws synchronously.
 * Repeats the source and cleanup on each execution. Successful cleanup preserves
 * the original outcome. Cleanup failure after source success rejects with that
 * failure. If both fail, rejects with an AggregateError whose errors array holds
 * [sourceError, cleanupError].
 *
 * @param {() => unknown} cleanup - Cleanup to run and await without arguments.
 * @returns {<A>(task: Task<A>) => Task<A>} A function attaching cleanup.
 * @example
 * const events = [];
 * const loadHero = defer(() => { events.push("loaded"); return "Link"; });
 * const hero = withCleanup(() => { events.push("cleaned"); })(loadHero);
 * await hero(); // "Link"
 * events; // ["loaded", "cleaned"]
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
        throw taskFailed
            ? new AggregateError([taskError, error])
            : error;
    }

    if (taskFailed) {
        throw taskError;
    }

    return result;
}
