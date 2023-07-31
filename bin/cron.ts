import _ from "https://cdn.skypack.dev/lodash?dts";
import * as ns from "../lib/numset.ts";
import type { NumSetOp } from "../lib/numset.ts";

const dayNames = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const monthNames = {
  ...{ jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6 },
  ...{ jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 },
};

const specialNames = [
  ...["@yearly", "@annually", "@monthly", "@weekly"],
  ...["@daily", "@hourly", "@reboot"],
] as const;

type DayName = keyof typeof dayNames;
type MonthName = keyof typeof monthNames;
type UnitName = keyof typeof ns.unitRange;
type SpecialName = (typeof specialNames)[number];

type Wildcard = { tag: "wild" };
type Index = { tag: "index"; value: number };
type Month = { tag: "month"; value: MonthName };
type DoW = { tag: "dow"; value: DayName };
type Special = { tag: "special"; value: SpecialName };
type Unit = { tag: "unit"; value: UnitName; lhs: AST };
type UnOp = { tag: "negate" | "invert" | "type"; lhs: AST };
type BinOp = { tag: "range" | "step"; lhs: AST; rhs: AST };
type List = { tag: "rule" | "union" | "intersection"; items: AST[] };

// Tokens introduced during transformation

type IntSet = {
  tag: "intSet";
  context?: UnitName;
  fromEnd?: boolean;
  step?: number;
  set: ns.NumSet;
};

type ParsedAST =
  | Wildcard
  | Index
  | Month
  | DoW
  | Special
  | Unit
  | UnOp
  | BinOp
  | List;

type AST = ParsedAST | IntSet;
type Tag = AST["tag"];

type MaybeAST = AST | undefined;

type Parser = () => MaybeAST;

const isBinOp = (ast: AST): ast is BinOp => "rhs" in ast;
const isUnOp = (ast: AST): ast is UnOp => "lhs" in ast && !isBinOp(ast);
const isList = (ast: AST): ast is List => "items" in ast;

const isInt = (n: string) => /^\d+$/.test(n);
const isDay = (n: string): n is DayName => n in dayNames;
const isMonth = (n: string): n is MonthName => n in monthNames;
const isSpecial = (n: string): n is SpecialName =>
  specialNames.includes(n as SpecialName);
const isUnitName = (n: string): n is UnitName =>
  /^\w+:$/.test(n) && n.slice(0, -1) in ns.unitRange;

const tokenise = (spec: string): string[] =>
  spec
    .split(/(\s+|\w+:|@?\w+|\d+|[-~!*()/,&|])/)
    .filter((t) => !/^\s*$/.test(t))
    .map((s) => s.toLowerCase());

const parseCron = (spec: string): AST => {
  const tokens = tokenise(spec);

  const need = (ast: MaybeAST): AST => {
    if (!ast) throw new Error(`Bad syntax: ${tokens.join(" ")}`);
    return ast;
  };

  const number: Parser = () => {
    if (tokens.length && isInt(tokens[0])) {
      return { tag: "index", value: Number(tokens.shift()) };
    }
  };

  const atom: Parser = () => {
    const num = number();
    if (num) return num;
    if (!tokens.length) return;
    const tok = tokens.shift() as string;
    if (tok === "*") return { tag: "wild" };
    if (isUnitName(tok)) return { tag: "unit", value: tok, lhs: need(atom()) };
    if (isDay(tok)) return { tag: "dow", value: tok };
    if (isMonth(tok)) return { tag: "month", value: tok };
    if (isSpecial(tok)) return { tag: "special", value: tok };
    if (tok === "(") {
      const nest = union();
      if (tokens.shift() === ")") return nest;
      throw new Error(`Missing ")"`);
    }
    tokens.unshift(tok);
  };

  const range: Parser = () => {
    const lhs = atom();
    if (!lhs || !tokens.length || tokens[0] !== "-") return lhs;
    tokens.shift();
    const rhs = need(atom());
    return { tag: "range", lhs, rhs };
  };

  const step: Parser = () => {
    const lhs = range();
    if (!lhs || !tokens.length || tokens[0] !== "/") return lhs;
    tokens.shift();
    return { tag: "step", lhs, rhs: need(number()) };
  };

  const sepList = (tag: List["tag"], sep: string, up: Parser): Parser => () => {
    const head = up();
    if (!head) return;
    const items = [head];
    while (tokens.length && tokens[0] === sep) {
      tokens.shift();
      items.push(need(up()));
    }
    return items.length === 1 ? items[0] : { tag, items };
  };

  const list = sepList("union", ",", step);

  const unary: Parser = () => {
    if (!tokens.length) return;
    const tok = tokens.shift() as string;
    if (tok === "~") return { tag: "negate", lhs: need(unary()) };
    if (tok === "!") return { tag: "invert", lhs: need(unary()) };
    tokens.unshift(tok);
    return list();
  };

  const rule: Parser = () => {
    const items: AST[] = [];
    for (;;) {
      const next = unary();
      if (!next) break;
      items.push(next);
    }
    return items.length === 1 ? items[0] : { tag: "rule", items };
  };

  const intersection = sepList("intersection", "&", rule);
  const union = sepList("union", "|", intersection);
  const ast = union();

  if (!ast || tokens.length) {
    throw new Error(`Syntax error: ${tokens.join(" ")}`);
  }

  return ast;
};

interface ListOfRules extends List {
  items: List[];
}

const listIsAllRules = (ast: List): ast is ListOfRules =>
  ast.items.every((nd) => nd.tag === "rule");

const allSameSize = (ast: ListOfRules): boolean => {
  const want = ast.items[0].items.length;
  return ast.items.every((nd) => nd.items.length === want);
};

type Visitor = (node: AST, path: AST[]) => MaybeAST;
type VisitorSpec = { pre?: Visitor; post?: Visitor };

const walkTree = (vs: VisitorSpec, path: AST[] = []) => (ast: AST): AST => {
  let nd = { ...ast };
  nd = (vs.pre && vs.pre(nd, path)) || nd;
  const next = walkTree(vs, [nd, ...path]);
  if ("lhs" in nd) nd.lhs = next(nd.lhs);
  if ("rhs" in nd) nd.rhs = next(nd.rhs);
  if ("items" in nd) nd.items = nd.items.map(next);
  nd = (vs.post && vs.post(nd, path)) || nd;
  return nd;
};

const compose = <T>(...fn: ((arg: T) => T)[]) => (v: T) =>
  fn.reduce((v, f) => f(v), v);

const makeSetOp = (op: NumSetOp) => (a: IntSet, b: IntSet): IntSet => ({
  ...a,
  set: op(a.set, b.set),
});

const trySetOp = (tag: Tag, op: NumSetOp, asts: AST[]): AST => {
  const [sets, notSets] = _.partition(asts, (i: AST) => i.tag === "intSet");
  const [fromEnd, fromStart] = _.partition(
    sets as IntSet[],
    (s: IntSet) => s.fromEnd,
  )
    .flatMap(
      (s: IntSet[]) => {
        if (!s.length) return [];
        return [s.reduce(makeSetOp(op))];
      },
    );
  const items = [...notSets, fromEnd, fromStart].filter(Boolean);
  if (items.length === 1) return items[0];
  return { tag, items } as List;
};

const lowerIntersections = walkTree({
  post: (ast) => {
    if (ast.tag === "intersection" && listIsAllRules(ast)) {
      if (!allSameSize(ast)) {
        throw new Error(`Rule size mismatch in intersection`);
      }

      const collected = _.zip(...ast.items.map((nd) => nd.items)) as AST[][];
      const items: List[] = collected.map(
        (items: AST[]) => ({ tag: "intersection", items }),
      );
      return { tag: "rule", items };
    }
  },
});

const makeUnit = (ast: DoW | Month, lookup: Record<string, number>): Unit => {
  const value = lookup[ast.value];
  if (value === undefined) throw new Error(`Bad ${ast.tag} name: ${ast.value}`);
  return {
    tag: "unit",
    value: ast.tag,
    lhs: { tag: "intSet", set: new ns.NumSet([value]) },
  };
};

const decodeUnits = walkTree({
  post: (ast) => {
    if (ast.tag === "dow") return makeUnit(ast, dayNames);
    if (ast.tag === "month") return makeUnit(ast, monthNames);
  },
});

const stripUnit = (ast: AST) => ast.tag === "unit" ? ast.lhs : ast;

// Given a list of nodes attempt to extract their common unit.

const commonUnit = (
  nodes: AST[],
): { unit: UnitName | undefined; nodes: AST[] } => {
  const units = _(nodes)
    .filter((ast) => ast.tag === "unit")
    .map((ast: Unit) => ast.value)
    .uniq()
    .value() as unknown as UnitName[];
  if (units.length === 0) return { unit: undefined, nodes };
  if (units.length > 1) throw new Error(`Unit mismatch: ${units.join(", ")}`);
  return { unit: units[0], nodes: nodes.map(stripUnit) };
};

const raiseUnits = walkTree({
  post: (ast) => {
    if (ast.tag === "rule") return ast;
    if (isUnOp(ast)) {
      const { unit, nodes: [lhs] } = commonUnit([ast.lhs]);
      if (!unit) return ast;
      return { tag: "unit", value: unit, lhs: { tag: ast.tag, lhs } };
    }
    if (isBinOp(ast)) {
      const { unit, nodes: [lhs, rhs] } = commonUnit([ast.lhs, ast.rhs]);
      if (!unit) return ast;
      return { tag: "unit", value: unit, lhs: { tag: ast.tag, lhs, rhs } };
    }
    if (isList(ast)) {
      const { unit, nodes } = commonUnit(ast.items);
      if (!unit) return ast;
      return { tag: "unit", value: unit, lhs: { tag: ast.tag, items: nodes } };
    }
  },
});

const simplify = walkTree({
  post: (ast) => {
    if (ast.tag === "wild") return { tag: "intSet", set: ns.fullSet };
    if (ast.tag === "index") {
      return { tag: "intSet", set: new ns.NumSet([ast.value]) };
    }
    if (ast.tag === "invert" && ast.lhs.tag === "intSet") {
      return { ...ast.lhs, set: ns.invert(ast.lhs.set) };
    }
    if (ast.tag === "negate" && ast.lhs.tag === "intSet") {
      const { fromEnd, ...rest } = ast.lhs;
      return fromEnd ? rest : { ...rest, fromEnd: true };
    }
    if (ast.tag === "union") return trySetOp("union", ns.union, ast.items);
    if (ast.tag === "intersection") {
      return trySetOp("intersection", ns.intersection, ast.items);
    }

    if (ast.tag === "range") {
      const { lhs, rhs } = ast;
      if (lhs.tag === "intSet" && rhs.tag === "intSet") {
        if (lhs.fromEnd === rhs.fromEnd) {
          return {
            ...lhs,
            set: ns.intersection(ns.fillUp(lhs.set), ns.fillDown(rhs.set)),
          };
        }
      }
    }
  },
});

// TODO
// Unions that contain rules need to be raised

const flattenRules = walkTree({
  post: (ast) => {
    if (ast.tag === "rule") {
      const items = ast.items.flatMap((nd) =>
        nd.tag === "rule" ? nd.items : [nd]
      );
      return { tag: "rule", items };
    }
  },
});

const compile = compose(
  lowerIntersections,
  decodeUnits,
  raiseUnits,
  simplify,
  flattenRules,
);

const crons = [
  // "0-3, 3/5 1-2, 4 * jan, mar, dec !!(TUE, THU | FRI)",
  "* * * * * mon, fri",
  // "* * * mon, tue, wed",
  // "*/10 * (8-20 1-14 & 10 13,15) * ~3,5-10",
  // "* * * !3,5 * *",
];

for (const cron of crons) {
  // console.log(tokenise(cron));
  const ast = parseCron(cron);
  const compiled = compile(ast);
  console.log(
    Deno.inspect(
      { cron, ast, compiled },
      { depth: 100, colors: true, compact: true },
    ),
  );
}
