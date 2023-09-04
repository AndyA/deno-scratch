type Index<K, T> = K extends `.${infer Key}`
  ? Key extends keyof T ? T[Key] : never
  : K extends `[${infer Idx extends number}]`
    ? Idx extends keyof T ? T[Idx] : never
  : never;

type IndexTerm = `.${string}` | `[${number}]`;

type IndexDeep<K, T> = K extends `${infer Head extends IndexTerm}[${infer Rest}`
  ? IndexDeep<`[${Rest}`, Index<Head, T>>
  : K extends `${infer Head extends IndexTerm}.${infer Rest}`
    ? IndexDeep<`.${Rest}`, Index<Head, T>>
  : Index<K, T>;

type FindNext<P extends string, T> = T extends
  readonly unknown[] | Record<string, unknown> ? `${P}${Finder<T>}`
  : `${P}`;

type ListPaths<T> = T extends readonly unknown[] ? {
    [K in keyof T]: K extends `${infer Idx extends number}`
      ? FindNext<`[${Idx}]`, T[Idx]> /*  `[${Idx}]${Finder<T[Idx]>}`*/
      : never;
  }[number]
  : never;

type ObjectPaths<T> = T extends Record<string, unknown> ? {
    [K in keyof T]: K extends string
      ? FindNext<`.${K}`, T[K]> /*`.${K}${Finder<T[K]>}`*/
      : never;
  }[keyof T]
  : never;

type Finder<T> = ObjectPaths<T> | ListPaths<T>;

type Flatten<T> = {
  [K in Finder<T>]: IndexDeep<K, T>;
};

const list = ["A", true, 3, {
  name: "Andy",
  tags: ["geek", "husband"],
}] as const;

const obj = { list } as const;

export type T0 = IndexDeep<".list[3].name", typeof obj>;
export type T5 = Finder<typeof obj>;
export type T6 = Flatten<typeof obj>;
