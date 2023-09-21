import { readableStreamFromReader } from "https://deno.land/std@0.153.0/streams/conversion.ts";
import { writableStreamFromWriter } from "https://deno.land/std@0.153.0/streams/conversion.ts";
import { TextLineStream } from "https://deno.land/std@0.160.0/streams/mod.ts";

class URLDecodeStream extends TransformStream<string, string> {
  constructor() {
    super({
      transform: (chunk, controller) => {
        try {
          const line = JSON.parse(chunk);
          const { origin, pathname, search } = new URL(line);
          controller.enqueue(
            JSON.stringify({ origin, pathname, search }) + "\n",
          );
        } catch (e) {
          console.error(`${e}`);
        }
      },
    });
  }
}

await readableStreamFromReader(Deno.stdin)
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TextLineStream())
  .pipeThrough(new URLDecodeStream())
  .pipeThrough(new TextEncoderStream())
  .pipeTo(writableStreamFromWriter(Deno.stdout));
