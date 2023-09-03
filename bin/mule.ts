type Mapper<I, O> = (input: I) => O;

const combine =
  <I, O, T>(m1: Mapper<I, T>, m2: Mapper<T, O>): Mapper<I, O> => (input: I) =>
    m2(m1(input));

type Input = { name: string };
type Inter = { person: string };
type Output = { author: string };

// const id = <T>(input: T): T => input;

const m1 = (input: Input): Inter => ({ person: input.name });
const m2 = (input: Inter): Output => ({ author: input.person });
const m3 = (input: Output): Input => ({ name: input.author });

// const my = [m1, m2, m3].reduce(combine, id);

const mx = combine(combine(m1, m2), m3);
console.log(mx({ name: "Andy" }));

const docs = [
  { name: "Andy" },
  { name: "Smoo" },
] as const;

class Greet {
  declare name: string;
  greeting: string;

  constructor(greeting: string) {
    this.greeting = greeting;
  }

  get hello(): string {
    return `${this.greeting} ${this.name}`;
  }
}

// deno-lint-ignore no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

type Greetable = Constructor<{ hello: string }>;

const Shade = <Base extends Greetable>(base: Base) =>
  class Shade extends base {
    shade() {
      console.log(`Please don't say "${this.hello}"`);
    }
  };

const Maybe = <Base extends Greetable>(base: Base) =>
  class Maybe extends base {
    maybe() {
      console.log(`You can maybe say "${this.hello}"`);
    }
  };

const bless = <T extends object>(proto: T) => (obj: object): T =>
  Object.setPrototypeOf(obj, proto);

const MaybeShade = combine(Maybe, Shade);
const ShadyyGreet = MaybeShade(Greet);
// const ShadyyGroat = Maybe(Shade(Groat));

const greets = docs.map(bless(new ShadyyGreet("Hello")));

for (const greet of greets) {
  console.log(greet.hello);
  greet.shade();
  greet.maybe();
}
