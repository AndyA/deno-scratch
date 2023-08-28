// type NonEmpty<T> = [T, ...T[]];
// const isNonEmpty = <T>(list: T[]): list is NonEmpty<T> => list.length !== 0;

// const first = <T>(list: NonEmpty<T>): T => list[0];

// const tests = [[], ["Hello", "World"], ["Goodbye"]];

// const stripped = tests.filter(isNonEmpty);
// const firsts = stripped.map(first);

// console.log(firsts);

type TrieNode = {
  terminal?: true;
  next: Record<string, TrieNode>;
};

const addStrings = (
  strings: string[],
  node?: TrieNode,
): TrieNode | undefined => {
  const addString = (chars: string[], node?: TrieNode): TrieNode => {
    node ||= { next: {} };
    if (chars.length === 0) return { ...node, terminal: true };
    const [head, ...tail] = chars;
    node.next[head] = addString(tail, node.next[head]);
    return node;
  };

  return strings.reduce(
    (trie, str) => addString(Array.from(str), trie),
    node,
  );
};

const width = (node: TrieNode): number =>
  Object.keys(node.next).length + (node.terminal ? 1 : 0);
const isForked = (node: TrieNode): boolean => width(node) > 1;

const walk = (
  node: TrieNode | undefined,
  visit: (prefix: string, full: string) => void,
  prefix = "",
): string | false => {
  if (!node) return false;
  if (isForked(node)) {
    for (const [char, next] of Object.entries(node.next)) {
      walk(next, visit, prefix + char);
    }
    if (node.terminal) visit(prefix, prefix);
    return false;
  }

  const tail = Object.entries(node.next);
  if (tail.length) {
    const [[char, next]] = tail;
    const full = walk(next, visit, prefix + char);
    if (full !== false) visit(prefix, full);
    return full;
  }

  visit(prefix, prefix);
  return prefix;
};

const abbreviate = (node?: TrieNode) => {
  const abbrev: Record<string, string> = {};
  walk(node, (prefix, full) => {
    abbrev[prefix] = full;
  });
  return abbrev;
};

const tests = [
  {
    words: ["rust", "ruby"],
    want: { rus: "rust", rust: "rust", rub: "ruby", ruby: "ruby" },
  },
];

const trie = addStrings(["rust", "ruby", "rubber", "rub", "test"]);
console.log(Deno.inspect(trie, { colors: true, depth: 100 }));
const abbrev = abbreviate(trie);
console.log(Deno.inspect(abbrev, { colors: true, depth: 100 }));
