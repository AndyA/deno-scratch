import { SnoopLogger, snoopy } from "../lib/snoop.ts";

const logger: SnoopLogger = (path, value) => {
  void value;
  console.log(`$.${path.join(".")}`);
};

const coverage = snoopy(logger);

const data = {
  author: { name: "Andy Armstrong", email: "andy@hexten.net" },
  tags: ["programmer", "idiot"],
};

const prox = coverage(data);
console.log(prox.author.name);
console.log(prox.tags[0]);
console.log(prox.author === prox.author);
