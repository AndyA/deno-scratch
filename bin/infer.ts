type JobDone = {
  topic: "job/done";
  payload: { name: string };
};

type JobStart = {
  topic: "job/start";
  payload: { sequence: number };
};

type SessionDone = {
  topic: "session/done";
  payload: { id: number };
};

type Message = JobDone | JobStart | SessionDone;

type OneSpace = " " | "\t";
type WhiteSpace<S extends string> = S extends OneSpace ? " "
  : S extends `${OneSpace}${infer Tail}` ? WhiteSpace<Tail>
  : never;

// type F1 = WhiteSpace<"\t">;

type WildCard<T extends string> = T extends `${infer Head}/${infer Tail}`
  ? `*/${WildCard<Tail>}` | `${Head}/${WildCard<Tail>}`
  : "*" | T;

type Topic = WildCard<Message["topic"]>;

type WithTopic<T> = Message & { topic: T };

type Matches<T extends string, U extends { topic: string }> = T extends
  WildCard<U["topic"]> ? U : never;

type Glob<T extends string> = {
  [K in Message["topic"]]: Matches<T, WithTopic<K>>;
}[Message["topic"]];

type XX = Glob<"job/*">;

type Foo = Matches<"job/*", SessionDone>;
type Bar = Matches<"job/*", JobDone>;

type MessageFor<T extends string> = T extends WildCard<T> ? WithTopic<T>
  : never;

const subscribe = <T extends Message["topic"]>(
  topic: WildCard<T>,
  listener: (message: MessageFor<T>) => void,
) => {
  void topic;
  void listener;
};

subscribe("job/start", (message) => {
  console.log(message.payload.sequence);
});

subscribe("job/done", (message) => {
  console.log(message.payload.name);
});

subscribe("job/*", (message) => {
  console.log(message.payload);
});
