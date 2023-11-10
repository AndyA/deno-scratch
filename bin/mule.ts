import { snoopy } from "../lib/snoop.ts";

const logger = (path: string[], value: unknown) => {
  if (value && typeof value === "object") return;

  console.log(`Path: $.${path.join(".")}`);
  const e = new Error("Don't worry");
  console.log(e.stack?.split(/\n/).slice(3).join("\n"));
};

const instrument = snoopy(logger);

const main = () => {
  const data = {
    author: { name: "Andy Armstrong", email: "andy@hexten.net" },
    tags: ["idiot", "programmer", "lazy"],
  };

  const prox = instrument(data);
  console.log(prox.author.name);
  // console.log(prox.tags[1]);
  const foo = prox.tags;
  console.log(foo[2]);
  // console.log(JSON.stringify(prox.tags));
};

main();
