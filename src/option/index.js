
const some = (value) => ({ type: "some", value });

const isSome = (option) => option.type === "some";

const none = { type: "none" };

const isNone = (option) => option.type === "none";

const fromNullable = (value) => value === null || value === undefined ? none : some(value);

const map = (fn) => (option) => isSome(option) ? some(fn(option.value)) : none;

export { some, isSome, none, isNone, fromNullable, map };