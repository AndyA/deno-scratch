import _ from "https://cdn.skypack.dev/lodash?dts";

const cmp = (a: number | string, b: number | string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const fixedCmp = (keys: string[], unknownAtStart = false) => {
  const unknown = unknownAtStart ? -1 : keys.length;
  const rank = Object.fromEntries(keys.map((key, index) => [key, index]));
  return (a: string, b: string) =>
    cmp(rank[a] ?? unknown, rank[b] ?? unknown) || cmp(a, b);
};

type KeyCmp = (a: string, b: string) => number;

interface ObjectOrder {
  kind: "object";
  cmp: KeyCmp;
  children: Record<string, Order>;
}

interface ArrayOrder {
  kind: "array";
  children: Order[];
}

type Order = ObjectOrder | ArrayOrder | undefined;

const makeOrder = (proto: object): Order => {
  if (Array.isArray(proto)) {
    return { kind: "array", children: proto.map(makeOrder) };
  }

  if (proto && typeof proto === "object") {
    return {
      kind: "object",
      cmp: fixedCmp(Object.keys(proto)),
      children: _.mapValues(proto, makeOrder),
    };
  }
};

const sortKeys = (cmp: KeyCmp, obj: object): object =>
  Object.fromEntries(
    Object.entries(obj).sort((a, b) => cmp(a[0], b[0])),
  );

const fixOrder = (order: Order) => (obj: object): object => {
  if (Array.isArray(obj)) {
    if (order?.kind === "array") {
      return obj.map((elt, i) =>
        fixOrder(order.children[i] || order.children[0])(elt)
      );
    }
    return obj;
  }

  if (obj && typeof obj === "object") {
    if (order?.kind === "object") {
      const sorted = _.mapValues(
        obj,
        (value: object, key: string) => fixOrder(order.children[key])(value),
      );
      return sortKeys(order.cmp, sorted);
    }
    return sortKeys(cmp, obj);
  }

  return obj;
};

const keepOrder = (proto: object) => fixOrder(makeOrder(proto));

const proto = {
  name: "Andy",
  dob: "1964-05-04",
  tuple: [
    { name: "foo", type: "foo" },
    { type: "bar", name: "bar" },
  ],
  meta: {
    id: 1,
    tags: ["human", "lazy"],
  },
};

const keeper = keepOrder(proto);

const data = {
  tuple: [
    { type: "baz", name: "baz" },
    { name: "boz", type: "boz" },
    { name: "biz", type: "biz" },
    { type: "buz", name: "buz" },
  ],
  meta: { tags: ["cat", "lazy"], id: 2 },
  dob: "unknown",
  name: "Pizzo",
};

console.log(keeper(data));
