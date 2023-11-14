import { snoopy } from "../lib/snoop.ts";

const logger = (path: string[], value: unknown) => {
  if (value && typeof value === "object") return;

  console.log(`Path: $.${path.join(".")}`);
  const e = new Error("Don't worry");
  console.log(e.stack?.split(/\n/).slice(3).join("\n"));
};

const instrument = snoopy(logger);

const main = () => {
  const author = { name: "Andy Armstrong", email: "andy@hexten.net" };
  const a = { deeply: { nested: { array: [{ of: "stuff" }] } } };
  const data = {
    a,
    author,
    tags: ["idiot", "programmer", "lazy"],
    also: { author, a },
  };

  const prox = instrument(data);
  console.log(prox.author.name);
  console.log(prox.also.author.email);

  const { deeply } = prox.a;
  console.log(deeply.nested.array[0].of);
  const { nested } = prox.a.deeply;
  console.log(nested.array[0].of);
  console.log(prox.also.a.deeply.nested.array[0].of);
  // console.log(JSON.stringify(prox.tags));
};

main();
