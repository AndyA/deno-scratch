import _ from "https://cdn.skypack.dev/lodash?dts";

export type RepAtom = string | number | RegExp;
export type RepSpec = RepAtom[];
export interface RepExp extends RegExp {
  $: (df: string) => RepExp;
}

type RexTag = (parts: TemplateStringsArray, ...args: RepAtom[]) => RepExp;

const escapePart = (part: string): string =>
  /^\s/.test(part) ? "\\s+" : _.escapeRegExp(part);
const magicSpace = (s: string) => s.split(/(\s+)/).map(escapePart).join("");

export const rep = (expr: RepSpec, flags = ""): RepExp => {
  const escape = flags.includes("w") ? magicSpace : _.escapeRegExp;
  const pattern = expr.map((part) => {
    if (!(part instanceof RegExp)) return escape(String(part));
    if (part.flags !== "") throw new Error(`Please use .$("...")`);
    return part.toString().slice(1, -1);
  }).join("");
  const re = new RegExp(pattern, flags.replace(/[w]/g, ""));
  return Object.assign(re, { $: (df: string) => rep(expr, flags + df) });
};

export const rex: RexTag = (parts, ...args): RepExp => {
  const bits = _.zip(parts, args).flat().slice(0, -1);
  return rep(bits as RepSpec);
};

const re = rex`Hello /${/x(\w+)/}*. Are you ${/(\d+)/}?`.$("iw");
const m = "hello /xboy*. Are you 11?".match(re);
console.log({ re, flags: re.flags, m });
