import { APCClient } from "../lib/apc/APCClient.ts";

const apc = await APCClient.connect("hattie", 3551);
const [status, events] = await Promise.all([
  apc.getStatus(),
  apc.getEvents(),
]);
apc.close();
console.log({ status, events });
