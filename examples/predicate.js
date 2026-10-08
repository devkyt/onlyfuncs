import * as Predicate from "../src/predicate/index.js";


const heroes = [
    { name: "Link", health: 100, stamina: 20, magic: 0 },
    { name: "Zelda", health: 80, stamina: 0, magic: 30 },
    { name: "Ganondorf", health: 0, stamina: 50, magic: 50 },
    { name: "Tingle", health: 40, stamina: 0, magic: 0 },
];


const biggerThan = (value) => (number) => number > value;


const isAlive = Predicate.contramap(hero => hero.health)(biggerThan(0));


const hasStamina = Predicate.contramap(hero => hero.stamina)(biggerThan(5));


const hasMagic = Predicate.contramap(hero => hero.magic)(biggerThan(5));


const canAttack = Predicate.and(isAlive, Predicate.or(hasStamina, hasMagic));


const activeHeroes = heroes.filter(canAttack);


console.log(activeHeroes);


const attack = hero => hasStamina(hero) ? { ...hero, stamina: hero.stamina - 5 } : { ...hero, magic: hero.magic - 5 }


const actedHeroes = activeHeroes.map(attack);


console.log(actedHeroes);


console.log(actedHeroes[0] === activeHeroes[0]);