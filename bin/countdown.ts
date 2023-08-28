type NonEmpty<T> = [T, ...T[]];
const isNonEmpty = <T>(list: T[]): list is NonEmpty<T> => list.length > 1;

interface Term {
  reversed: boolean;
}

interface Atom extends Term {
  value: number;
}

type Op = "+" | "*";

interface Operator extends Term {
  op: Op;
  children: NonEmpty<Expr>;
}

type Expr = Atom | Operator;

type Strategy = {
  calc: (want: number, got: number) => number;
  build: (it: Expr, got: Expr) => Expr;
};

const isOperator = (expr: Expr): expr is Operator =>
  typeof expr === "object" && "op" in expr;
const isDefined = <T>(obj: T | undefined): obj is T => obj !== undefined;

const atom = (value: number): Atom => ({ reversed: false, value });

const operator = (op: Op, lhs: Expr, rhs: Expr): Operator => ({
  reversed: false,
  op,
  children: [lhs, rhs],
});

const reverse = ({ reversed, ...rest }: Expr) => ({
  reversed: !reversed,
  ...rest,
});

const strategies: Strategy[] = [{
  calc: (want, got) => want - got,
  build: (it, got) => operator("+", it, got),
}, {
  calc: (want, got) => got - want,
  build: (it, got) => operator("+", it, reverse(got)),
}, {
  calc: (want, got) => got + want,
  build: (it, got) => operator("+", reverse(it), got),
}, {
  calc: (want, got) => want / got,
  build: (it, got) => operator("*", it, got),
}, {
  calc: (want, got) => got / want,
  build: (it, got) => operator("*", it, reverse(got)),
}, {
  calc: (want, got) => got * want,
  build: (it, got) => operator("*", reverse(it), got),
}];

const isInt = (n: number): boolean => Math.floor(n) === n;

const solve = (want: number, terms: Atom[]): Expr | undefined => {
  if (!isInt(want)) return;

  const hit = terms.find((term) => term.value === want);
  if (isDefined(hit)) return hit;

  for (let i = 0; i < terms.length; i++) {
    const it = terms[i];
    const rest = [...terms.slice(0, i), ...terms.slice(i + 1)];
    for (const { calc, build } of strategies) {
      const got = solve(calc(want, it.value), rest);
      if (isDefined(got)) return build(it, got);
    }
  }
};

const flatten = (expr: Expr): Expr => {
  if (isOperator(expr)) {
    const children = expr.children.map(flatten).flatMap((child) => {
      if (isOperator(child) && child.op === expr.op) return child.children;
      return [child];
    });
    if (!isNonEmpty(children)) throw new Error(`Can't happen`);
    return { ...expr, children };
  }

  return expr;
};

const cmp = <T>(a: T, b: T): number => a < b ? -1 : a > b ? 1 : 0;
const cmpExpr = (a: Expr, b: Expr) =>
  cmp(a.reversed, b.reversed) ||
  (isOperator(a) || isOperator(b)
    ? ((isOperator(a) && isOperator(b))
      ? cmp(b.children.length, a.children.length)
      : cmp(isOperator(b), isOperator(a)))
    : cmp(b.value, a.value));

const sortExpr = (expr: Expr): Expr => {
  if (isOperator(expr)) {
    const children = expr.children.map(sortExpr).sort(cmpExpr);
    if (!isNonEmpty(children)) throw new Error(`Can't happen`);
    return { ...expr, children };
  }

  return expr;
};

type OpFun = (a: number, b: number) => number;

const evaluate = (expr: Expr): number => {
  if (!isOperator(expr)) return expr.value;

  const [fwd, rev, base]: [OpFun, OpFun, number] = expr.op === "+"
    ? [(a, b) => a + b, (a, b) => a - b, 0]
    : [(a, b) => a * b, (a, b) => a / b, 1];

  return expr.children.reduce(
    (acc, next) => (next.reversed ? rev : fwd)(acc, evaluate(next)),
    base,
  );
};

type Game = {
  want: number;
  have: number[];
};

const games: Game[] = [
  // { want: 3, have: [1, 1, 1, 1, 1, 1, 1] },
  // { want: 0, have: [1, 1] },
  // { want: 57, have: [100, 3, 1, 7] },
  // { want: 98, have: [25, 7, 3, 17, 18] },
  // { want: 99, have: [100, 3, 3] },
  // { want: 45, have: [100, 75, 25, 50, 2, 1] },
  // { want: 446, have: [100, 75, 25, 50, 2, 1] },
  // { want: 442, have: [100, 75, 25, 50, 2, 1] },
  { want: 441, have: [50, 2, 1, 100, 75, 25] },
  // { want: 1238, have: [100, 75, 50, 9, 8, 3] },
  // { want: 1937, have: [100, 75, 50, 9, 8, 3] },
];

for (const { want, have } of games) {
  const got = solve(want, have.map(atom));
  if (isDefined(got)) {
    const opt = sortExpr(flatten(got));
    const value = evaluate(opt);
    console.log(
      `${want}/${value} =`,
      Deno.inspect(opt, { colors: true, depth: 100 }),
    );
  } else {
    console.log(`${want}: no match`);
  }
}
