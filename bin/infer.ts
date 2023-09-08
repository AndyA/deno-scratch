type ParseDots<P> = "" extends P ? []
  : P extends `.${infer Head}.${infer Tail}` ? [Head, ...ParseDots<`.${Tail}`>]
  : P extends `.${infer Head}` ? [Head]
  : never;

type ParsePath<P> = "" extends P ? []
  : P extends `${infer Head}[${infer Idx extends number}]${infer Tail}`
    ? [...ParseDots<Head>, Idx, ...ParsePath<Tail>]
  : P extends `${infer Head}[${number}]${infer Tail}`
    ? [...ParseDots<Head>, number, ...ParsePath<Tail>]
  : ParseDots<P>;

type ResolveKey<K, T> = "*" extends K ? T extends readonly unknown[] ? T : never
  : K extends string ? T extends Record<string, unknown> ? T[K] : never
  : K extends number ? T extends readonly unknown[] ? T[K] : never
  : never;

type ResolveDeep<P, T> = [] extends P ? T
  : P extends [infer Head, ...infer Tail]
    ? ResolveDeep<Tail, ResolveKey<Head, T>>
  : never;

type Resolve<P, T> = ResolveDeep<ParsePath<P>, T>;

type ResolvePath<JP, T> = JP extends `\$${infer Key}` ? Resolve<Key, T>
  : never;

// Extract paths from type

type FindNext<P extends string, T> = T extends
  readonly unknown[] | Record<string, unknown> ? `${P}${Finder<T>}` : `${P}`;

type ListPaths<T> = T extends readonly unknown[] ? {
    [K in keyof T]: K extends `${infer Idx extends number}`
      ? FindNext<`[${Idx}]`, T[Idx]>
      : FindNext<`[${number}]`, T[number]>;
  }[number]
  : never;

type ObjectPaths<T> = T extends Record<string, unknown> ? {
    [K in keyof T]: K extends string ? FindNext<`.${K}`, T[K]> : never;
  }[keyof T]
  : never;

type Finder<T> = ObjectPaths<T> | ListPaths<T>;

type FindPaths<T> = `\$${Finder<T>}`;

type Flatten<T> = {
  [K in FindPaths<T> as K]: ResolvePath<K, T>;
};

const list = ["Hello", true, 3, {
  name: "Andy",
  tags: ["geek", "husband"],
}] as const;

const list2 = ["Goodbye", { author: "Smoo" }] as const;

const obj = { list } as const;
const obj2 = { list: list2 } as const;

type OT = typeof obj | typeof obj2;

export type T0 = ResolvePath<"$.list[3].name", typeof obj>;
export type T5 = FindPaths<OT>;
export type T6 = Flatten<typeof obj>;
export type T7 = Flatten<typeof list>;
export type T8 = Flatten<OT>;

type Thing = {
  name: string;
  tags: string[][];
  author: { name: string; email: string };
};

export type FlatThing = Flatten<Thing>;

const foo: FlatThing = {
  "$.author.email": "andy@hexten.net",
  "$.author.name": "Andy Armstrong",
  "$.name": "Foo",
  "$.tags[0][0]": "Hello",
  "$.tags[0][1]": "Again",
};

console.log(foo);
