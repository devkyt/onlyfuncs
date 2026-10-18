/**
 * A computation invoked without arguments to obtain a Promise.
 * Call the task to run it; calling it again reruns its body. Tasks do not cache
 * results automatically. A captured promise may already be running or settled.
 *
 * @template A
 * @typedef {function(): Promise<A>} Task
 */

/**
 * Creates a task resolving to a captured value, preserving object references.
 * Functions are kept as data. Promises and thenables are adopted on execution;
 * an already-created promise is not restarted or made lazy by this wrapper.
 *
 * @template A
 * @param {(A|PromiseLike<A>)} value - The value or promise-like result to capture.
 * @returns {Task<A>} A task resolving to the captured value or adopting its rejection.
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
 * @param {function(): (A|PromiseLike<A>)} func - Called without arguments on each execution.
 * @returns {Task<A>} A task resolving to the function's result or rejecting with its failure.
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
 * @returns {Task<undefined>} A task resolving to undefined after its timer fires.
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
 * Transforms a task's resolved value and waits for a promise returned by the callback.
 * Each execution calls the source task, then transforms its resolved value.
 * If the source rejects, the transform is skipped. A callback throw rejects the
 * returned promise; a source throw before returning a promise throws directly.
 *
 * @template A, B
 * @param {function(A): (B|PromiseLike<B>)} transform - Called once with the fulfilled value.
 * @returns {function(Task<A>): Task<B>} A function building a task for the transformed result.
 * @example
 * const heal = map(health => health + 1)(of(3));
 * await heal(); // 4
 */
export const map = (transform) => (task) => () =>
    task().then(transform);


/**
 * Chains a task's fulfilled value into another task and executes that task.
 * Each execution calls the source task, the callback, then the next task. The
 * callback may return the next task directly or a promise of that task. Source
 * rejection skips the callback. Callback and next-task failures reject the promise;
 * a source throw before returning a promise throws directly.
 *
 * @template A, B
 * @param {function(A): (Task<B>|PromiseLike<Task<B>>)} transform - Receives the fulfilled
 * value and supplies the next task, which is called without arguments.
 * @returns {function(Task<A>): Task<B>} A function building the sequential task chain.
 * @example
 * const heal = flatMap(health => of(health + 1))(of(3));
 * await heal(); // 4
 */
export const flatMap = (transform) => (task) => () =>
    task().then(transform).then((t) => t());


/**
 * Removes one nested Task layer by running the outer task, then the resolved task.
 * Each execution calls both task functions in sequence. Rejections propagate.
 * An outer-task throw before returning a promise throws directly; an inner-task
 * throw rejects the returned promise.
 *
 * @template A
 * @param {Task<Task<A>>} task - A task resolving to another task.
 * @returns {Task<A>} A task resolving to the inner task's result.
 * @example
 * await flatten(of(of("Link")))(); // "Link"
 */
export const flatten = (task) => () =>
    task().then((t) => t());


/**
 * Runs an effect after source fulfillment and preserves the fulfilled value.
 * Repeats the source and effect on each execution; skips the effect on rejection.
 * Ignores the effect's return value without awaiting it. An effect throw rejects
 * the returned promise; a source throw before returning a promise throws directly.
 * Use tapAsync to wait for an asynchronous effect and propagate its rejection.
 *
 * @template A
 * @param {function(A): *} effect - Called once with the resolved value; its return value is ignored.
 * @returns {function(Task<A>): Task<A>} A function building a task that observes its result.
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
 * Awaits an effect after source fulfillment and preserves the fulfilled value.
 * Repeats the source and effect on each execution; skips the effect on failure.
 * Synchronous throws and promise rejections from either stage reject the task.
 *
 * @template A
 * @param {function(A): *} effect - Receives the fulfilled value. Its result is awaited
 * if promise-like and otherwise ignored.
 * @returns {function(Task<A>): Task<A>} A function building a task that waits for the effect.
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
 *
 * @template A
 * @param {ReadonlyArray<Task<A>>} tasks - Tasks invoked without arguments in array order.
 * @returns {Task<A[]>} A task resolving to all values or rejecting when one task fails.
 * @example
 * await all([of("Link"), of("Zelda")])(); // ["Link", "Zelda"]
 */
export const all = (tasks) => async () => {
    const promises = tasks.map((task) => task());
    return Promise.all(promises);
}


/**
 * Builds and starts a task for each value, collecting results in input order.
 * Runs tasks concurrently; repeats transforms and tasks on every execution.
 * Empty input resolves to an empty array. Rejections do not cancel started work.
 * A synchronous transform or task throw rejects the combined task and skips
 * remaining inputs.
 *
 * @template A, B
 * @param {function(A): Task<B>} transform - Called with each value, without an index.
 * Its returned task is immediately invoked without arguments during execution.
 * @returns {function(ReadonlyArray<A>): Task<B[]>} A function building a task that
 * collects results in a new array.
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
 * @param {function(): *} cleanup - Called once without arguments after the source
 * resolves, rejects, or throws. Its result is awaited if promise-like and then discarded.
 * @returns {<A>(task: Task<A>) => Task<A>} A function building a task that settles
 * only after cleanup finishes.
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
