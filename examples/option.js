import { pipe } from "../src/function/index.js";
import * as Option from "../src/option/index.js";


const petOf = (user) => {
    if (user?.pet && typeof user.pet === "string") {
        const pet = user.pet.trim();

        if (pet.length > 0) {
            return Option.some(pet);
        }
    }

    return Option.none;
}


const pet = (user) => pipe(Option.fromNullable(user),
    Option.flatMap(petOf),
    Option.getOrElse(() => "dog")
)


console.log(pet({ name: "Indiana Jones", pet: " snake   " }));
console.log(pet({ pet: "      " }));
console.log(pet({}));
console.log(pet(null));
console.log(pet({ pet: 21 }));
console.log(pet(undefined));