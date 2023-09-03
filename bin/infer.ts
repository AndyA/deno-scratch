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
