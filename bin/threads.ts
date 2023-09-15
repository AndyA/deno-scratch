const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

export type Message = { greet: string };

worker.postMessage({ greet: "Hello!" });

worker.onmessage = (ev: MessageEvent<Message>) => {
  console.log(`runner:`, ev.data);
};
