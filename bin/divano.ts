import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";
import _ from "https://cdn.skypack.dev/lodash?dts";

export interface CouchInfo {
  couchdb: string;
  version: string;
  uuid: string;
  features: string[];
  vendor: { name: string };
}

export interface CouchDocument {
  _id: string;
  _rev?: string;
  _deleted?: true;
}

const dbNameSchema = z.string().regex(/^[a-z][a-z0-9_$()+/-]*$/);
export type DatabaseName = z.input<typeof dbNameSchema>;
const booleanSchema = z.union([z.enum(["true", "false"]), z.boolean()])
  .transform(
    String,
  );

const createOptionsSchema = z.object({
  q: z.number().optional(),
  n: z.number().optional(),
  partitioned: booleanSchema.optional(),
});
export type CreateOptions = z.input<typeof createOptionsSchema>;

const insertOptionsSchema = z.object({
  id: z.string().optional(),
  rev: z.string().optional(),
  batch: z.literal("ok").optional(),
  new_edits: booleanSchema.optional(),
});
export type InsertOptions = z.input<typeof insertOptionsSchema>;
export type InsertResponse = {
  id: string;
  ok: boolean;
  rev: string;
};

type Options = Record<string, string | number | boolean>;

const endPoint = (
  base: string,
  path: string,
  options: Options,
) => {
  const u = new URL(path, base);
  for (const [name, value] of Object.entries(options)) {
    u.searchParams.set(name, String(value));
  }
  return u;
};

export class DivanoDB<D extends CouchDocument> {
  name: string;
  divano: Divano;

  constructor(name: DatabaseName, divano: Divano) {
    this.name = dbNameSchema.parse(name).replace(/\/$/, "");
    this.divano = divano;
  }

  async apiFetch<T>(
    path: string,
    init: RequestInit = {},
    options: Options = {},
  ): Promise<T> {
    return await this.divano.apiFetch(`${this.name}/${path}`, init, options);
  }

  async insert(
    obj: D,
    options: string | InsertOptions = {},
  ): Promise<InsertResponse> {
    const { id, ...opts } = insertOptionsSchema.parse(
      typeof options === "string" ? { id: options } : options,
    );
    const doc = id === undefined ? obj : { ...obj, _id: id };
    return await this.apiFetch<InsertResponse>(doc._id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    }, opts);
  }
}

const requestDefaults: RequestInit = {
  headers: { "Accept-Encoding": "application/json" },
};

export class Divano {
  url: string;
  constructor(url: string) {
    const u = new URL(url);
    u.pathname = "/";
    this.url = u.toString();
  }

  use<D extends CouchDocument>(name: DatabaseName) {
    return new DivanoDB<D>(name, this);
  }

  async apiFetch<T>(
    path: string,
    init: RequestInit = {},
    options: Options = {},
  ): Promise<T> {
    const config = _.merge({}, requestDefaults, init);
    const url = endPoint(this.url, path, options);
    const res = await fetch(url, config);
    if (res.ok) return await res.json();
    throw new Error(`${res.status} ${res.statusText}`);
  }

  async create(
    name: DatabaseName,
    options: CreateOptions = {},
  ): Promise<void> {
    await this.apiFetch(
      dbNameSchema.parse(name),
      { method: "PUT" },
      createOptionsSchema.parse(options),
    );
  }

  async delete(name: DatabaseName): Promise<void> {
    await this.apiFetch(dbNameSchema.parse(name), { method: "DELETE" });
  }

  async info(): Promise<CouchInfo> {
    return await this.apiFetch<CouchInfo>("");
  }

  async list(): Promise<string[]> {
    return await this.apiFetch<string[]>("_all_dbs");
  }
}

interface DocType extends CouchDocument {
  name: string;
}

const server = new Divano("http://chaise:sofa@stilt:5984/");
const info = await server.info();
console.log(info);
await server.delete("my-test").catch((e) => null);
await server.create("my-test", { q: 16, n: 1 });
const mt = server.use<DocType>("my-test");
const res = await mt.insert({ _id: "aaaa", name: "andy" }, { batch: "ok" });
console.log(res);
const dbs = await server.list();
console.log(dbs);
