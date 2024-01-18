import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { insert, TrieNode } from "./crit-trie.ts";

interface TestCase {
  inserts: number[];
  want: TrieNode;
}

function* permute<T>(list: T[]): Generator<T[]> {
  if (list.length < 2) {
    yield list;
    return;
  }
  for (let i = 0; i < list.length; i++) {
    for (const tail of permute([...list.slice(0, i), ...list.slice(i + 1)])) {
      yield [list[i], ...tail];
    }
  }
}

const cases: TestCase[] = [
  { inserts: [0x000000], want: { prefix: 0x000000, bits: 24 } },
  { inserts: [0x000000, 0x000000], want: { prefix: 0x000000, bits: 24 } },
  {
    inserts: [0x000000, 0x000001],
    want: {
      prefix: 0x000000,
      bits: 23,
      zero: { bits: 0, prefix: 0 },
      one: { bits: 0, prefix: 0 },
    },
  },
  {
    inserts: [0x000000, 0x00ffff],
    want: {
      prefix: 0x000000,
      bits: 8,
      zero: { prefix: 0x000000, bits: 15 },
      one: { prefix: 0x007fff, bits: 15 },
    },
  },
  {
    inserts: [0x000000, 0x00ffff, 0x0000ff],
    want: {
      prefix: 0x000000,
      bits: 8,
      zero: {
        prefix: 0x000000,
        bits: 7,
        zero: { prefix: 0x000000, bits: 7 },
        one: { prefix: 0x00007f, bits: 7 },
      },
      one: { prefix: 0x007fff, bits: 15 },
    },
  },
  {
    inserts: [0x000000, 0x00ffff, 0x00ff00],
    want: {
      prefix: 0x000000,
      bits: 8,
      zero: { prefix: 0x000000, bits: 15 },
      one: {
        prefix: 0x007f00,
        bits: 7,
        zero: { prefix: 0x000000, bits: 7 },
        one: { prefix: 0x00007f, bits: 7 },
      },
    },
  },
  {
    inserts: [0x000000, 0x00ffff, 0x0000ff, 0x00ff00, 0x00ffff],
    want: {
      prefix: 0x000000,
      bits: 8,
      zero: {
        prefix: 0x000000,
        bits: 7,
        zero: { prefix: 0x000000, bits: 7 },
        one: { prefix: 0x00007f, bits: 7 },
      },
      one: {
        prefix: 0x007f00,
        bits: 7,
        zero: { prefix: 0x000000, bits: 7 },
        one: { prefix: 0x00007f, bits: 7 },
      },
    },
  },
  {
    inserts: [0x800000, 0x000000],
    want: {
      prefix: 0x000000,
      bits: 0,
      zero: { prefix: 0, bits: 23 },
      one: { prefix: 0, bits: 23 },
    },
  },
];

const makeTrie = (inserts: number[]) => {
  let trie: TrieNode | undefined;
  for (const packed of inserts) {
    console.log(`>>> insert ${packed.toString(2)}`);
    trie = insert(trie, packed);
    console.log(`>>> inserted`, trie);
  }
  return trie;
};

const isSame = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((e, i) => e === b[i]);

Deno.test(`insert`, () => {
  for (const { inserts, want } of cases) {
    for (const packed of permute(inserts)) {
      if (isSame([0, 0xff, 0xffff], packed)) {
        console.log({ packed });
        const trie = makeTrie(packed);
        assertEquals(trie, want);
      }
    }
  }
});
