class SetMap<K, V> {
  private readonly setMap = new Map<K, Set<V>>();
  for(key: K): Set<V> {
    let set = this.setMap.get(key);
    if (!set) this.setMap.set(key, set = new Set());
    return set;
  }
}

class GraphEntity<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }
}

export class Vertex<V> extends GraphEntity<V> {}
export class HyperEdge<E> extends GraphEntity<E> {}

export interface PathSegment<V, E> {
  from: Vertex<V>;
  edge: HyperEdge<E>;
  to: Vertex<V>;
}

export type Path<V, E> = PathSegment<V, E>[];

export class HyperGraph<V, E> {
  // edges at the entry of each vertex
  entryEdges = new SetMap<Vertex<V>, HyperEdge<E>>();
  // edges at the exit of each vertex
  exitEdges = new SetMap<Vertex<V>, HyperEdge<E>>();
  // vertices at the exit of each edge
  exitVertices = new SetMap<HyperEdge<E>, Vertex<V>>();

  relate(from: Vertex<V>[], edge: HyperEdge<E>, to: Vertex<V>[]): this {
    for (const vertex of from) this.exitEdges.for(vertex).add(edge);

    const exit = this.exitVertices.for(edge);
    for (const vertex of to) {
      exit.add(vertex);
      this.entryEdges.for(vertex).add(edge);
    }

    return this;
  }

  link(vertices: Vertex<V>[], edge: HyperEdge<E>): this {
    return this.relate(vertices, edge, vertices);
  }

  *paths(from: Vertex<V>, to: Vertex<V>): Generator<Path<V, E>> {
    interface QueueSlot {
      prefix: Path<V, E>;
      from: Vertex<V>;
    }

    if (from === to) yield [];

    const queue: QueueSlot[] = [{ prefix: [], from }];
    const seen = new Set([from]);
    const entries = this.entryEdges.for(to);

    for (;;) {
      const next = queue.shift();
      if (!next) break;
      const { prefix, from } = next;
      const exits = this.exitEdges.for(from);
      const common = [...exits].filter((edge) => entries.has(edge));
      for (const edge of common) {
        if (from !== to) yield [...prefix, { from, edge, to }];
      }

      for (const edge of [...exits]) {
        const next = this.exitVertices.for(edge);
        for (const vertex of next) {
          if (seen.has(vertex)) continue;
          seen.add(vertex);
          queue.push({
            prefix: [...prefix, { from, edge, to: vertex }],
            from: vertex,
          });
        }
      }
    }
  }
}

class Labelled {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class Person extends Labelled {}
class Relation extends Labelled {}

const showPath = (path: Path<Person, Relation>) => {
  if (!path.length) return "Yes";
  return path.map(
    (seg) => {
      return [seg.from.value.name, seg.edge.value.name, seg.to.value.name].join(
        " ",
      );
    },
  ).join(", ");
};

const hg = new HyperGraph<Person, Relation>();

const andy = new Vertex(new Person("Andy"));
const smoo = new Vertex(new Person("Smoo"));
const pizzo = new Vertex(new Person("Pizzo!"));
const liz = new Vertex(new Person("Liz"));
const howard = new Vertex(new Person("H"));

hg.relate([andy], new HyperEdge(new Relation("is husband of")), [smoo]).relate(
  [smoo],
  new HyperEdge(new Relation("is wife of")),
  [andy],
).link([smoo, andy], new HyperEdge(new Relation("lives with")));

hg.relate([pizzo], new HyperEdge(new Relation("is pet of")), [andy, smoo])
  .relate([andy, smoo], new HyperEdge(new Relation("has pet")), [pizzo]);

hg.relate([howard], new HyperEdge(new Relation("is husband of")), [liz]).relate(
  [liz],
  new HyperEdge(new Relation("is wife of")),
  [howard],
);

// console.log(hg);

const cases = [
  { from: andy, to: andy },
  { from: andy, to: smoo },
  {
    from: smoo,
    to: andy,
  },
  { from: liz, to: howard },
  { from: smoo, to: howard },
] as const;

for (const { from, to } of cases) {
  console.log(`${from.value.name} --> ${to.value.name}`);
  let limit = 10;
  for (const route of hg.paths(from, to)) {
    console.log(`  ${showPath(route)}`);
    if (--limit <= 0) break;
  }
}
