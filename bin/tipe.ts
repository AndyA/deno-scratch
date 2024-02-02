const partition = <T>(array: T[], pred: (v: T) => boolean): T[][] => {
  const t: T[] = [];
  const f: T[] = [];
  for (const v of array) (pred(v) ? t : f).push(v);
  return [t, f];
};

const findIndexes = <T>(array: T[], pred: (value: T) => boolean): number[] =>
  array.map((value, index) => pred(value) ? index : -1)
    .filter(
      (index) => index >= 0,
    );

const isSubset = <T>(sub: Set<T>, sup: Set<T>): boolean =>
  [...sub].every((m) => sup.has(m));

type Node<T> = {
  set: Set<T>;
  children: Node<T>[];
};

export class SetGraph<T> {
  root: Node<T>;

  constructor(root: Set<T>) {
    this.root = { set: root, children: [] };
  }

  add(set: Set<T>): this {
    const insert = (node: Node<T>, set: Set<T>): Node<T> => {
      if (set === node.set) {
        console.log(`identity`);
        return node;
      }

      if (isSubset(set, node.set)) {
        // Same set?
        if (set.size === node.set.size) {
          console.log(`equal`);
          return node;
        }
        throw new Error(`No!`);
        // Pivot
        // return { set, children: [node] };
      }

      const sups = findIndexes(
        node.children,
        (node) => isSubset(node.set, set),
      );

      if (sups.length) {
        for (const sup of sups) {
          node.children[sup] = insert(node.children[sup], set);
        }
        console.log(`splice`);
        return node;
      }

      // Collect all the children we're a subset of
      const [subs, rest] = partition(
        node.children,
        (child) => isSubset(set, child.set),
      );

      // if (subs.length === 0) return node;

      console.log(`push subs: ${subs.length}, rest: ${rest.length}`);

      // Make a new superset node containing all the
      // nodes we're a subset of
      const next = { set, children: subs };
      node.children = [...rest, next];

      return node;
    };

    console.log(`insert`, set);
    this.root = insert(this.root, set);
    return this;
  }
}

const showGraph = (node: Node<string>, depth = 0) => {
  if (node.set.size) {
    const key = [...node.set].sort().join(", ") || "** empty **";
    const pad = "".padEnd(depth * 2);
    console.log(`${pad}${key}`);
  }
  for (const child of node.children) showGraph(child, depth + 1);
};

const cmpSize = <T>(a: Set<T>, b: Set<T>): number => a.size - b.size;

const sets = [
  ["a"],
  ["q", "r", "a"],
  ["b", "c", "d"],
  ["b", "c"],
  ["a", "b", "c"],
  ["c", "d"],
  [
    "a",
  ],
  ["a", "c"],
  ["d"],
  ["q"],
  ["c"],
];
const prepared = sets.map((keys) => new Set(keys)).sort(cmpSize);
console.log(prepared);
const graph = new SetGraph(new Set<string>());

for (const set of prepared) {
  graph.add(new Set(set));
  showGraph(graph.root);
}
