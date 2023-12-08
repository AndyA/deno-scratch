import { assert } from "https://deno.land/std@0.108.0/_util/assert.ts";

export const encode = (word: string): number => {
  const chars = Array.from(word.toUpperCase()).map((char) =>
    char.charCodeAt(0) - 65
  );
  assert(chars.length === 5);
  assert(chars.every((cp) => cp >= 0 && cp < 26));
  // console.log(chars);
  return ((((chars[0] * 26) + chars[1]) * 26 + chars[2]) * 26 + chars[3]) * 26 +
    chars[4];
};

const div = (num: number, den: number): number => Math.floor(num / den);

export const decode = (packed: number): string =>
  [
    div(packed, 26 * 26 * 26 * 26) % 26,
    div(packed, 26 * 26 * 26) % 26,
    div(packed, 26 * 26) % 26,
    div(packed, 26) % 26,
    packed % 26,
  ].map((cp) => String.fromCharCode(cp + 65)).join("");

export interface TrieNode {
  bits: number;
  prefix: number;
  zero?: TrieNode;
  one?: TrieNode;
}

const findCriticalBit = (a: number, b: number): number => {
  let diff = (a ^ b) & 0xffffff;
  let pos = 24;
  while (diff) {
    pos--;
    diff >>= 1;
  }
  return pos;
};

export const insert = (
  node: TrieNode | undefined,
  packed: number,
  depth = 0,
): TrieNode => {
  console.log(`(insert)`, { node, packed: packed.toString(2), depth });
  if (!node) return { prefix: packed, bits: 24 - depth };
  const criticalBit = findCriticalBit(packed, node.prefix);
  console.log({ criticalBit });
  // Already have it?
  if (criticalBit >= 24) return node;

  // For one of our children?
  if (criticalBit > depth + node.bits) {
    const bitIsZero = !(packed & (0x800000 >> depth + node.bits));
    const residue = packed & (0xffffff >> criticalBit);

    console.log(`(down)`, { bitIsZero, residue });

    return bitIsZero
      ? { ...node, zero: insert(node.zero, residue, depth + node.bits + 1) }
      : { ...node, one: insert(node.one, residue, depth + node.bits + 1) };
  }

  const bitIsZero = !(packed & (0x800000 >> criticalBit));

  if (bitIsZero) {
  } else {
    // zero side gets split, one side is new
    // return {
    //   prefix: node.prefix & ~(0xffffff >> criticalBit),
    //   bits: criticalBit - depth,
    //   zero: {prefix: node.prefix & (0xffffff>>(criticalBit+1))}
    //   one: { prefix: packed & (0xffffff >> (criticalBit+1)), bits:depth-1 },
    // };
  }

  const [zeroBase, oneBase] = bitIsZero
    ? [packed, node.prefix]
    : [node.prefix, packed];

  const baseMask = 0xffffff >> (criticalBit + 1);
  console.log(`(here)`, { bitIsZero, zeroBase, oneBase, baseMask });
  return {
    prefix: node.prefix & ~(0xffffff >> criticalBit),
    bits: criticalBit - depth,
    zero: insert(node.zero, zeroBase & baseMask, criticalBit + 1),
    one: insert(node.one, oneBase & baseMask, criticalBit + 1),
  };
};

export const visit = (
  node: TrieNode | undefined,
  cb: (packed: number) => void,
  prefix = 0,
  depth = 0,
) => {
  if (!node) return;
  const pfx = prefix | node.prefix;
  if (node.zero || node.one) {
    visit(node.zero, cb, pfx, depth + node.bits + 1);
    visit(
      node.one,
      cb,
      pfx | (0x80000000 >> depth + node.bits),
      depth + node.bits + 1,
    );
    return;
  }
  cb(pfx);
};
