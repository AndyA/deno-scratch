import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";
import _ from "https://cdn.skypack.dev/lodash?dts";

const viewSchema = z.object({});

const table = (labels: string[], columns = 4, gutter = 4) => {
  const sorted = _(labels).sort().value();
  const cols = _(sorted).chunk(columns).unzip().value();
  const pads = cols.map((col) => {
    const nonNull = col.map((label) => label ?? "");
    const width = Math.max(0, ...nonNull.map((s) => s.length));
    return nonNull.map((label) => label.padEnd(width));
  });
  const gap = "".padEnd(gutter);
  const rows = _(pads).unzip().map((row) => row.join(gap)).value();
  console.log(rows.join("\n"));
};

console.log();
table(Object.keys(viewSchema), 3, 8);
console.log();
