import { describe, expect, it } from "vitest";

import {
  BrowserShellStateStore,
  EMPTY_SHELL_STATE,
  readStoredShellState,
} from "./browser-shell-state";
import { DEFAULT_PREFERENCES, refKey } from "./shell-navigation";
import type { ShellRef } from "./shell-navigation";
import type { EntityId } from "../simulation";

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
    await expect(store.write(SLOT, EMPTY_SHELL_STATE)).resolves.toBe(false);
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
