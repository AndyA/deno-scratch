interface Pointer {
  addr: number;
}

interface Chunk extends Pointer {
  size: number;
}

interface Entry {
  key: string;
  chunk: Chunk;
}

abstract class RefCount {
  count = 1;

  abstract destroy(): void;

  claim(): this {
    this.count++;
    return this;
  }

  release(): this {
    if (--this.count === 0) this.destroy();
    return this;
  }
}

export class Arena extends RefCount {
  hwm = 0;

  alloc(size: number): Chunk {
    const addr = this.hwm;
    this.hwm += size;
    return { addr, size };
  }

  destroy(): void {
    console.log(`Arena destroyed`);
  }
}

type Action = (chunk: Chunk) => void;

abstract class WithArena {
  arena: Arena;

  constructor(arena: Arena) {
    this.arena = arena;
  }

  abstract insert(key: string, src: Chunk): this;
  abstract find(key: string): Chunk | undefined;

  copyToArena(src: Chunk): Chunk {
    const chunk = this.arena.alloc(src.size);
    console.log(`Copy ${src.addr}/${src.size} to ${chunk.addr}/${chunk.size}`);
    return chunk;
  }

  withChunk(key: string, action: Action): boolean {
    const chunk = this.find(key);
    if (!chunk) return false;

    this.arena.claim();
    try {
      action(chunk);
    } finally {
      this.arena.release();
    }

    return true;
  }
}

export class Log extends WithArena {
  log: Entry[] = [];

  insert(key: string, src: Chunk): this {
    const chunk = this.copyToArena(src);
    this.log.push({ key, chunk });
    return this;
  }

  find(key: string): Chunk | undefined {
    return this.log.findLast((entry) => entry.key === key)?.chunk;
  }

  copyToHash(hash: Hash) {
    const { log } = this;
    if (hash.arena !== this.arena) {
      throw new Error(`Can't copy to different arena`);
    }
    for (let i = log.length - 1; i >= 0; i--) {
      const entry = log[i];
      if (!hash.find(entry.key)) hash.copy(entry.key, entry.chunk);
    }
  }
}

export class Hash extends WithArena {
  map = new Map<string, Chunk>();

  copy(key: string, chunk: Chunk): this {
    this.map.set(key, chunk);
    return this;
  }

  insert(key: string, chunk: Chunk): this {
    return this.copy(key, this.copyToArena(chunk));
  }

  find(key: string): Chunk | undefined {
    return this.map.get(key);
  }

  moveToHash(hash: Hash) {
    const { map } = this;
    for (const [key, chunk] of map.entries()) {
      if (!hash.find(key)) hash.insert(key, chunk);
    }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Store {
  hash: Hash;
  logs: Log[] = [];

  constructor() {
    this.hash = new Hash(new Arena());
    this.logs = [new Log(new Arena())];
  }

  insert(key: string, src: Chunk): this {
    const { logs } = this;
    // Ensure we have a write log
    if (logs.length === 0) throw new Error(`No log!`);
    // Append to it
    logs[logs.length - 1]?.insert(key, src);
    return this;
  }

  withChunk(key: string, action: Action): boolean {
    // Search the logs in reverse order
    const logHit = this.logs.findLast((log) => log.withChunk(key, action));
    if (logHit) return true;
    // and then the hash
    return this.hash.withChunk(key, action);
  }

  async sweep(): Promise<void> {
    const { hash, logs } = this;
    if (logs.length === 0) return;

    // New log to collect writes. Now we have at least two.
    logs.push(new Log(new Arena()));

    // Let's retire this one
    const log = logs[0];

    // Make a new hash that shares its arena with the log we're retiring
    const next = new Hash(log.arena);
    await delay(1);
    log.copyToHash(next);
    await delay(1);
    hash.moveToHash(next);
    await delay(1);

    logs.shift();

    // Switch to the new hash and
    this.hash = next;
    // release the old hash's arena
    hash.arena.release();
  }
}

const store = new Store();
const showChunk = (key: string) => {
  store.withChunk(key, (chunk: Chunk) => {
    console.log(`with ${key}: ${chunk.addr}/${chunk.size}`);
  });
};

for (let i = 0; i < 10; i++) {
  const addr = Math.round(Math.random() * 1024);
  const size = Math.round(Math.random() * 64 + 64);
  const name = `A${i}`;
  console.log(`insert ${name}: ${addr}/${size}`);
  store.insert(name, { addr, size });
}

console.log(store);
showChunk(`A4`);
await store.sweep();
console.log(store);
for (let i = 0; i < 10; i++) {
  const addr = Math.round(Math.random() * 1024);
  const size = Math.round(Math.random() * 64 + 64);
  const name = `B${i}`;
  console.log(`insert ${name}: ${addr}/${size}`);
  store.insert(name, { addr, size });
}
// Replace A1
store.insert(`A1`, { addr: 1024, size: 96 });
showChunk(`A1`);
console.log(store);
await store.sweep();
console.log(store);
