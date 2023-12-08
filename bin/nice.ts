const format = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const nice = (parts: TemplateStringsArray, ...subs: unknown[]) => {
  const args = subs.map(format);
  return parts.flatMap((p, i) => i < args.length ? [p, args[i]] : [p])
    .join("");
};

console.log(
  nice`This is a number: ${12345980238021}, object: ${{
    foo: 1,
  }}, true: ${true}`,
);
