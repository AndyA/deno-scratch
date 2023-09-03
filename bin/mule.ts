const docs = [
  { name: "Andy" },
  { name: "Smoo" },
];

class Greet {
  name = "";
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
    sneak() {
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

const ShadyyGreet = Maybe(Shade(Greet));

const greets = docs.map(bless(new ShadyyGreet("Hello")));

for (const greet of greets) {
  console.log(greet.hello);
  greet.sneak();
  greet.maybe();
}
