import rough from "npm:roughjs";
import { createCanvas } from "https://deno.land/x/canvas/mod.ts";

const outFile = await Deno.open("movie.mpng", { create: true, write: true });

const out = outFile.writable.getWriter();
await out.ready;

for (let i = 0; i < 50; i++) {
  console.log(`Frame ${i}`);
  const canvas = createCanvas(1920, 1080);
  // @ts-expect-error types
  const r = rough.canvas(canvas, { seed: i });
  r.circle(1920 / 2, 1080 / 2, 500, { fill: "red", stroke: "yellow" });
  await out.write(canvas.toBuffer());
}

await out.close();
