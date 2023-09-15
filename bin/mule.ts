// const inflater = new DecompressionStream("deflate");

const deflator = new CompressionStream("deflate");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writer = async () => {
  const w = deflator.writable.getWriter();
  await w.write(Uint8Array.from([1, 2, 3, 4, 5, 6]));
  await w.close();
};

const reader = async () => {
  for await (const chunk of deflator.readable) {
    console.log(`read`, chunk);
  }
};

await Promise.all([reader(), writer()]);
console.log(`done`);
