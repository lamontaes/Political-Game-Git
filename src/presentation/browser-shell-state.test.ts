import { describe, expect, it } from "vitest";

import {
  BrowserShellStateStore,
  EMPTY_SHELL_STATE,
  readStoredShellState,
} from "./browser-shell-state";
import { DEFAULT_PREFERENCES, refKey } from "./shell-navigation";
import type { ShellRef } from "./shell-navigation";
import type { EntityId } from "../simulation";
import { createDemoWorld, serializeWorld, type World } from "../simulation";
import {
  createBrowserWorldRecord,
  type BrowserSaveStore,
  type StoredBrowserWorldRecord,
} from "./browser-world-repository";
import {
  exportPortableSave,
  importPortableSave,
  parsePortableSave,
  readPortableInterfaceState,
  serializePortableSave,
  type PortableSaveBundle,
} from "./portable-save";

const ALICE: ShellRef = { kind: "person", id: "person-alice" as EntityId };
const MEETING: ShellRef = {
  kind: "commitment",
  id: "activity-1" as EntityId,
};
const SLOT = "save-1" as EntityId;

/**
 * A database with named object stores, which is the part of IndexedDB this
 * module depends on. Small on purpose: it exists to prove the reader, the
 * writer and the validation contract, and the real cross-reload round trip is
 * proven in a browser rather than against a fake.
 */
class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();

  asFactory(): IDBFactory {
    return {
      open: () => {
        const database = this.#database();
        const request: Record<string, unknown> = {
          result: database,
          error: null,
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
        };
        queueMicrotask(() => {
          (request.onupgradeneeded as (() => void) | null)?.();
          (request.onsuccess as (() => void) | null)?.();
        });
        return request as unknown as IDBOpenDBRequest;
      },
    } as unknown as IDBFactory;
  }

  #database(): IDBDatabase {
    return {
      objectStoreNames: { contains: (name: string) => this.stores.has(name) },
      createObjectStore: (name: string) => {
        this.stores.set(name, new Map());
        return {} as IDBObjectStore;
      },
      onversionchange: null,
      close: () => undefined,
      transaction: (name: string) => this.#transaction(name),
    } as unknown as IDBDatabase;
  }

  #transaction(name: string): IDBTransaction {
    const records = this.stores.get(name) ?? new Map<string, unknown>();
    this.stores.set(name, records);
    const transaction: Record<string, unknown> = {
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore: () => ({
        get: (key: string) => request(records.get(key)),
        put: (value: { saveId: string }) => {
          records.set(value.saveId, structuredClone(value));
          return request(undefined);
        },
        delete: (key: string) => {
          records.delete(key);
          return request(undefined);
        },
      }),
    };

    function request(result: unknown): IDBRequest {
      const pending: Record<string, unknown> = {
        result,
        error: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        (pending.onsuccess as (() => void) | null)?.();
        (transaction.oncomplete as (() => void) | null)?.();
      });
      return pending as unknown as IDBRequest;
    }

    return transaction as unknown as IDBTransaction;
  }
}

function storeWith() {
  const database = new FakeDatabase();
  return {
    database,
    store: new BrowserShellStateStore({
      indexedDB: database.asFactory(),
      databaseName: "test-worlds",
    }),
  };
}

describe("portable transfer uses the shell's v3 codec", () => {
  function playerWorld() {
    const world = createDemoWorld("portable-v3");
    return {
      ...world,
      control: { kind: "person" as const, personId: world.personOrder[0]! },
    };
  }
  const state = {
    version: 3,
    pins: [{ ref: ALICE, size: "expanded" }],
    journal: {
      ambition: "A private ambition",
      notes: [
        {
          id: "note-1",
          title: "Private",
          body: "Not public news",
          group: "Life",
          personId: ALICE.id,
          eventKey: "event-1",
        },
      ],
    },
    personWardrobes: {
      [ALICE.id]: {
        personId: ALICE.id,
        families: { top: "top-1", bottom: "bottom-2", footwear: "shoes-3" },
      },
    },
    preferences: {
      peopleView: "web",
      defaultPinSize: "tiny",
      followedNewsOutletKeys: ["outlet-one", "outlet-two"],
    },
  };

  function fixture() {
    const database = new FakeDatabase();
    database.stores.set(
      "interface",
      new Map([[SLOT, { ...state, saveId: SLOT }]]),
    );
    const records = new Map<EntityId, StoredBrowserWorldRecord>([
      [
        SLOT,
        createBrowserWorldRecord(
          playerWorld(),
          "2026-09-12T00:00:00.000Z",
          undefined,
          SLOT,
        ),
      ],
    ]);
    let counter = 0;
    const store = {
      indexedDB: database.asFactory(),
      databaseName: "portable-v3",
      inspectRecord: async (id: EntityId) => records.get(id) ?? null,
      list: async () => ({
        saves: [...records.values()].map((r) => r.metadata),
        damaged: [],
      }),
      newSaveId: () => `import-${++counter}` as EntityId,
      save: async (world: World, id: EntityId) => {
        records.set(
          id,
          createBrowserWorldRecord(
            world,
            "2026-09-12T00:00:00.000Z",
            undefined,
            id,
          ),
        );
        return { status: "saved" };
      },
      remove: async (id: EntityId) => {
        records.delete(id);
      },
    } as unknown as BrowserSaveStore;
    return { database, records, store };
  }

  it.each([1, 2, 3, undefined])(
    "reads supported/legacy tag %s through the validated codec",
    (version) => {
      const decoded = readPortableInterfaceState({ ...state, version });
      expect(decoded).toEqual({ ...readStoredShellState(state), version: 3 });
      expect(readPortableInterfaceState({ ...state, version: 4 })).toBeNull();
      expect(readPortableInterfaceState({ ...state, version: "3" })).toBeNull();
    },
  );

  it("exports, imports and reopens every interface field with byte-identical World in distinct slots", async () => {
    const { database, records, store } = fixture();
    const originalWorld = records.get(SLOT)?.payload;
    const originalInterface = structuredClone(
      database.stores.get("interface")?.get(SLOT),
    );
    const exported = await exportPortableSave(store, SLOT);
    expect(exported.status).toBe("ok");
    if (exported.status !== "ok") throw new Error(exported.reason);
    expect(exported.bundle.interface).toEqual({
      status: "included",
      state: { ...readStoredShellState(state), version: 3 },
    });
    const parsed = parsePortableSave(serializePortableSave(exported.bundle));
    if (parsed.status !== "ok") throw new Error(parsed.reason);
    const imported = await importPortableSave(store, parsed.bundle);
    expect(imported.status).toBe("imported");
    if (imported.status !== "imported") throw new Error(imported.reason);
    expect(imported.saveId).not.toBe(SLOT);
    const reopened = await new BrowserShellStateStore({
      indexedDB: store.indexedDB,
      databaseName: store.databaseName,
    }).read(imported.saveId);
    expect(reopened).toEqual(readStoredShellState(state));
    expect(records.get(imported.saveId)?.payload).toBe(originalWorld);
    expect(records.get(SLOT)?.payload).toBe(originalWorld);
    expect(database.stores.get("interface")?.get(SLOT)).toEqual(
      originalInterface,
    );
    expect(serializeWorld(playerWorld())).toBe(originalWorld);
  });

  it("refuses future records on export and at import's mutation boundary, leaving all records unchanged", async () => {
    const { database, records, store } = fixture();
    const exported = await exportPortableSave(store, SLOT);
    if (exported.status !== "ok") throw new Error(exported.reason);
    const future = {
      ...exported.bundle,
      interface: { status: "included", state: { ...state, version: 4 } },
    } as unknown as PortableSaveBundle;
    const before = JSON.stringify([...records]);
    const beforeInterface = JSON.stringify([
      ...database.stores.get("interface")!,
    ]);
    expect(parsePortableSave(serializePortableSave(future))).toMatchObject({
      status: "error",
      failure: "unsupported-version",
    });
    expect(await importPortableSave(store, future)).toMatchObject({
      status: "error",
      failure: "unsupported-version",
    });
    expect(JSON.stringify([...records])).toBe(before);
    expect(JSON.stringify([...database.stores.get("interface")!])).toBe(
      beforeInterface,
    );
    database.stores
      .get("interface")!
      .set(SLOT, { ...state, saveId: SLOT, version: 4 });
    const futureInterface = JSON.stringify([
      ...database.stores.get("interface")!,
    ]);
    expect(await exportPortableSave(store, SLOT)).toMatchObject({
      status: "error",
      failure: "unsupported-version",
    });
    expect(JSON.stringify([...records])).toBe(before);
    expect(JSON.stringify([...database.stores.get("interface")!])).toBe(
      futureInterface,
    );
  });

  it("does not bypass candidate-profile refusal", async () => {
    const { store } = fixture();
    const exported = await exportPortableSave(store, SLOT, {
      artProvenance: "candidate-review",
    });
    if (exported.status !== "ok") throw new Error(exported.reason);
    expect(
      parsePortableSave(serializePortableSave(exported.bundle)),
    ).toMatchObject({ status: "error", failure: "candidate-in-production" });
    expect(
      parsePortableSave(serializePortableSave(exported.bundle), {
        productionProfile: false,
      }).status,
    ).toBe("ok");
  });
});

describe("the shell's own store", () => {
  it("keeps pins and preferences in the game's database, not a second one", async () => {
    const { store, database } = storeWith();
    await store.write(SLOT, {
      pins: [
        { key: refKey(ALICE), ref: ALICE, size: "expanded" },
        { key: refKey(MEETING), ref: MEETING, size: "tiny" },
      ],
      preferences: { peopleView: "list", defaultPinSize: "tiny" },
    });

    /* One database, with the worlds' store untouched beside it. */
    expect([...database.stores.keys()]).toContain("interface");

    const read = await store.read(SLOT);
    expect(read?.pins.map((pin) => pin.ref)).toEqual([ALICE, MEETING]);
    expect(read?.pins[0]?.size).toBe("expanded");
    expect(read?.preferences).toEqual({
      peopleView: "list",
      defaultPinSize: "tiny",
      followedNewsOutletKeys: [],
    });
  });

  it("orders pins exactly as they were written", async () => {
    const { store } = storeWith();
    await store.write(SLOT, {
      pins: [
        { key: refKey(MEETING), ref: MEETING, size: "normal" },
        { key: refKey(ALICE), ref: ALICE, size: "normal" },
      ],
      preferences: DEFAULT_PREFERENCES,
    });
    const read = await store.read(SLOT);
    expect(read?.pins.map((pin) => pin.key)).toEqual([
      refKey(MEETING),
      refKey(ALICE),
    ]);
  });

  it("says nothing is stored for an unwritten slot, rather than 'no pins'", async () => {
    const { store } = storeWith();
    await expect(store.read("save-none" as EntityId)).resolves.toBeNull();
  });

  it("restores an emptied rail as empty, because that was a choice", async () => {
    const { store } = storeWith();
    await store.write(SLOT, EMPTY_SHELL_STATE);
    await expect(store.read(SLOT)).resolves.toEqual(EMPTY_SHELL_STATE);
  });

  it("keeps followed outlets distinct between two saved lives", async () => {
    const { store } = storeWith();
    const otherSlot = "save-2" as EntityId;
    await store.write(SLOT, {
      ...EMPTY_SHELL_STATE,
      preferences: {
        ...DEFAULT_PREFERENCES,
        followedNewsOutletKeys: ["civic-ledger"],
      },
    });
    await store.write(otherSlot, EMPTY_SHELL_STATE);

    expect(
      (await store.read(SLOT))?.preferences.followedNewsOutletKeys,
    ).toEqual(["civic-ledger"]);
    expect(
      (await store.read(otherSlot))?.preferences.followedNewsOutletKeys,
    ).toEqual([]);
  });

  it("forgets a slot when it is cleared", async () => {
    const { store } = storeWith();
    await store.write(SLOT, {
      pins: [{ key: refKey(ALICE), ref: ALICE, size: "normal" }],
      preferences: DEFAULT_PREFERENCES,
    });
    await store.remove(SLOT);
    await expect(store.read(SLOT)).resolves.toBeNull();
  });

  it("works, without pins, in a browser that has no storage at all", async () => {
    const store = new BrowserShellStateStore({
      indexedDB: undefined,
      databaseName: "test-worlds",
    });
    expect(store.available).toBe(false);
    await expect(store.read(SLOT)).resolves.toBeNull();
    await expect(
      store.write(SLOT, {
        ...EMPTY_SHELL_STATE,
        preferences: {
          ...DEFAULT_PREFERENCES,
          followedNewsOutletKeys: ["civic-ledger"],
        },
      }),
    ).resolves.toBe(false);
  });
});

describe("what the reader will accept", () => {
  it("refuses a record from a version it does not know", () => {
    expect(
      readStoredShellState({ version: 99, pins: [], preferences: {} }),
    ).toBeNull();
  });

  it("drops a pin pointing at a kind that does not exist", () => {
    const read = readStoredShellState({
      version: 1,
      pins: [
        { ref: { kind: "spaceship", id: "x" }, size: "normal" },
        { ref: ALICE, size: "normal" },
      ],
      preferences: {},
    });
    expect(read?.pins.map((pin) => pin.key)).toEqual([refKey(ALICE)]);
  });

  it("keeps one pin per target, however many the record holds", () => {
    const read = readStoredShellState({
      version: 1,
      pins: [
        { ref: ALICE, size: "tiny" },
        { ref: ALICE, size: "expanded" },
      ],
      preferences: {},
    });
    expect(read?.pins).toHaveLength(1);
    expect(read?.pins[0]?.size).toBe("tiny");
  });

  it("falls back to a default rather than trusting an unknown value", () => {
    const read = readStoredShellState({
      version: 1,
      pins: [{ ref: ALICE, size: "enormous" }],
      preferences: { peopleView: "sideways", defaultPinSize: 7 },
    });
    expect(read?.pins[0]?.size).toBe("normal");
    expect(read?.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it("migrates old records and validates distinct outlet follows", () => {
    expect(
      readStoredShellState({
        version: 2,
        pins: [],
        preferences: {},
      })?.preferences.followedNewsOutletKeys,
    ).toEqual([]);
    expect(
      readStoredShellState({
        version: 3,
        pins: [],
        preferences: {
          followedNewsOutletKeys: ["civic-ledger", " civic-ledger ", "", 4],
        },
      })?.preferences.followedNewsOutletKeys,
    ).toEqual(["civic-ledger"]);
  });
});

describe("private Journal storage", () => {
  it("migrates old pins and keeps private writing independent of World storage", async () => {
    const { store } = storeWith();
    const legacy = readStoredShellState({
      version: 1,
      pins: [{ ref: ALICE, size: "normal" }],
      preferences: {},
    });
    expect(legacy?.journal).toEqual({ ambition: "", notes: [] });
    const journal = {
      ambition: "My private plan",
      notes: [
        {
          id: "note-1",
          title: "Remember",
          body: "A personal interpretation",
          group: "Family",
          personId: ALICE.id,
          eventKey: "history-1",
        },
      ],
    };
    await store.write(SLOT, { ...EMPTY_SHELL_STATE, journal });
    expect((await store.read(SLOT))?.journal).toEqual(journal);
    await store.write(SLOT, {
      ...EMPTY_SHELL_STATE,
      journal: { ambition: "Revised", notes: [] },
    });
    expect((await store.read(SLOT))?.journal).toEqual({
      ambition: "Revised",
      notes: [],
    });
  });
});

it("persists per-person wardrobe without discarding an unavailable family and rejects another-person key", async () => {
  const database = new FakeDatabase();
  const store = new BrowserShellStateStore({ indexedDB: database.asFactory() });
  const preference = {
    personId: ALICE.id,
    families: { top: "unavailable-but-retained-family" },
  };
  const stored = readStoredShellState({
    version: 2,
    pins: [],
    preferences: DEFAULT_PREFERENCES,
    personWardrobes: { [ALICE.id]: preference, wrong: preference },
  })!;
  expect(stored.personWardrobes).toEqual({ [ALICE.id]: preference });
  await store.write(SLOT, stored);
  expect((await store.read(SLOT))?.personWardrobes).toEqual({
    [ALICE.id]: preference,
  });
});
