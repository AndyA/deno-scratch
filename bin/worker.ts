/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { Message } from "./threads.ts";

self.onmessage = (ev: MessageEvent<Message>) => {
  console.log(`worker:`, ev.data);
  self.postMessage(ev.data);
};
