// Parse paths

type ParseDots<P> = "" extends P ? []
  : P extends `.${infer Head}.${infer Tail}` ? [Head, ...ParseDots<`.${Tail}`>]
  : P extends `.${infer Head}` ? [Head]
  : never;

type ParsePath<P> = "" extends P ? []
  : P extends `${infer Head}[${infer Idx extends number}]${infer Tail}`
    ? [...ParseDots<Head>, Idx, ...ParsePath<Tail>]
  : ParseDots<P>;

// Resolve path to type

type ResolveKey<K, T> = K extends string
  ? T extends Record<string, unknown> ? T[K] : never
  : K extends number ? T extends readonly unknown[] ? T[K] : never
  : never;

type ResolveDeep<P, T> = [] extends P ? T
  : P extends [infer Head, ...infer Tail]
    ? ResolveDeep<Tail, ResolveKey<Head, T>>
  : never;

type Resolve<P, T> = ResolveDeep<ParsePath<P>, T>;

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

// JSONPath shim

type ResolveJP<JP, T> = JP extends `\$${infer Key}` ? Resolve<Key, T>
  : never;

type FindJP<T> = `\$${Finder<T>}`;

type ParseJP<JP> = JP extends `\$${infer Key}` ? ParsePath<Key> : never;

// Collapse object

type Collapse<T> = {
  [K in FindJP<T> as K]: ResolveJP<K, T>;
};

// Expand objects

const list = ["Hello", true, 3, {
  name: "Andy",
  tags: ["geek", "husband"],
}] as const;

const list2 = ["Goodbye", { author: "Smoo" }] as const;

const obj = { list } as const;
const obj2 = { list: list2 } as const;

type OT = typeof obj | typeof obj2;

export type T0 = Collapse<typeof obj>;
export type T1 = Collapse<OT>;

type Thing = {
  name: string;
  tags: string[][];
  author: { name: string; email: string };
};

export type FlatThing = Collapse<Thing>;

const foo: FlatThing = {
  "$.author.email": "andy@hexten.net",
  "$.author.name": "Andy Armstrong",
  "$.name": "Foo",
  "$.tags[0][0]": "Hello",
  "$.tags[0][1]": "Again",
} as const;

type FlatPaths<T> = T extends Record<string, unknown>
  ? { [K in keyof T]: ParseJP<K> }[keyof T]
  : never;

type PathHead<P> = P extends readonly [infer Head, ...infer Tail] ? Head
  : never;
type PathTail<P> = P extends readonly [infer Head, ...infer Tail] ? Tail
  : never;

type T2 = FlatPaths<typeof foo>;
type T3 = PathHead<T2>;
type T4 = PathTail<T2>;

console.log(foo);
