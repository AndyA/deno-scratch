export class Vertex {}
export class HyperEdge {}

interface PathSegment<V extends Vertex, E extends HyperEdge> {
  from: V;
  to: V;
  edge: E;
}

type Path<V extends Vertex, E extends HyperEdge> = PathSegment<V, E>[];

const intersect = <T>(a: Set<T>, b: Set<T>): T[] =>
  [...a].filter((m) => b.has(m));

export class HyperGraph<V extends Vertex, E extends HyperEdge> {
  vertices = new Map<V, Set<E>>();
  edges = new Map<E, Set<V>>();

  verticesForEdge(edge: E): Set<V> {
    let set = this.edges.get(edge);
    if (!set) this.edges.set(edge, set = new Set<V>());
    return set;
  }

  edgesForVertex(vertex: V): Set<E> {
    let set = this.vertices.get(vertex);
    if (!set) this.vertices.set(vertex, set = new Set<E>());
    return set;
  }

  link(edge: E, ...vertices: V[]) {
    const vSet = this.verticesForEdge(edge);
    for (const vertex of vertices) {
      const eSet = this.edgesForVertex(vertex);
      vSet.add(vertex);
      eSet.add(edge);
    }
    return this;
  }

  path(from: V, to: V): Path<V, E> | false {
    interface QueueSlot {
      prefix: Path<V, E>;
      from: V;
    }

    if (from === to) return [];

    const queue: QueueSlot[] = [{ prefix: [], from }];
    const seen = new Set<V>([from]);

    for (;;) {
      const next = queue.shift();
      if (!next) return false;
      const { prefix, from } = next;
      const fromSet = this.edgesForVertex(from);
      const toSet = this.edgesForVertex(to);
      const common = intersect(fromSet, toSet);
      if (common.length) {
        const edge = common[0];
        return [...prefix, { from, to, edge }];
      }
      for (const edge of [...fromSet]) {
        const vertices = this.verticesForEdge(edge);
        for (const vertex of vertices) {
          if (seen.has(vertex)) continue;
          seen.add(vertex);
          queue.push({
            prefix: [...prefix, { from, to: vertex, edge }],
            from: vertex,
          });
        }
      }
    }
  }
}

class Person extends Vertex {
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
}

class Relation extends HyperEdge {
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
}

const showPath = (path: Path<Person, Relation>) =>
  path.map((step) => `${step.from.name} -> ${step.edge.name} -> `)
    .concat(path[path.length - 1].to.name).join("");

const hg = new HyperGraph<Person, Relation>();

const andy = new Person("Andy");
const smoo = new Person("Smoo");
const pizzo = new Person("Pizzo!");
const bob = new Person("Bob!");
const liz = new Person("Liz");
const trish = new Person("Trish");
const echo = new Person("Echo!");

const pike = new Relation("is a resident of PLC");
const animal = new Relation("is an animal");
const neighbour = new Relation("is a neighbour");

hg.link(pike, andy, smoo, pizzo).link(animal, pizzo, bob, echo).link(
  neighbour,
  liz,
  trish,
  echo,
);

// console.log(hg);

const pairs = [{ from: smoo, to: liz }, { from: liz, to: trish }, {
  from: smoo,
  to: bob,
}] as const;

const findPaths = (from: Person, to: Person) => {
  const path = hg.path(from, to);
  if (path === false) console.log(`no path from ${from.name} to ${to.name}`);
  else console.log(showPath(path));
};

for (const { from, to } of pairs) {
  findPaths(from, to);
  findPaths(to, from);
}
