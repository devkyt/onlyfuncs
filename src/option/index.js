
const some = (value) => ({ type: "some", value });

const isSome = (option) => option.type === "some";

const none = { type: "none" };

const isNone = (option) => option.type === "none";

export { some, isSome, none, isNone };