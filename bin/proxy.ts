import { proxy } from "https://deno.land/x/oak_http_proxy@2.1.0/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.153.0/streams/conversion.ts";
import { TextLineStream } from "https://deno.land/std@0.160.0/streams/mod.ts";

const app = new Application();
const router = new Router();

const pathToURL = (path: string): URL => {
  const u = new URL(path, "http://chaise:sofa@stilt:5984");
  u.pathname = u.pathname.replace(/\.json$/, "");
  return u;
};

router.get(
  "/couch/:path*",
  proxy((ctx) => {
    return pathToURL(ctx.params["path"]);
  }),
);

type StreamState = "INIT" | "ARRAY" | "PASS";

class CouchResultStream extends TransformStream<string, string> {
  state: StreamState = "INIT";
  constructor() {
    super({
      transform: (chunk, controller) => {
        switch (this.state) {
          case "INIT":
            if (/\"rows\":\[/.test(chunk)) {
              this.state = "ARRAY";
            } else {
              this.state = "PASS";
              controller.enqueue(chunk + "\n");
            }
            break;
          case "ARRAY":
            if (chunk !== "]}") {
              controller.enqueue(chunk.replace(/,$/, "") + "\n");
            }
            break;
          case "PASS":
            controller.enqueue(chunk + "\n");
            break;
        }
      },
    });
  }
}

router.get("/proxy/:path*", async (ctx) => {
  const path = ctx.params["path"];
  if (!path) throw new Error(`No path`);
  const url = pathToURL(path);
  url.search = ctx.request.url.search;
  const res = await fetch(url);
  if (!res.body) throw new Error(`No body`);
  const lines = res.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    .pipeThrough(new CouchResultStream())
    .pipeThrough(new TextEncoderStream());
  ctx.response.body = readerFromStreamReader(lines.getReader());
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 3000 });
