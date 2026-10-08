import { pipe } from '../src/function/index.js';
import { fromNullable, map, filter, getOrElse } from '../src/option/index.js';


const pet = (user) => pipe(user?.pet,
    fromNullable,
    map((value) => value.trim()),
    filter((value) => value.length > 0),
    getOrElse(() => "dog")
)


console.log(pet({ name: "Indiana Jones", pet: " snake   "}));