import rough from "npm:roughjs";
import { createCanvas } from "https://deno.land/x/canvas/mod.ts";

const outFile = await Deno.open("tmp/movie.mpng", {
  create: true,
  write: true,
});

const out = outFile.writable.getWriter();
await out.ready;

const canvas = createCanvas(1920, 1080);
const ctx = canvas.getContext("2d");

for (let i = 0; i < 50; i++) {
  console.log(`Frame ${i}`);
  ctx.clearRect(0, 0, 1920, 1080);
  // @ts-expect-error types
  const r = rough.canvas(canvas, { seed: i });
  r.circle(1920 / 2 + i * 10 - 250, 1080 / 2, 500, {
    fill: "red",
    stroke: "yellow",
  });
  await out.write(canvas.toBuffer());
}

await out.close();
