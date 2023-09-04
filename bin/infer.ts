// Lookup types by path

type ResolveKey<K, T> = K extends `.${infer Key}`
  ? Key extends keyof T ? T[Key] : never
  : K extends `[${infer Idx extends number}]`
    ? Idx extends keyof T ? T[Idx] : never
  : never;

type KeyTerm = `.${string}` | `[${number}]`;

type ResolveDeep<K, T> = K extends `${infer Head extends KeyTerm}[${infer Rest}`
  ? ResolveDeep<`[${Rest}`, ResolveKey<Head, T>>
  : K extends `${infer Head extends KeyTerm}.${infer Rest}`
    ? ResolveDeep<`.${Rest}`, ResolveKey<Head, T>>
  : ResolveKey<K, T>;

type ResolvePath<JP, T> = JP extends `\$${infer Key}` ? ResolveDeep<Key, T>
  : never;

// Extract paths from type

type FindNext<P extends string, T> = T extends
  readonly unknown[] | Record<string, unknown> ? `${P}${Finder<T>}` : `${P}`;

type ListPaths<T> = T extends readonly unknown[] ? {
    [K in keyof T]: K extends `${infer Idx extends number}`
      ? FindNext<`[${Idx}]`, T[Idx]>
      : never;
  }[number]
  : never;

type ObjectPaths<T> = T extends Record<string, unknown> ? {
    [K in keyof T]: K extends string ? FindNext<`.${K}`, T[K]> : never;
  }[keyof T]
  : never;

type Finder<T> = ObjectPaths<T> | ListPaths<T>;

type FindPaths<T> = `\$${Finder<T>}`;

type Flatten<T> = {
  [K in FindPaths<T>]: ResolvePath<K, T>;
};

const list = ["A", true, 3, {
  name: "Andy",
  tags: ["geek", "husband"],
}] as const;

const obj = { list } as const;

export type T0 = ResolvePath<"$.list[3].name", typeof obj>;
export type T5 = FindPaths<typeof obj>;
export type T6 = Flatten<typeof obj>;
