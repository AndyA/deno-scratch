import { assertEquals } from "https://deno.land/std@0.195.0/assert/mod.ts";
import _ from "https://cdn.skypack.dev/lodash?dts";
import { CarryOut, Radix, RadixSource, snapNext, Vector } from "./vector.ts";

type TestCase = {
  vector: Vector;
  radix: Radix | Vector;
  prefix?: Vector;
  want: CarryOut;
};

const bake = <T>(value: T): (prefix: Vector) => T => () => value;
const toRadixSource = (v: RadixSource | number) =>
  typeof v === "number" ? bake(_.range(v)) : v;

const toRadix = (v: Radix | Vector): Radix => v.map(toRadixSource);

const tests: TestCase[] = [{
  vector: [0],
  radix: [2],
  want: { prefix: [0], vector: [], carry: false },
}, {
  vector: [0, 2],
  radix: [2, 2],
  want: { prefix: [1, 0], vector: [], carry: false },
}];

Deno.test("snapNext", () => {
  for (const { vector, radix, prefix, want } of tests) {
    const got = snapNext(vector, toRadix(radix), prefix);
    assertEquals(got, want, `snapNext ${vector.join(", ")}`);
  }
});
