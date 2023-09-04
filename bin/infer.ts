const example = {
  a: { b: "red", c: "green" },
  d: { e: "blue", f: "yellow" },
  g: "pink",
  h: { i: { j: { k: "gray", l: "grey" } } },
} as const;

type FlattenKeys<
  T extends Record<string, unknown>,
  Key = keyof T,
> = Key extends string
  ? T[Key] extends Record<string, unknown> ? `${Key}.${FlattenKeys<T[Key]>}`
  : `${Key}`
  : never;

type ResolveKey<T, K> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T ? ResolveKey<T[Head], Tail> : never
  : K extends keyof T ? T[K]
  : never;

type Flatten<T extends Record<string, unknown>> = {
  [K in FlattenKeys<T>]: ResolveKey<T, K>;
};

type FlatKeys = Flatten<typeof example>;

const newTypeKey = Symbol("newType");

type NewType<T, N extends string> = {
  readonly value: T;
  readonly [newTypeKey]: N;
};

type Vector = number[];
// type Radix = NewType<Vector, "Radix">;
// const Radix = (value: Vector): Radix => ({ value, [newType]: "Radix" });

const newType = <Base, Name extends string>(name: Name) => {
  const factory = (value: Base): NewType<Base, Name> => ({
    value,
    [newTypeKey]: name,
  });
  const predicate = (value: unknown): value is NewType<Base, Name> =>
    value !== null && typeof value === "object" && newTypeKey in value &&
    value[newTypeKey] === name;
  return [factory, predicate];
};

const makeType =
  <Base, Name extends string>(name: Name) =>
  (value: Base): NewType<Base, Name> => ({ value, [newTypeKey]: name });

type BaseFor<F> = F extends ((value: infer Base) => any) ? Base : never;
type TypeFor<F> = F extends ((value: any) => infer Type) ? Type : never;

const Radix = makeType<Vector, "Radix">("Radix");
type RadixType = TypeFor<typeof Radix>;
type BaseType = BaseFor<typeof Radix>;

const radix = Radix([1, 2, 3]);
console.log(radix);

// deno-lint-ignore no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

class Name extends String {
  readonly [newTypeKey] = "Name";
}

class Celsius extends Number {
  readonly [newTypeKey] = "Celsius";
}

class Fahrenheit extends Number {
  readonly [newTypeKey] = "Fahrenheit";
}

type Temperature = Celsius | Fahrenheit;

const toCelsius = (temp: Temperature): Celsius => {
  if (temp instanceof Celsius) return temp;
  if (temp instanceof Fahrenheit) {
    return new Celsius(temp.valueOf() - 32 * 5 / 9);
  }
  throw new Error(`Can't convert at ${temp[newTypeKey]}`);
};

const toFahrenheit = (temp: Temperature): Fahrenheit => {
  if (temp instanceof Fahrenheit) return temp;
  if (temp instanceof Celsius) {
    return new Fahrenheit(temp.valueOf() * 9 / 5 + 32);
  }
  throw new Error(`Can't convert at ${temp[newTypeKey]}`);
};

const namer = (name: Name, temp: Temperature) => {
  const celsius = toCelsius(temp);
  const fahrenheit = toFahrenheit(temp);
  console.log(`You're called ${name} (${celsius}°C, ${fahrenheit}°F)`);
};

const name = new Name("Andy");
const temp = new Celsius(40);
namer(name, temp);
