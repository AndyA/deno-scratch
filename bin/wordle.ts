import { solutions, valid, WordList } from "../lib/wordle/words.ts";

type Mark = "b" | "y" | "g";
type WordMark = `${string}${string}${string}${string}${string}`;

type Slot = { index: number; mark: Mark };
type Pair = { index: number; left: string; right: string };
type Predicate = (word: string) => boolean;

type Score = [string, number];

type WordleContext = {
  solutions: readonly string[];
  valid: readonly string[];
};

const makePairs = (word: string, mark: string): Pair[] => {
  if (word.length !== mark.length) {
    throw new Error(`Mark / word length mismatch`);
  }
  const marks = Array.from(mark);
  return Array.from(word).map((left, index) => ({
    index,
    left,
    right: marks[index],
  }));
};

const markWord = (word: string, needle: string): WordMark => {
  const p0 = makePairs(needle, word);
  const marks: Slot[] = [];

  // Find and remove the greens
  const p1 = p0.flatMap((pair) => {
    if (pair.left === pair.right) {
      marks.push({ index: pair.index, mark: "g" });
      return [];
    }
    return [pair];
  });

  // Find and remove yellows
  const p2 = p1.flatMap((pair) => {
    const has = p1.find((px) => px.left === pair.right);
    if (has) {
      marks.push({ index: pair.index, mark: "y" });
      return [];
    }
    return [pair];
  });

  // Everything else is black
  p2.forEach(({ index }) => (marks.push({ index, mark: "b" })));

  return marks.sort((a, b) => a.index - b.index).map(({ mark }) => mark).join(
    "",
  );
};

const getOptions = (haystack: WordList, words: WordList): Score[] => {
  const score: Record<string, number> = {};
  for (const word of words) {
    const splits = new Set<string>();
    for (const needle of haystack) splits.add(markWord(word, needle));
    score[word] = splits.size;
  }
  return Object.entries(score).sort((a, b) => b[1] - a[1]);
};

const bestOptions = (scores: Score[]) => {
  if (!scores.length) return [];
  const topScore = scores[0][1];
  const cutOff = scores.findIndex((score) => score[1] < topScore);
  return scores.slice(0, cutOff);
};

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const filterFactory = () => {
  const cache: Record<WordMark, Record<string, Predicate>> = {};
  const makeFilter = (word: string, mark: WordMark) => {
    const cache: Record<string, boolean> = {};

    const make = (): Predicate => {
      const p0 = makePairs(word, mark);

      // Make a function that returns true if the passed word has the
      // expected letter at any of the specified indexes
      const needLetter =
        (letter: string, indexes: number[]) => (word: string) =>
          indexes.some((idx) => word[idx] === letter);

      const avoidLetter =
        (letter: string, indexes: number[]) => (word: string) =>
          indexes.every((idx) => word[idx] !== letter);

      const preds: (Predicate)[] = [];

      const p1 = p0.flatMap((pair, i) => {
        if (pair.right === "g") {
          // console.log(`word[${i}] === "${pair.left}"`);
          preds.push((word: string) => word[i] === pair.left);
          return [];
        }
        return [pair];
      });

      const p2 = p1.flatMap((pair, i) => {
        if (pair.right === "y") {
          const indexes = p1.map((p) => p.index).filter((n) => n !== i);
          // console.log(`word[${indexes.join(" | ")}] === "${pair.left}"`);
          preds.push(needLetter(pair.left, indexes));
          return [];
        }
        return [pair];
      });

      p2.forEach((pair) => {
        const indexes = p2.map((p) => p.index);
        // console.log(`word[${indexes.join(" & ")}] !== "${pair.left}"`);
        preds.push(avoidLetter(pair.left, indexes));
      });

      return (word: string) => preds.every((pred) => pred(word));
    };

    const pred = make();
    return (word: string) => cache[word] ??= pred(word);
  };

  return (word: string, mark: WordMark) =>
    (cache[mark] ??= {})[word] ??= makeFilter(word, mark);
};

const makeFilter = filterFactory();

export class WordleWorld {
  readonly ctx: WordleContext;

  constructor(ctx: WordleContext) {
    this.ctx = ctx;
  }
}

export class WordleGame {
  readonly world: WordleWorld;
  readonly needle: string;
  remaining: string[];

  constructor(world: WordleWorld, needle: string) {
    this.world = world;
    this.needle = needle;
    // Init game
    this.remaining = [...world.ctx.solutions];
  }

  markWord(word: string): WordMark {
    return markWord(word, this.needle);
  }

  playWord(word: string): WordMark {
    const mark = this.markWord(word);
    this.remaining = this.remaining.filter(makeFilter(word, mark));
    return mark;
  }

  nextWord(): string | undefined {
    const { remaining } = this;
    const nextOptions = bestOptions(getOptions(remaining, remaining));
    const bigOptions = bestOptions(
      getOptions(remaining, this.world.ctx.solutions),
    );
    if (
      nextOptions.length > 1 && bigOptions.length > 1 &&
      bigOptions[0][1] >= nextOptions.length
    ) {
      return pick(bigOptions)[0];
    }
    return nextOptions.length ? pick(nextOptions)[0] : undefined;
  }
}
const world = new WordleWorld({ solutions, valid });

const playGame = (needle: string, start: string) => {
  const game = new WordleGame(world, needle);
  let word: string | undefined = start;
  let step = 0;
  while (word) {
    const mark = game.playWord(word);
    console.log(
      `${++step} ${word}: ${mark} (${game.remaining.length} remaining)`,
    );
    if (mark === "ggggg") return step;
    word = game.nextWord();
  }
  console.log(
    `${++step} ${
      game.remaining[0]
    }: ggggg (${game.remaining.length} remaining)`,
  );
  return step;
};

playGame("older", "trace");
