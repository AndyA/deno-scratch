type Mapper<I, O> = (input: I) => O;
type Accepts<M> = M extends Mapper<infer I, infer O> ? I : never;
type Returns<M> = M extends Mapper<infer I, infer O> ? O : never;

type Combine<M, I> = M extends readonly [Mapper<I, infer O>] ? Mapper<I, O>
  : M extends readonly [Mapper<I, infer O>, ...infer Rest] ? Combine<Rest, O>
  : never;

type Mappers<I, O> = readonly [Mapper<I, O>];

type Two<Left, Right> = Returns<Left> extends Accepts<Right>
  ? Accepts<Right> extends Returns<Left> ? readonly [Left, Right] : never
  : never;

type Twople<T> = T extends [infer Left, infer Right] ? Two<Left, Right> : never;

type Twinke<I, O> = readonly [Mapper<I, unknown>, Mapper<unknown, O>] extends
  readonly [Mapper<I, infer IO>, Mapper<infer OI, O>]
  ? IO extends OI
    ? OI extends IO ? readonly [Mapper<I, IO>, Mapper<OI, O>] : never
  : never
  : never;

type Some<I, O> = Mappers<I, O>;

type A = number;
type B = string;
type C = boolean;

const AB = (a: A): B => `value: ${a}`;
const BC = (b: B): C => b.length > 0;

type T1 = Returns<typeof AB>;
type Foo = Twinke<typeof AB, typeof BC>;

const pipe: Some<A, B> = [AB /*BC*/] as const;

// type Foo = Combine<typeof pipe, A>;

const combine = <I, O>(mappers: Some<I, O>): Mapper<I, O> => {
  if (mappers.length === 1) return mappers[0];
  throw new Error(`Too much!`);
};

const foo = combine([AB]);
console.log(foo(123));

// const combine = <M extends CheckMappers, I>(mappers: Mapper<unknown, unknown>[]) => {
// };

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

export const Sneaky = <Base extends Greetable>(base: Base) =>
  class Sneaky extends base {
    sneak() {
      console.log(`Please don't say "${this.hello}"`);
    }
  };

const bless = <T extends object>(proto: T) => (obj: object): T =>
  Object.setPrototypeOf(obj, proto);

const SneakyGreet = Sneaky(Greet);

const greets = docs.map(bless(new SneakyGreet("Hello")));

for (const greet of greets) {
  console.log(greet.hello);
  greet.sneak();
}
