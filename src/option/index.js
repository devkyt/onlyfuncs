
const some = (value) => ({ type: "some", value });

const isSome = (option) => option.type === "some";

const none = { type: "none" };

const isNone = (option) => option.type === "none";

const fromNullable = (value) => value === null || value === undefined ? none : some(value);

export { some, isSome, none, isNone, fromNullable };