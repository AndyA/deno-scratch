import _ from "https://cdn.skypack.dev/lodash?dts";
import * as ns from "../lib/numset.ts";

const dayNames = {
  ...{ sun: 0, mon: 1, tue: 2, wed: 3 },
  ...{ thu: 4, fri: 5, sat: 6 },
};
const monthNames = {
  ...{ jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6 },
  ...{ jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 },
};

const specialNames = [
  ...["@yearly", "@annually", "@monthly", "@weekly"],
  ...["@daily", "@hourly", "@reboot"],
] as const;

type UnitName = keyof typeof ns.unitRange;
type SpecialName = (typeof specialNames)[number];
type Token = { pos?: number };

type NumSet = { tag: "numset"; value: ns.NumSet } & Token;
type Unit = { tag: "unit"; value: UnitName; children: AST[] } & Token;
type Special = { tag: "special"; value: SpecialName } & Token;

// Unary operators
type Reverse = { tag: "reverse"; children: AST[] } & Token;
type Invert = { tag: "invert"; children: AST[] } & Token;

// Binary operators
type Range = { tag: "range"; children: AST[] } & Token;
type Step = { tag: "step"; children: AST[] } & Token;

// N-ary operators
type Rule = { tag: "rule"; children: AST[] } & Token;
type Union = { tag: "union"; children: AST[] } & Token;
type Intersection = { tag: "intersection"; children: AST[] } & Token;

type ReTuple<T extends unknown[], V> = { [K in keyof T]: V };
type AllChildren<T extends Operator, V extends AST> = {
  tag: T["tag"];
  children: ReTuple<T["children"], V>;
} & T;

type Constant<T extends Operator> = AllChildren<T, NumSet>;
type AllRules<T extends Operator> = AllChildren<T, Rule>;

type Unary = Reverse | Invert;
type Binary = Range | Step;
type Nary = Union | Intersection;
type Operator = Unary | Binary | Nary;
type AST = NumSet | Unit | Special | Operator | Rule;

type MaybeAST = AST | undefined;
type Parser = () => MaybeAST;

const tokenise = (spec: string): string[] =>
  spec
    .split(/(\s+|\w+:|@?\w+|\d+|[-~!*()/,&|])/)
    .filter((t) => !/^\s*$/.test(t))
    .map((s) => s.toLowerCase());

const isInt = (n: string): boolean => /^\d+$/.test(n);
const isDay = (n: string): boolean => n in dayNames;
const isMonth = (n: string): boolean => n in monthNames;
const isSpecialName = (n: string): n is SpecialName =>
  specialNames.includes(n as SpecialName);
const isUnitName = (n: string): n is UnitName =>
  /^\w+:$/.test(n) && n.slice(0, -1) in ns.unitRange;

const parseCron = (spec: string): AST => {
  const tokens = tokenise(spec);

  const need = (ast: MaybeAST): AST => {
    if (!ast) throw new Error(`Bad syntax: ${tokens.join(" ")}`);
    return ast;
  };

  const number: Parser = () => {
    if (tokens.length && isInt(tokens[0])) {
      return { tag: "numset", value: ns.from(Number(tokens.shift())) };
    }
  };

  const unit = (type: UnitName, child: AST): AST => ({
    tag: "unit",
    value: type,
    children: [child],
  });

  const typed = (type: UnitName, value: number): AST =>
    unit(type, { tag: "numset", value: ns.from(value) });

  const atom: Parser = () => {
    const num = number();
    if (num) return num;
    if (!tokens.length) return;
    const tok = tokens.shift() as string;
    if (tok === "*") return { tag: "numset", value: ns.fullSet };
    if (isUnitName(tok)) return unit(tok.slice(0, -1), need(atom()));
    if (isDay(tok)) return typed("dow", dayNames[tok]);
    if (isMonth(tok)) return typed("month", monthNames[tok]);
    if (isSpecialName(tok)) return { tag: "special", value: tok };
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
    return { tag: "range", children: [lhs, rhs] };
  };

  const step: Parser = () => {
    const lhs = range();
    if (!lhs || !tokens.length || tokens[0] !== "/") return lhs;
    tokens.shift();
    return { tag: "step", children: [lhs, need(range())] };
  };

  const sepList = (tag: Nary["tag"], sep: string, up: Parser): Parser => () => {
    const head = up();
    if (!head) return;
    const children = [head];
    while (tokens.length && tokens[0] === sep) {
      tokens.shift();
      children.push(need(up()));
    }
    return children.length === 1 ? children[0] : { tag, children };
  };

  const list = sepList("union", ",", step);

  const unary: Parser = () => {
    if (!tokens.length) return;
    const tok = tokens.shift() as string;
    if (tok === "~") return { tag: "reverse", children: [need(unary())] };
    if (tok === "!") return { tag: "invert", children: [need(unary())] };
    tokens.unshift(tok);
    return list();
  };

  const rule: Parser = () => {
    const children: AST[] = [];
    for (;;) {
      const next = unary();
      if (!next) break;
      children.push(next);
    }
    return children.length === 1 ? children[0] : { tag: "rule", children };
  };

  const intersection = sepList("intersection", "&", rule);
  const union = sepList("union", "|", intersection);
  const ast = union();

  if (!ast || tokens.length) {
    throw new Error(`Syntax error: ${tokens.join(" ")}`);
  }

  return ast;
};

type Visitor = (node: AST, path: AST[]) => MaybeAST;
type VisitorSpec = { pre?: Visitor; post?: Visitor };

const walkTree = (vs: VisitorSpec, path: AST[] = []) => (ast: AST): AST => {
  let nd = ast;
  nd = (vs.pre && vs.pre(nd, path)) || nd;
  if ("children" in nd) {
    const next = walkTree(vs, [nd, ...path]);
    const children = nd.children.map(next);
    // Have any children changed?
    const diff = children.some((child, i) =>
      (nd as Unit | Operator).children[i] !== child
    );
    if (diff) nd = { ...nd, children } as AST;
  }
  nd = (vs.post && vs.post(nd, path)) || nd;
  return nd;
};

const compose = <T>(...fn: ((arg: T) => T)[]) => (v: T) =>
  fn.reduce((v, f) => f(v), v);

const isNumSet = (ast: AST): ast is NumSet => ast.tag === "numset";
const isSpecial = (ast: AST): ast is Special => ast.tag === "special";
const isLeaf = (ast: AST): ast is Special | NumSet =>
  isNumSet(ast) || isSpecial(ast);
const isUnit = (ast: AST): ast is Unit => ast.tag === "unit";
const isRule = (ast: AST): ast is Rule => ast.tag === "rule";
const isUnion = (ast: AST): ast is Union => ast.tag === "union";
const isIntersection = (ast: AST): ast is Intersection =>
  ast.tag === "intersection";
const isReverse = (ast: AST): ast is Reverse => ast.tag === "reverse";
const isInvert = (ast: AST): ast is Invert => ast.tag === "invert";
const isOperator = (ast: AST): ast is Operator =>
  "children" in ast && !isRule(ast) && !isUnit(ast);

const isConstant = <O extends Operator>(
  ast: Constant<O> | O,
): ast is Constant<O> => ast.children.every(isNumSet);

const isAllRules = <O extends Operator>(
  ast: AllRules<O> | O,
): ast is AllRules<O> => ast.children.every(isRule);

const lowerReverse = walkTree({
  pre: (ast) => {
    if (isReverse(ast) && ast.children.length === 1) {
      const [child] = ast.children;
      if (isLeaf(child)) return;
      return {
        ...child,
        children: child.children.map((child) => ({
          tag: "reverse",
          children: [child],
        })),
      } as AST;
    }
  },
});

const raiseRules = walkTree({
  post: (ast) => {
    if (
      (isIntersection(ast) || isReverse(ast) || isInvert(ast)) &&
      isAllRules(ast)
    ) {
      const children = _.zip(...ast.children.map((child) => child.children))
        .map(
          (children) => ({
            ...ast,
            children: children.filter((c) => c !== undefined),
          }),
        ) as Operator[];

      return { tag: "rule", children };
    }
  },
});

const raiseUnits = walkTree({
  post: (ast) => {
    if (isOperator(ast)) {
      const units = _(ast.children).filter(isUnit).map((unit) => unit.value)
        .uniq()
        .value();
      if (units.length) {
        if (units.length !== 1) {
          throw new Error(`Units mismatch: ${units.join(", ")}`);
        }
        const children = ast.children.flatMap(
          (child) => child.tag === "unit" ? child.children : [child],
        );
        return {
          tag: "unit",
          value: units[0],
          children: [{ tag: ast.tag, children }],
        } as AST;
      }
    }
  },
});

const flattenChildren = walkTree({
  post: (ast) => {
    if (isRule(ast) || isUnion(ast) || isIntersection(ast)) {
      const children = ast.children.flatMap((child) =>
        child.tag === ast.tag ? child.children : [child]
      );
      return { tag: ast.tag, children };
    }
  },
});

const foldConstants = walkTree({
  post: (ast) => {
    // Constant union or intersection
    if ((isUnion(ast) || isIntersection(ast)) && isConstant(ast)) {
      const [op, base] = isUnion(ast)
        ? [ns.union, ns.emptySet]
        : [ns.intersection, ns.fullSet];
      const value = ast.children.map((child) => child.value)
        .reduce(op, base);
      return { tag: "numset", value };
    }

    if (isInvert(ast) && isConstant(ast)) {
      return { tag: "numset", value: ns.invert(ast.children[0].value) };
    }

    if (isReverse(ast) && isReverse(ast.children[0])) {
      return ast.children[0].children[0];
    }

    if (ast.tag === "range" && isConstant(ast)) {
      return {
        tag: "numset",
        value: ns.rangeSet(
          ns.setMin(ast.children[0].value),
          ns.setMax(ast.children[1].value),
        ),
      };
    }
  },
});

type Cursor = { ast: AST; next: number };

const walkPosition = (ast: AST, next: number): Cursor => {
  const pos = next;
  if (isOperator(ast) || isUnit(ast)) {
    // All children have the same pos
    const cursors = ast.children.map((child) => walkPosition(child, next));
    const nexts = _.uniq(cursors.map((child) => child.next));
    // All children must be the same width
    if (nexts.length !== 1) {
      throw new Error(`Mixed size rules: ${nexts.join(", ")}`);
    }
    const children = cursors.map((child) => child.ast);
    return { ast: { pos, ...ast, children }, next: nexts[0] };
  }

  if (isRule(ast)) {
    const children: AST[] = [];
    // Children have incremental positions
    for (const child of ast.children) {
      const cursor = walkPosition(child, next);
      next = cursor.next;
      children.push(cursor.ast);
    }
    return { ast: { pos, ...ast, children }, next };
  }

  return { ast: { pos, ...ast }, next: next + 1 };
};

const addPositions = (ast: AST) => walkPosition(ast, 0).ast;

const compile = compose(
  lowerReverse,
  raiseRules,
  raiseUnits,
  flattenChildren,
  foldConstants,
  addPositions,
);

type UnitMap = Set<UnitName>[];

const makeUnitMap = (ast: AST): UnitMap => {
  const um: UnitMap = [];
  walkTree({
    pre: (ast) => {
      if (ast.pos !== undefined) {
        um[ast.pos] ||= new Set<UnitName>();
        if (isUnit(ast)) um[ast.pos].add(ast.value);
        return ast;
      }
    },
  })(ast);
  return um;
};

const crons = [
  // "0-3, 3/5 1-2, 4 * jan, mar, dec !!(TUE, THU | FRI)",
  // "* * * * * mon, fri",
  "* (1 | ~1) (~(1 2) | ~feb sat,sun)",
  // "* * * mon, tue, wed",
  // "*/10 * (8-20 1-14 & 10 13,15) * ~3,5-10",
  // "* * * !3,5 * *",
];

for (const cron of crons) {
  // console.log(tokenise(cron));
  const ast = parseCron(cron);
  const compiled = compile(ast);
  const unitMap = makeUnitMap(compiled);
  console.log(
    Deno.inspect(
      { cron, ast, compiled, unitMap },
      { depth: 100, colors: true, compact: true },
    ),
  );
}

// p0Nk-foo3-B156-p00l
