export class Vertex {}

export class HyperEdge {
  next: HyperEdge | false;
  constructor(next?: HyperEdge | false) {
    this.next = next ?? this;
  }
}

interface PathSegment<V extends Vertex, E extends HyperEdge> {
  from: V;
  to: V;
  edge: E;
}

type Path<V extends Vertex, E extends HyperEdge> = PathSegment<V, E>[];

export class HyperGraph<V extends Vertex, E extends HyperEdge> {
  vertices = new Map<V, Set<E>>();
  edges = new Map<E, Set<V>>();

  verticesForEdge(edge: E): Set<V> {
    let vSet = this.edges.get(edge);
    if (!vSet) this.edges.set(edge, vSet = new Set<V>());
    return vSet;
  }

  edgesForVertex(vertex: V): Set<E> {
    let eSet = this.vertices.get(vertex);
    if (!eSet) this.vertices.set(vertex, eSet = new Set<E>());
    return eSet;
  }

  link(edge: E, ...vertices: V[]): this {
    const vSet = this.verticesForEdge(edge);
    for (const vertex of vertices) {
      const eSet = this.edgesForVertex(vertex);
      vSet.add(vertex);
      eSet.add(edge);
    }
    return this;
  }

  unlink(edge: E, ...vertices: V[]): this {
    const vSet = this.verticesForEdge(edge);
    for (const vertex of vertices) {
      const eSet = this.edgesForVertex(vertex);
      vSet.delete(vertex);
      eSet.delete(edge);
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
      const fromSet = [...this.edgesForVertex(from)].map((edge) => edge.next)
        .filter((edge) => edge !== false);
      const toSet = this.edgesForVertex(to);
      const common = fromSet.filter((edge) => toSet.has(edge as E));
      if (common.length) {
        const edge = common[0] as E;
        return [...prefix, { from, to, edge }];
      }
      for (const edge of [...fromSet] as E[]) {
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
  constructor(name: string, next?: Relation | false) {
    super(next);
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

// A directed edge
const isPet = new Relation("is a pet", false);
const hasPet = new Relation("has a pet", isPet);

hg.link(isPet, pizzo, bob, echo).link(hasPet, andy, smoo, liz);

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
