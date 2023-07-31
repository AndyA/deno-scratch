import _ from "https://cdn.skypack.dev/lodash?dts";

export type Range = [number, number];

export const unitRange: Record<string, Readonly<Range>> = {
  second: [0, 60],
  minute: [0, 60],
  hour: [0, 24],
  day: [1, 32],
  month: [1, 13],
  dow: [0, 7],
} as const;

export class NumSet extends Set<number> {
  get ranges(): Range[] {
    const ranges: Range[] = [];
    for (const member of [...this].sort((a, b) => a - b)) {
      if (!ranges.length || member !== ranges[ranges.length - 1][1] + 1) {
        ranges.push([member, member]);
      } else ranges[ranges.length - 1][1] = member;
    }
    return ranges;
  }

  toString(): string {
    const ranges = this.ranges
      .map(([low, high]) => (low === high ? low : `${low}-${high}`))
      .join(", ");
    return `[${ranges}]`;
  }

  [Symbol.for("Deno.customInspect")]() {
    return this.toString();
  }
}

export const from = (n: number | number[]): NumSet => {
  if (!Array.isArray(n)) return from([n]);
  return new NumSet(n);
};

export type NumSetOp = (a: NumSet, b: NumSet) => NumSet;

export const emptySet = from([]);
export const fullSet = ((limits: Readonly<Range>[]): NumSet => {
  const setMin = Math.min(...limits.map(([low]) => low));
  const setMax = Math.max(...limits.map(([, high]) => high));
  return from(_.range(setMin, setMax));
})(Object.values(unitRange));

// export const emptySet: NumSet = new NumSet();
export const invert = (set: NumSet): NumSet =>
  from([...fullSet].filter((n) => !set.has(n)));

export const union: NumSetOp = (a, b) => from([...a, ...b]);

export const intersection: NumSetOp = (a, b) =>
  from([...a].filter((n) => b.has(n)));

export const setMin = (set: NumSet): number => Math.min(...[...set]);
export const setMax = (set: NumSet): number => Math.max(...[...set]);
export const rangeSet = (first: number, last: number): NumSet =>
  from(_.range(first, last + 1));

export const fillDown = (set: NumSet): NumSet =>
  rangeSet(setMin(fullSet), setMax(set));

export const fillUp = (set: NumSet): NumSet =>
  rangeSet(setMin(set), setMax(fullSet));
