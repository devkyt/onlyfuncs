import {none, some} from "../option/index.js";

/**
 * A synchronous check of a single value. Predicate helpers do not await promises.
 *
 * @template A
 * @callback Predicate
 * @param {A} value - The value to check.
 * @returns {boolean} Whether the value passes the check.
 */

/**
 * Negates a predicate's result. The predicate runs when the returned function is
 * called, even with undefined.
 * Callback exceptions propagate.
 *
 * @template A
 * @param {Predicate<A>} predicate - Called once with the original input value.
 * @returns {Predicate<A>} A predicate returning the logical opposite of the result.
 * @example
 * const defeated = not(health => health > 0);
 * defeated(0); // true
 */
export const not = (predicate) => (value) => !predicate(value);


/**
 * Requires all predicates to pass, checking left to right on each invocation.
 * Stops at the first falsy result. With no predicates, always returns true.
 * Callback exceptions propagate and prevent later checks from running.
 *
 * @template A
 * @param {...Predicate<A>} predicates - Synchronous checks receiving the same input value.
 * @returns {Predicate<A>} A predicate that passes only when every check passes.
 * @example
 * const canAttack = and(hero => hero.health > 0, hero => hero.stamina > 0);
 * canAttack({ health: 3, stamina: 0 }); // false
 */
export const and = (...predicates) => (value) =>
    predicates.every((predicate) => predicate(value));


/**
 * Requires at least one predicate to pass, checking left to right on each invocation.
 * Stops at the first truthy result. With no predicates, always returns false.
 * Callback exceptions propagate and prevent later checks from running.
 *
 * @template A
 * @param {...Predicate<A>} predicates - Synchronous checks receiving the same input value.
 * @returns {Predicate<A>} A predicate that passes when any check passes.
 * @example
 * const canHeal = or(hero => hero.potions > 0, hero => hero.knowsCure);
 * canHeal({ potions: 0, knowsCure: true }); // true
 */
export const or = (...predicates) => (value) =>
    predicates.some((predicate) => predicate(value));


/**
 * Adapts a predicate by selecting the value it will check.
 * Each call first runs the selector, then passes its result to the supplied
 * predicate. Callback exceptions propagate.
 *
 * @template A, B
 * @param {function(A): B} selector - Converts the original input into the predicate's input.
 * @returns {function(Predicate<B>): Predicate<A>} A function accepting a predicate
 * for the selected value and returning a predicate for the original input.
 * @example
 * const canCast = contramap(spell => spell.cost)(cost => cost <= 20);
 * canCast({ name: "Blizzard", cost: 10 }); // true
 */
export const contramap = (selector) => (predicate) => (value) =>
    predicate(selector(value));
