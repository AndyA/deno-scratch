import { SnoopLogger, snoopy } from "../lib/snoop.ts";

const logger: SnoopLogger = (path, value) => {
  void value;
  const e = new Error("Not really");
  console.log(`$.${path.join(".")}`);
  console.log(e.stack?.split(/\n/).slice(3).join("\n"));
};

const coverage = snoopy(logger);

const main = () => {
  const data = {
    author: { name: "Andy Armstrong", email: "andy@hexten.net" },
    tags: ["programmer", "idiot"],
  };

  const prox = coverage(data);
  console.log(prox.author.name);
  console.log(prox.tags[0]);
  console.log(prox.author === prox.author);
};

main();
