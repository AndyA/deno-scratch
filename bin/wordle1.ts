// import {
//   includes,
//   startCase,
// } from "https://cdn.skypack.dev/-/lodash@v4.17.21-K6GEbP02mWFnLA45zAmi/dist=es2019,mode=types/index.js";
import { solutions, valid, WordList } from "../lib/wordle/words.ts";

type WordSet = string[];
type Predicate = (word: string) => boolean;

type SlotState = "b" | "y" | "g";

type GameLine = {
  word: string;
  state: SlotState[];
};

const filterOnLine = (words: WordList, line: GameLine): WordSet => {
  const preds = line.state.map((state, i): Predicate => {
    const letter = line.word[i];
    switch (state) {
      case "g":
        return (word: string) => word[i] === letter;
      case "y":
        return (word: string) => word.includes(letter) && word[i] !== letter;
      case "b":
        return (word: string) => !word.includes(letter);
    }
  });
  return words.filter((word) => preds.every((pred) => pred(word)));
};

const markLine = (needle: string, word: string): GameLine => {
  const state = Array.from(word).map((letter, i) =>
    needle[i] === letter ? "g" : needle.includes(letter) ? "y" : "b"
  );
  return { word, state };
};

const getOptions = (haystack: WordSet, words = haystack) => {
  const score: Record<string, number> = {};
  for (const word of words) {
    const splits = new Set<string>();
    for (const needle of haystack) {
      const line = markLine(needle, word);
      const key = line.state.join("");
      splits.add(key);
    }
    score[word] = splits.size;
  }
  return score;
};

const getBest = (haystack: WordSet, words = haystack) => {
  const options = getOptions(haystack, words);
  const byCount = Object.entries(options).sort((a, b) => b[1] - a[1]);
  const bestCount = byCount[0][1];
  const cutoff = byCount.findIndex((c) => c[1] < bestCount);
  return byCount.slice(0, cutoff).map((c) => c[0]);
};

const wordCache = new WeakMap<string[], string[]>();
const getCached = (words: WordSet) => {
  let set = wordCache.get(words);
  if (!set) wordCache.set(words, set = getBest(words));
  return set;
};

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const solve = (needle: string, words: WordSet) => {
  let ln = 0;
  while (words.length > 1) {
    const best = pick(getCached(words));
    const line = markLine(needle, best);
    const state = line.state.join("");
    console.log(`${++ln} ${line.word}: ${state}`);
    if (state === "ggggg") return ln;
    words = filterOnLine(words, line);
  }
  console.log(`${++ln} ${words[0]}: ggggg`);
  return ln;
};

if (0) {
  const dict = [...solutions];
  const stats: Record<number, number> = {};
  for (const word of solutions) {
    console.log(`Needle: ${word}`);
    const rows = solve(word, dict);
    stats[rows] = (stats[rows] || 0) + 1;
    console.log();
  }

  console.log(stats);
}

const hs1 = filterOnLine([...solutions], {
  word: "trace",
  state: ["b", "y", "b", "b", "y"],
});
const hs2 = filterOnLine(hs1, {
  word: "sinew",
  state: ["b", "b", "b", "g", "b"],
});
const hs3 = filterOnLine(hs2, {
  word: "revel",
  state: ["y", "b", "b", "g", "y"],
});
console.log(hs2, hs3);
// const best = getBest(hs3, hs3);
// console.log(best);
