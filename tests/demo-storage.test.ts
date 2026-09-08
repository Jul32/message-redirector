import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { InboxData } from "../lib/types.ts";
const seed: InboxData = JSON.parse(
  readFileSync(new URL("../lib/seed.json", import.meta.url), "utf8"),
);
let sequence = 0;
async function freshStorage(): Promise<
  typeof import("../lib/demo-storage.ts")
> {
  return import(`../lib/demo-storage.ts?test=${++sequence}`);
}
test("blocked storage keeps the core flow usable in memory and reports loss of persistence", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Storage blocked");
    },
  });
  const storage = await freshStorage();
  const data = storage.readDemoData(seed);
  data.messages[0].status = "Resolved";
  storage.writeDemoData(data);
  assert.equal(storage.readDemoData(seed).messages[0].status, "Resolved");
  assert.match(storage.storageWarning(), /lost when you reload/);
});
test("invalid cached data cannot crash the dashboard", async () => {
  for (const value of [
    "{broken",
    '{"messages":null}',
    '{"properties":[],"tenants":[],"rules":[],"messages":[{}]}',
  ]) {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => value },
    });
    const storage = await freshStorage();
    assert.equal(storage.readDemoData(seed).messages.length, 12);
    assert.match(storage.storageWarning(), /could not be loaded/);
  }
});
test("writes remain available after loading a fresh module", async () => {
  let saved: string | null = null;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    },
  });
  const storage = await freshStorage();
  const data = storage.readDemoData(seed);
  data.messages[0].status = "Resolved";
  storage.writeDemoData(data);
  assert.equal(
    (await freshStorage()).readDemoData(seed).messages[0].status,
    "Resolved",
  );
});
test("demo IDs do not rely on secure-context-only randomUUID", async () => {
  const { newDemoId } = await freshStorage();
  const ids = Array.from({ length: 100 }, newDemoId);
  assert.equal(new Set(ids).size, 100);
  assert.ok(
    ids.every((id: string) =>
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        id,
      ),
    ),
  );
});
