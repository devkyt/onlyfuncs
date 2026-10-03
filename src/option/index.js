
const some = (value) => ({ type: "some", value });


const isSome = (option) => option.type === "some";


const none = { type: "none" };


const isNone = (option) => option.type === "none";


const fromNullable = (value) => value === null || value === undefined ? none : some(value);


const map = (transform) => (option) => isSome(option) ? some(transform(option.value)) : none;


const flatMap = (transform) => (option) => isSome(option) ? transform(option.value) : none;


const filter = (predicate) => (option) => isSome(option) && predicate(option.value) ? option : none;


export { some, isSome, none, isNone, fromNullable, map, flatMap, filter };