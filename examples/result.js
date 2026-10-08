import { pipe } from "../src/function/index.js";
import * as Result from "../src/result/index.js";


const petOf = (user) => {
    if (user?.pet && typeof user.pet === "string") {
        const pet = user.pet.trim()

        if (pet.length > 0) {
            return Result.ok(pet);
        }
    }

    return Result.err("Pet name is required");
}



const pet = (value) => pipe(Result.fromThrowable(() => JSON.parse(value)),
    Result.mapError((err) => "Invalid JSON"),
    Result.flatMap(petOf),
    Result.getOrElse((err) => `Cannot choose a pet: ${err}`)
)


console.log(pet('{"pet": "dog"}'));
console.log(pet('{"pet": "      "}'));
console.log(pet('{}'));
console.log(pet('null'));
console.log(pet('{"pet": 21}'));
console.log(pet('{'));