export const union = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a, ...b]);

export const intersection = <T>(a: Set<T>, b: Set<T>): Set<T> =>
  new Set([...a].filter((m) => b.has(m)));

export const partition = <T>(array: T[], pred: (v: T) => boolean): T[][] => {
  const t: T[] = [];
  const f: T[] = [];
  for (const v of array) (pred(v) ? t : f).push(v);
  return [t, f];
};

/**
 * Test whether sub is a subset of sup.
 * @param sub the potential subset
 * @param sup the superset
 * @returns
 */
export const isSubset = <T>(sub: Set<T>, sup: Set<T>): boolean =>
  [...sub].every((m) => sup.has(m));

type Node<T> = {
  set: Set<T>;
  children: Node<T>[];
};

export class SetTree<T> {
  root: Node<T>;

  constructor(root: Set<T>) {
    this.root = { set: root, children: [] };
  }

  add(set: Set<T>) {
    const insert = (node: Node<T>, set: Set<T>): Node<T> => {
      if (isSubset(set, node.set)) {
        // Same set?
        if (set.size === node.set.size) return node;
        // Pivot
        return { set, children: [node] };
      }

      // Is there a child we're a superset of?
      const sup = node.children.findIndex((child) => isSubset(child.set, set));
      if (sup >= 0) {
        node.children[sup] = insert(node.children[sup], set);
        return node;
      }

      // Collect all the children we're a subset of
      const [subs, rest] = partition(
        node.children,
        (child) => isSubset(set, child.set),
      );

      // Make a new superset node containing all the
      // nodes we're a subset of
      const next = { set, children: subs };
      node.children = [...rest, next];

      return node;
    };

    this.root = insert(this.root, set);
  }
}

const st = new SetTree(new Set<string>());

const showTree = (node: Node<string>, depth = 0) => {
  const key = [...node.set].sort().join(", ") || "** empty **";
  const pad = "".padEnd(depth * 2);
  console.log(`${pad}${key}`);
  for (const child of node.children) showTree(child, depth + 1);
};

st.add(new Set(["a", "b", "c", "d"]));
showTree(st.root);
st.add(new Set(["a", "b"]));
showTree(st.root);
st.add(new Set(["a", "b"]));
showTree(st.root);
st.add(new Set(["a", "b", "c"]));
showTree(st.root);
st.add(new Set(["a", "c"]));
showTree(st.root);
st.add(new Set(["a"]));
showTree(st.root);
st.add(new Set(["b"]));
showTree(st.root);
st.add(new Set(["a", "b"]));
showTree(st.root);
