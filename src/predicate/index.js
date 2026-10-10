import {none, some} from "../option/index.js";

export const not = (predicate) => (value) => !predicate(value);


export const and = (...predicates) => (value) =>
    predicates.every((predicate) => predicate(value));


export const or = (...predicates) => (value) =>
    predicates.some((predicate) => predicate(value));


export const contramap = (selector) => (predicate) => (value) =>
    predicate(selector(value));