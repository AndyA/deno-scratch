type WildCard<T extends string> = T extends `${infer Head}/${infer Tail}`
  ? `*/${WildCard<Tail>}` | `${Head}/${WildCard<Tail>}`
  : "*" | T;

type HasTopic = { topic: string };
type Topic<M extends HasTopic> = M["topic"];
type WildTopic<M extends HasTopic> = WildCard<Topic<M>>;

type Matches<T, M extends HasTopic> = T extends WildTopic<M> ? M : never;

type TopicType<T extends string, M extends HasTopic> = {
  [K in Topic<M>]: Matches<T, M & { topic: K }>;
}[Topic<M>];

type Listener<T extends string, M extends HasTopic> = (
  msg: TopicType<T, M>,
) => void | Promise<void>;

type Listeners<M extends HasTopic> = { [T in Topic<M>]?: Listener<T, M>[] };
type Cache<M extends HasTopic> = { [T in WildTopic<M>]?: Topic<M>[] };

const uniq = <T>(list: T[]): T[] => [...new Set<T>(list)];

export class Switchboard<M extends HasTopic> {
  private readonly topics: Topic<M>[];
  private listeners: Listeners<M> = {};
  private cache: Cache<M> = {};
  private critical = false;

  constructor(topics: Topic<M>[]) {
    this.topics = topics;
  }

  async send<T extends Topic<M>>(message: TopicType<T, M>): Promise<boolean> {
    const handlers = this.listeners[message.topic];
    if (!handlers || !handlers.length) return false;
    if (this.critical) throw new Error(`emit() is not re-entrant`);
    this.critical = true;
    try {
      for (const handler of handlers) await handler(message);
    } finally {
      this.critical = false;
    }
    return true;
  }

  private subscribe<T extends Topic<M>>(
    topic: T,
    listener: Listener<T, M>,
  ): this {
    const { listeners } = this.unsubscribe(topic, listener);
    (listeners[topic] ||= []).push(listener);
    return this;
  }

  private unsubscribe<T extends Topic<M>>(
    topic: T,
    listener: Listener<T, M>,
  ): this {
    const { listeners } = this;
    const handlers = listeners[topic];
    if (handlers) {
      const pos = handlers.indexOf(listener);
      if (pos >= 0) handlers.splice(pos, 1);
    }
    return this;
  }

  private match(wild: WildTopic<M>, topic: Topic<M>): boolean {
    const tp = topic.split("/");
    const pp = wild.split("/");
    return (
      tp.length === pp.length && pp.every((p, i) => p === "*" || p === tp[i])
    );
  }

  private expand<T extends WildTopic<M>>(wild: T | T[]): Topic<M>[] {
    if (Array.isArray(wild)) {
      return uniq(wild.flatMap((next) => this.expand(next)));
    }
    return (this.cache[wild] = this.cache[wild] ||
      this.topics.filter((topic) => this.match(wild, topic)));
  }

  /**
   * Send a message.
   * @param message the message to send
   * @returns a promise that resolves a boolean that indicates whether any
   * listeners were invoked
   */

  /**
   * Register a listener to be called when a message with a matching topic
   * is sent. The topic may be a wildcard or multiple wildcards.
   *
   * @param wild a wildcard topic name or array of same
   * @param listener the listener to call when matching messages are sent
   * @returns this
   */
  on<T extends WildTopic<M>>(wild: T | T[], listener: Listener<T, M>): this {
    for (const topic of this.expand(wild)) this.subscribe(topic, listener);
    return this;
  }

  /**
   * Remove a listener for a topic. The topic may be a wildcard or multiple
   * wildcards.
   *
   * @param wild a wildcard topic name or array of same
   * @param listener the listener to remove
   * @returns this
   */
  off<T extends WildTopic<M>>(wild: T | T[], listener: Listener<T, M>): this {
    for (const topic of this.expand(wild)) this.unsubscribe(topic, listener);
    return this;
  }
}

type JobStart = {
  topic: "job/start";
  payload: { id: string };
};

type JobEnd = {
  topic: "job/end";
  payload: { id: string; result: number };
};

type SessionInit = {
  topic: "session/init";
  payload: { pid: number };
};

type SessionEnd = {
  topic: "session/end";
  payload: { result: number };
};

type Message = JobStart | JobEnd | SessionInit | SessionEnd;

const sb = new Switchboard<Message>([
  "job/start",
  "job/end",
  "session/init",
  "session/end",
]);

sb.on("job/*", (msg) => {
  console.log(msg.payload.id);
  if (msg.topic === "job/end") {
    console.log(msg.payload.result);
  }
}).on(["*/end", "session/*"], (msg) => {
  if (msg.topic === "job/end" || msg.topic === "session/end") {
    console.log(msg.payload.result);
  }
});

await sb.send({ topic: "job/end", payload: { result: 123, id: "Hello" } });
