type BKNode<K> = { key: K; children: BKNode<K>[] };
export type BKDistance<T> = (a: T, b: T) => number;
export type BKResult<K> = { key: K; dist: number };

export class BKTree<K> {
  tree: BKNode<K> | null = null;
  distance: BKDistance<K>;

  constructor(distance: BKDistance<K>) {
    this.distance = distance;
  }

  add(...keys: K[]): this {
    const addKey = (node: BKNode<K> | null, key: K): BKNode<K> => {
      if (!node) return { key, children: [] };
      const dist = this.distance(node.key, key);
      if (dist >= 0) node.children[dist] = addKey(node.children[dist], key);
      return node;
    };

    this.tree = keys.reduce(addKey, this.tree);

    return this;
  }

  *query(key: K, maxDist: number): Generator<BKResult<K>> {
    const { distance } = this;
    function* look(node: BKNode<K>): Generator<BKResult<K>> {
      const dist = distance(node.key, key);
      if (dist <= maxDist) {
        yield { key: node.key, dist };
      }

      const min = Math.max(1, dist - maxDist) - 1;
      const max = dist + maxDist;

      for (let i = min; i < max; i++) {
        if (node.children[i]) yield* look(node.children[i]);
      }
    }

    if (this.tree) yield* look(this.tree);
  }

  find(key: K, maxDist: number): BKResult<K>[] {
    return [...this.query(key, maxDist)].sort((a, b) => a.dist - b.dist);
  }
}
