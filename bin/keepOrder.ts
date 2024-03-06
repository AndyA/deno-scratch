import { mapValues } from "https://cdn.skypack.dev/lodash?dts";

type Cmp<T> = (a: T, b: T) => number;

const cmp: Cmp<number | string> = (a, b) => a < b ? -1 : a > b ? 1 : 0;

interface FixedCmpOptions {
  unknownAtStart?: boolean;
  fallback?: Cmp<string>;
}

const fixedCmp = (opt: FixedCmpOptions) => (keys: string[]): Cmp<string> => {
  const unknownRank = opt.unknownAtStart ? -1 : keys.length;
  const fallback = opt.fallback ?? cmp;
  const rank = Object.fromEntries(keys.map((key, index) => [key, index]));
  return (a, b) =>
    cmp(rank[a] ?? unknownRank, rank[b] ?? unknownRank) || fallback(a, b);
};

interface ObjectOrder {
  kind: "object";
  cmp: Cmp<string>;
  next: Record<string, Order>;
}

interface ArrayOrder {
  kind: "array";
  next: Order[];
}

type Order = ObjectOrder | ArrayOrder | undefined;

const makeOrder = (opt: FixedCmpOptions) => (proto: object): Order => {
  if (Array.isArray(proto)) {
    return { kind: "array", next: proto.map(makeOrder(opt)) };
  }

  if (proto && typeof proto === "object") {
    return {
      kind: "object",
      cmp: fixedCmp(opt)(Object.keys(proto)),
      next: mapValues(proto, makeOrder(opt)),
    };
  }
};

const sortKeys = (cmp: Cmp<string>) => (obj: object): object =>
  Object.fromEntries(
    Object.entries(obj).sort((a, b) => cmp(a[0], b[0])),
  );

const fixOrder = (order: Order) => (obj: object): object => {
  if (Array.isArray(obj)) {
    if (!order) return obj.map(fixOrder(undefined));
    switch (order.kind) {
      case "array":
        return obj.map((elt, i) =>
          fixOrder(order.next[i] || order.next[0])(elt)
        );
      case "object":
        return obj.map(fixOrder(order));
    }
  }

  if (obj && typeof obj === "object") {
    if (order?.kind !== "object") {
      return sortKeys(cmp)(mapValues(obj, fixOrder(undefined)));
    }

    const fixValue = (value: object, key: string) =>
      fixOrder(order.next[key])(value);
    return sortKeys(order.cmp)(mapValues(obj, fixValue));
  }

  return obj;
};

const keepOrder = (proto: object, opt: FixedCmpOptions = {}) =>
  fixOrder(makeOrder(opt)(proto));

const proto = {
  name: "Andy",
  dob: "1964-05-04",
  tuples: [
    { name: "foo", type: "foo" },
    { type: "bar", name: "bar" },
  ],
  feeds: { name: "example", url: "http://example.com/feed.xml" },
  meta: {
    id: 1,
    tags: ["human", "lazy"],
  },
};

const keeper = keepOrder(proto, { unknownAtStart: false });

const tuples = [
  { type: "baz", name: "baz", arnold: "what?!" },
  { name: "boz", type: "boz" },
  { name: "biz", type: "biz" },
  { type: "buz", name: "buz" },
];

const data = {
  extra: 1,
  feeds: [[
    { url: "https://pizzo.com/rss", name: "Catopia" },
  ]],
  tuples,
  aardvark: tuples,
  meta: { tags: ["cat", "lazy"], id: 2 },
  dob: "unknown",
  name: "Pizzo",
};

console.log(keeper(data));
