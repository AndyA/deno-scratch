interface Atom {
  value: number;
}

const precedence = {
  "+": 2,
  "-": 2,
  "*": 1,
  "/": 1,
} as const;

type Op = keyof typeof precedence;

interface BinOp {
  op: Op;
  lhs: Expr;
  rhs: Expr;
}

type Expr = BinOp | Atom;

const isBinOp = (expr: Expr): expr is BinOp => "op" in expr;

type Visitor = (node: Expr) => Expr | undefined;

const transform = (visitor: Visitor) => (expr: Expr): Expr => {
  if (isBinOp(expr)) {
    expr.lhs = transform(visitor)(expr.lhs);
    expr.rhs = transform(visitor)(expr.rhs);
  }

  return visitor(expr) ?? expr;
};

const binOp = (op: Op, lhs: Expr, rhs: Expr): BinOp => ({ op, lhs, rhs });

const flipper = transform((node: Expr) => {
  if (isBinOp(node) && isBinOp(node.rhs)) {
    // A - (B - C) === (A + C) - B
    if (node.op === "-" && node.rhs.op === "-") {
      return binOp("-", binOp("+", node.lhs, node.rhs.rhs), node.rhs.lhs);
    }
    // A - (B + C) === (A - B) - C
    if (node.op === "-" && node.rhs.op === "+") {
      return binOp("-", binOp("-", node.lhs, node.rhs.lhs), node.rhs.rhs);
    }
    // A / (B / C) === (A * C) / B
    if (node.op === "/" && node.rhs.op === "/") {
      return binOp("/", binOp("*", node.lhs, node.rhs.rhs), node.rhs.lhs);
    }
    // A / (B * C) === (A / B) / C
    if (node.op === "/" && node.rhs.op === "*") {
      return binOp("/", binOp("/", node.lhs, node.rhs.lhs), node.rhs.rhs);
    }
  }
  return node;
});

const format = (expr: Expr): string => {
  if (!isBinOp(expr)) return String(expr.value);

  const prec = (expr: Expr) => isBinOp(expr) ? precedence[expr.op] : 0;
  const paren = (expr: Expr, wrap: boolean) =>
    wrap ? `(${format(expr)})` : format(expr);

  const p = prec(expr);
  const rp = prec(expr.rhs);
  const lhs = paren(expr.lhs, prec(expr.lhs) > p);
  const rhs = paren(
    expr.rhs,
    rp > p || (rp === p && (expr.op === "-" || expr.op === "/")),
  );
  return `${lhs} ${expr.op} ${rhs}`;
};

type Strategy = {
  calc: (want: number, got: number) => number;
  build: (it: Expr, got: Expr) => Expr;
};

const strategies: Strategy[] = [{
  calc: (want, got) => want - got,
  build: (it, got) => binOp("+", got, it),
}, {
  calc: (want, got) => got - want,
  build: (it, got) => binOp("-", it, got),
}, {
  calc: (want, got) => got + want,
  build: (it, got) => binOp("-", got, it),
}, {
  calc: (want, got) => want / got,
  build: (it, got) => binOp("*", got, it),
}, {
  calc: (want, got) => got / want,
  build: (it, got) => binOp("/", it, got),
}, {
  calc: (want, got) => got * want,
  build: (it, got) => binOp("/", got, it),
}];

const solve = (want: number, terms: Atom[]): Expr | undefined => {
  // Can't solve?
  if (Math.floor(want) !== want) return;

  // Already solved?
  const hit = terms.find((t) => t.value === want);
  if (hit) return hit;

  // Try harder
  for (let i = 0; i < terms.length; i++) {
    const it = terms[i];
    const rest = [...terms.slice(0, i), ...terms.slice(i + 1)];

    for (const { calc, build } of strategies) {
      const got = solve(calc(want, it.value), rest);
      if (got !== undefined) return build(it, got);
    }
  }
};

const search = (want: number, terms: Atom[]): [number, Expr] => {
  const got = solve(want, terms);
  if (got) return [want, got];

  for (let span = 1;; span++) {
    const low = solve(want - span, terms);
    if (low) return [want - span, low];
    const high = solve(want + span, terms);
    if (high) return [want + span, high];
  }
};

type Game = {
  want: number;
  have: number[];
};

const games: Game[] = [
  { want: 2, have: [1, 1, 1, 1, 1, 1, 1] },
  { want: 0, have: [1, 1] },
  { want: 57, have: [100, 3, 1, 7] },
  { want: 98, have: [25, 7, 3, 17, 18] },
  { want: 99, have: [100, 3, 3] },
  { want: 45, have: [100, 75, 25, 50, 2, 1] },
  { want: 446, have: [100, 75, 25, 50, 2, 1] },
  { want: 442, have: [100, 75, 25, 50, 2, 1] },
  { want: 441, have: [100, 75, 25, 50, 2, 1] },
  { want: 1238, have: [100, 75, 50, 9, 8, 3] },
  { want: 1937, have: [100, 75, 50, 9, 8, 3] },
];

for (const { want, have } of games) {
  const [value, best] = search(want, have.map((value) => ({ value })));
  if (best) {
    const opt = flipper(best);
    const rep = format(opt);
    const got = eval(rep);
    if (got === value) {
      if (want === value) {
        console.log(`${value} = ${rep}`);
      } else {
        console.log(`${want} != ${value} = ${rep}`);
      }
    } else {
      console.log(`${value} != ${rep}, got ${got}`);
    }
  } else {
    console.log(`${want}: can't solve`);
  }
}
