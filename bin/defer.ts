type Cleanup = () => void;
type Defer = (deferred: Cleanup) => void;
type Action<T> = (defer: Defer) => T;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const wrap = <T>(action: Action<T>): T => {
  const cleanup: Cleanup[] = [];
  const defer: Defer = (deferred) => {
    cleanup.unshift(deferred);
  };
  try {
    return action(defer);
  } finally {
    for (const cl of cleanup) cl();
  }
};

type AsyncCleanup = () => void | Promise<void>;
type AsyncDefer = (deferred: AsyncCleanup) => void;
type AsyncAction<T> = (defer: Defer) => Promise<T>;

const wrapAsync = async <T>(action: AsyncAction<T>): Promise<T> => {
  const cleanup: AsyncCleanup[] = [];
  const defer: AsyncDefer = (deferred) => {
    cleanup.unshift(deferred);
  };
  try {
    return await action(defer);
  } finally {
    for (const cl of cleanup) await cl();
  }
};

const open = (name: string) => {
  console.log(`Open ${name}`);
  return () => {
    console.log(`Close ${name}`);
  };
};

const x = wrap((defer) => {
  defer(open("file1"));
  defer(open("file2"));
  console.log(`Sleep`);
  // await sleep(5000);
  console.log(`Return`);
  return [1, 2, 3];
});

const y = await wrapAsync(async (defer) => {
  defer(open("file3"));
  defer(open("file4"));
  defer(async () => {
    console.log(`Sleeping cleanup`);
    await sleep(500);
    console.log(`Awakes!`);
  });
  console.log(`Sleep`);
  await sleep(500);
  console.log(`Return`);
  return [1, 2, 3];
});

console.log(x, y);
