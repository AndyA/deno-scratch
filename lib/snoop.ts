export type SnoopLogger = (path: string[], value: unknown) => void;
export type Snooper = <T>(obj: T) => T;

export const snoopy = (logger: SnoopLogger | null): Snooper => {
  if (!logger) return <T>(obj: T): T => obj;
  const cache = new WeakMap<object, object>();

  const snoop = <T>(obj: T, path: string[] = []): T => {
    if (!obj || typeof obj !== "object") return obj;
    if (cache.has(obj)) return cache.get(obj) as T;

    const proxy = new Proxy<T & object>(obj, {
      get: (target: T, prop: string | symbol) => {
        const value = target[prop as keyof T];
        if (typeof prop === "symbol") return value;
        const nextPath = [...path, prop];
        logger(nextPath, value);
        return snoop(value, nextPath);
      },
    });

    cache.set(obj, proxy);

    return proxy;
  };

  return snoop;
};
