/* global queueMicrotask, setImmediate, structuredClone */
import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  readSavedRecords,
  savedIdentity,
  sameSavedIdentity,
} from "../scripts/saved-identity-proof.mjs";

function record({
  saveId = "slot-a",
  worldId = "world-a",
  personId = "person-a",
  appearance = {
    seed: "appearance-a",
    recipeVersion: "appearance-recipe-v2",
    catalogGeneration: 2,
  },
  name = "Alex SAME",
} = {}) {
  return {
    saveId,
    metadata: { worldId, playerPersonId: personId },
    payload: JSON.stringify({
      world: {
        id: worldId,
        control: { kind: "person", personId },
        people: { [personId]: { id: personId, givenName: name, appearance } },
      },
    }),
  };
}
const original = savedIdentity(record());
test("saved identity is stable across formatting-only names, not a heading prefix", () => {
  assert.equal(
    sameSavedIdentity(
      original,
      savedIdentity(record({ name: "Alex Same · Age 27 · date · place" })),
    ),
    true,
  );
});
for (const [label, delta] of [
  ["wrong slot", { saveId: "slot-b" }],
  ["wrong World", { worldId: "world-b" }],
  ["wrong person", { personId: "person-b" }],
  [
    "changed appearance seed",
    { appearance: { ...original.appearance, seed: "appearance-b" } },
  ],
  [
    "changed recipe",
    {
      appearance: {
        ...original.appearance,
        recipeVersion: "appearance-recipe-v3",
      },
    },
  ],
  [
    "changed catalog",
    { appearance: { ...original.appearance, catalogGeneration: 3 } },
  ],
  [
    "changed appearance component",
    { appearance: { ...original.appearance, identity: { face: "different" } } },
  ],
])
  test(`identical names cannot hide ${label}`, () => {
    assert.equal(
      sameSavedIdentity(original, savedIdentity(record(delta))),
      false,
    );
  });
test("mismatched metadata is a real failure", () => {
  const row = record();
  row.metadata.playerPersonId = "person-b";
  assert.throws(() => savedIdentity(row), /identity is invalid/);
});
test("missing appearance is a real failure", () => {
  const row = record({ appearance: null });
  assert.throws(() => savedIdentity(row), /identity is invalid/);
});

// Execute the actual Playwright evaluate callback in its separate browser realm.
// The store contains the repository's manifest/chunk/tombstone rows, not a
// prefiltered list supplied by the proof under test.
function storedPage(worlds, interfaces = [], failure = null) {
  const operations = [];
  let closed = false;
  let completed = false;
  const db = {
    transaction(stores, mode) {
      operations.push({ stores: [...stores], mode });
      const transaction = {
        objectStore(store) {
          return {
            getAll() {
              const request = {};
              queueMicrotask(() => {
                request.result = structuredClone(
                  store === "worlds" ? worlds : interfaces,
                );
                request.onsuccess?.();
              });
              return request;
            },
          };
        },
      };
      setImmediate(() => {
        if (failure) {
          transaction.error = new Error("IndexedDB snapshot aborted");
          transaction.onabort?.();
        } else {
          completed = true;
          transaction.oncomplete?.();
        }
      });
      return transaction;
    },
    close() {
      closed = true;
    },
  };
  const indexedDB = {
    open(name) {
      operations.push({ open: name });
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
  return {
    operations,
    closed: () => closed,
    completed: () => completed,
    evaluate: (callback, name) =>
      runInNewContext(`(${callback.toString()})(name)`, { indexedDB, name }),
  };
}

function storedLife(options) {
  return {
    kind: "political-life-browser-world",
    generation: 7,
    ...record(options),
  };
}

function chunkedLife(options) {
  const life = storedLife(options);
  // Split in the middle of the JSON text, so neither chunk is a snapshot.
  const middle = Math.floor(life.payload.length / 2);
  const chunks = [
    life.payload.slice(0, middle),
    life.payload.slice(middle),
  ].map((data, index) => ({
    saveId: `\u0000ocd-world-chunk:v1:${life.saveId}:${life.generation}:${index}`,
    data,
  }));
  return [
    {
      ...life,
      payload: "\u0000ocd-chunked-payload:v1",
      payloadChunks: {
        kind: "world-payload-chunks-v1",
        count: 2,
        length: life.payload.length,
      },
    },
    ...chunks,
  ];
}

test("inline saves retain identity and interface state in one completed readonly snapshot", async () => {
  const life = storedLife();
  const interfaces = [{ saveId: life.saveId, pins: ["person-a"] }];
  const page = storedPage([life], interfaces);
  const records = await readSavedRecords(page, "proof-db");
  assert.equal(records.worlds.length, 1);
  assert.deepEqual(savedIdentity(records.worlds[0]), original);
  assert.deepEqual(records.interfaces, interfaces);
  assert.deepEqual(page.operations, [
    { open: "proof-db" },
    { stores: ["worlds", "interface"], mode: "readonly" },
  ]);
  assert.equal(page.completed(), true);
  assert.equal(page.closed(), true);
});

test("one chunked kept life is one logical save with its original identity", async () => {
  const rows = chunkedLife();
  const before = structuredClone(rows);
  const page = storedPage(rows);
  const records = await readSavedRecords(page, "proof-db");
  assert.equal(rows.length, 3);
  assert.equal(records.worlds.length, 1);
  assert.deepEqual(savedIdentity(records.worlds[0]), original);
  assert.deepEqual(rows, before, "reading must not rewrite the save or chunks");
  assert.equal(page.closed(), true);
});

test("two live slots remain two even when they contain the same World", async () => {
  const page = storedPage([...chunkedLife(), storedLife({ saveId: "slot-b" })]);
  const records = await readSavedRecords(page, "proof-db");
  assert.equal(
    records.worlds.length,
    2,
    "the smoke's exactly-one guard must still fail",
  );
  assert.equal(records.worlds[0].saveId, "slot-a");
  assert.equal(records.worlds[1].saveId, "slot-b");
});

test("deleted slots and orphaned or earlier-generation chunks are not kept lives", async () => {
  const rows = [
    ...chunkedLife(),
    {
      kind: "political-life-browser-world-deleted",
      saveId: "deleted-slot",
      generation: 8,
    },
    { saveId: "\u0000ocd-world-chunk:v1:slot-a:6:0", data: "old generation" },
    {
      saveId: "\u0000ocd-world-chunk:v1:deleted-slot:7:0",
      data: "deleted generation",
    },
  ];
  const records = await readSavedRecords(storedPage(rows), "proof-db");
  assert.equal(records.worlds.length, 1);
  assert.deepEqual(savedIdentity(records.worlds[0]), original);
  const empty = await readSavedRecords(storedPage(rows.slice(3)), "proof-db");
  assert.equal(empty.worlds.length, 0);
});

for (const [name, damage, error] of [
  ["missing chunk", (rows) => rows.pop(), /missing history chunk/],
  [
    "wrong chunk generation",
    (rows) => {
      rows[2].saveId = "\u0000ocd-world-chunk:v1:slot-a:6:1";
    },
    /missing history chunk/,
  ],
  [
    "nontext chunk",
    (rows) => {
      rows[2].data = null;
    },
    /missing history chunk/,
  ],
  [
    "short payload",
    (rows) => {
      rows[2].data = rows[2].data.slice(1);
    },
    /length disagrees/,
  ],
  [
    "long payload",
    (rows) => {
      rows[2].data += "extra";
    },
    /length disagrees/,
  ],
  [
    "invalid manifest",
    (rows) => {
      rows[0].payloadChunks.count = 1.5;
    },
    /Invalid.*manifest/,
  ],
  [
    "oversized payload",
    (rows) => {
      rows[0].payloadChunks.length = 2 ** 28 + 1;
    },
    /joined-payload limit/,
  ],
  [
    "unknown row",
    (rows) => {
      rows.push({ saveId: "broken-slot" });
    },
    /count cannot be proven/,
  ],
]) {
  test(`${name} fails the proof rather than becoming a missing life or false identity pass`, async () => {
    const rows = chunkedLife();
    damage(rows);
    const page = storedPage(rows);
    await assert.rejects(readSavedRecords(page, "proof-db"), error);
    assert.equal(page.closed(), true);
  });
}

test("an aborted snapshot is not acknowledged as a persisted save", async () => {
  const page = storedPage(chunkedLife(), [], "abort");
  await assert.rejects(readSavedRecords(page, "proof-db"), /snapshot aborted/);
  assert.equal(page.completed(), false);
  assert.equal(page.closed(), true);
});
