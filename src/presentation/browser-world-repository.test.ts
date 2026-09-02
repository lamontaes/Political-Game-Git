import { describe, expect, it } from "vitest";

import {
  advanceDemoWorld,
  createDemoWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  BROWSER_WORLD_RECORD_KIND,
  BrowserSaveStore,
  createBrowserWorldRecord,
  readStoredRecord,
  validateBrowserWorldRecord,
} from "./browser-world-repository";
import { createNewGameWorld } from "./new-game";

/**
 * A fake IndexedDB that can be made slow or made to fail.
 *
 * The interesting persistence bugs are all about ordering: a delete landing
 * between an autosave being asked for and being written, a load's metadata
 * update landing on top of a newer save, a failed write being treated as
 * durable. None of them reproduce against storage that always succeeds
 * instantly, which is why the audit found them by reading rather than by
 * running the suite.
 */
class FakeTransaction {
  error: DOMException | null = null;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  readonly #records: Map<string, unknown>;
  readonly #control: FakeStorageControl;

  constructor(records: Map<string, unknown>, control: FakeStorageControl) {
    this.#records = records;
    this.#control = control;
  }

  objectStore(): IDBObjectStore {
    const store = {
      get: (key: IDBValidKey) =>
        this.#request("get", () => {
          const value = this.#records.get(String(key));
          return value === undefined ? undefined : structuredClone(value);
        }),
      getAll: () =>
        this.#request("getAll", () =>
          [...this.#records.values()].map((value) => structuredClone(value)),
        ),
      put: (value: unknown) =>
        this.#request("put", () => {
          if (
            value === null ||
            typeof value !== "object" ||
            !("saveId" in value) ||
            typeof value.saveId !== "string"
          ) {
            throw new Error("Fake IndexedDB record is missing its key.");
          }
          this.#records.set(value.saveId, structuredClone(value));
          return value.saveId;
        }),
      delete: (key: IDBValidKey) =>
        this.#request("delete", () => {
          this.#records.delete(String(key));
          return undefined;
        }),
    };
    return store as unknown as IDBObjectStore;
  }

  #request<T>(operation: FakeOperation, run: () => T): IDBRequest<T> {
    const request: {
      result: T;
      error: DOMException | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
    } = {
      result: undefined as T,
      error: null,
      onsuccess: null,
      onerror: null,
    };
    const settle = () => {
      try {
        if (this.#control.shouldFail(operation)) {
          throw new Error("Fake IndexedDB was told to fail this write.");
        }
        request.result = run();
        request.onsuccess?.();
        queueMicrotask(() => this.oncomplete?.());
      } catch (error) {
        request.error = new DOMException(
          error instanceof Error ? error.message : "Fake IndexedDB failure",
        );
        request.onerror?.();
      }
    };
    const delay = this.#control.delayFor(operation);
    if (delay > 0) setTimeout(settle, delay);
    else queueMicrotask(settle);
    return request as unknown as IDBRequest<T>;
  }
}

type FakeOperation = "get" | "getAll" | "put" | "delete";

class FakeStorageControl {
  #failures = new Map<FakeOperation, number>();
  #delays = new Map<FakeOperation, number>();

  failNext(operation: FakeOperation, times = 1): void {
    this.#failures.set(operation, times);
  }

  delay(operation: FakeOperation, milliseconds: number): void {
    this.#delays.set(operation, milliseconds);
  }

  clearDelays(): void {
    this.#delays.clear();
  }

  clearFailures(): void {
    this.#failures.clear();
  }

  shouldFail(operation: FakeOperation): boolean {
    const remaining = this.#failures.get(operation) ?? 0;
    if (remaining <= 0) return false;
    this.#failures.set(operation, remaining - 1);
    return true;
  }

  delayFor(operation: FakeOperation): number {
    return this.#delays.get(operation) ?? 0;
  }
}

class FakeIndexedDbFactory {
  readonly records = new Map<string, unknown>();
  readonly control = new FakeStorageControl();
  #hasStore = false;

  asFactory(): IDBFactory {
    return { open: () => this.#open() } as unknown as IDBFactory;
  }

  setRaw(saveId: string, value: unknown): void {
    this.records.set(saveId, structuredClone(value));
  }

  #open(): IDBOpenDBRequest {
    const objectStoreNames = { contains: () => this.#hasStore };
    const database = {
      objectStoreNames,
      onversionchange: null,
      createObjectStore: () => {
        this.#hasStore = true;
        return {} as IDBObjectStore;
      },
      transaction: () =>
        new FakeTransaction(
          this.records,
          this.control,
        ) as unknown as IDBTransaction,
      close: () => undefined,
    } as unknown as IDBDatabase;
    const request: {
      result: IDBDatabase;
      error: DOMException | null;
      onupgradeneeded: (() => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      onblocked: (() => void) | null;
    } = {
      result: database,
      error: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    queueMicrotask(() => {
      if (!this.#hasStore) request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request as unknown as IDBOpenDBRequest;
  }
}

function clockAt(initial: string) {
  let current = new Date(initial);
  return {
    now: () => new Date(current),
    set(value: string) {
      current = new Date(value);
    },
  };
}

function playerWorld(seed: string): World {
  const world = createDemoWorld(seed);
  const personId = world.personOrder[0];
  if (!personId) throw new Error("Demo world is missing its first person.");
  return { ...world, control: { kind: "person", personId } };
}

function storeWith(clockValue = "2026-05-01T10:00:00.000Z") {
  const factory = new FakeIndexedDbFactory();
  const clock = clockAt(clockValue);
  const store = new BrowserSaveStore({
    indexedDB: factory.asFactory(),
    now: clock.now,
    databaseName: "test-worlds",
  });
  return { factory, clock, store };
}

describe("What a saved game is", () => {
  it("stores the exact canonical snapshot with the player and world it belongs to", () => {
    const world = playerWorld("record");
    const record = createBrowserWorldRecord(
      world,
      "2026-05-01T10:00:00.000Z",
      "2026-05-01T09:00:00.000Z",
      "save_one" as EntityId,
    );

    expect(record.kind).toBe(BROWSER_WORLD_RECORD_KIND);
    expect(record.payload).toBe(serializeWorld(world));
    expect(record.metadata.worldId).toBe(world.id);
    expect(record.metadata.saveId).toBe("save_one");
    expect(record.metadata.actionSequence).toBe(world.actionSequence);
    expect(validateBrowserWorldRecord(record).metadata.saveId).toBe("save_one");
  });

  it("refuses a record whose summary disagrees with its world", () => {
    const world = playerWorld("tamper");
    const record = createBrowserWorldRecord(
      world,
      "2026-05-01T10:00:00.000Z",
      "2026-05-01T10:00:00.000Z",
      "save_one" as EntityId,
    );
    const lying = {
      ...record,
      metadata: { ...record.metadata, playerName: "Somebody Else" },
    };
    const read = readStoredRecord(lying);
    expect(read.kind).toBe("damaged");
    if (read.kind === "damaged") {
      expect(read.quarantine.defect).toBe("summary-disagrees");
    }
  });

  it("names the place from the place provider rather than the raw record", async () => {
    const { store } = storeWith();
    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "place",
      givenName: null,
      familyName: null,
    });
    const saveId = store.newSaveId(game.world);
    const outcome = await store.save(game.world, saveId);
    expect(outcome.status).toBe("saved");
    if (outcome.status === "saved") {
      expect(outcome.summary.residence?.name).toBe("Kentucky");
    }
  });
});

describe("A save slot is not a world", () => {
  it("keeps two saves of one world side by side", async () => {
    const { store } = storeWith();
    const world = playerWorld("branch");

    const first = store.newSaveId(world);
    const second = store.newSaveId(world);
    expect(first).not.toBe(second);

    await store.save(world, first);
    await store.save(world, second);

    const listing = await store.list();
    expect(listing.saves).toHaveLength(2);
    expect(new Set(listing.saves.map((save) => save.worldId))).toEqual(
      new Set([world.id]),
    );
  });

  it("holds several games, keeps each creation time, and orders them stably", async () => {
    const { store, clock } = storeWith("2026-05-01T10:00:00.000Z");
    const first = playerWorld("first");
    const second = playerWorld("second");
    const firstId = store.newSaveId(first);
    const secondId = store.newSaveId(second);

    await store.save(first, firstId);
    clock.set("2026-05-01T11:00:00.000Z");
    await store.save(second, secondId);
    clock.set("2026-05-01T12:00:00.000Z");
    await store.save(advanceDemoWorld(first, 7), firstId);

    const listing = await store.list();
    expect(listing.saves).toHaveLength(2);
    expect(listing.saves[0]!.saveId).toBe(firstId);
    expect(listing.saves[0]!.createdAt).toBe("2026-05-01T10:00:00.000Z");
    expect(listing.damaged).toEqual([]);
  });

  it("says nothing is there rather than inventing it, and deletes what is", async () => {
    const { store } = storeWith();
    const world = playerWorld("delete");

    // A slot nothing was ever written to has nothing to open or remove.
    const untouched = store.newSaveId(world);
    expect(await store.load(untouched)).toBeNull();
    expect(await store.remove(untouched)).toBe(false);

    const saveId = store.newSaveId(world);
    await store.save(world, saveId);
    expect(await store.remove(saveId)).toBe(true);
    expect(await store.load(saveId)).toBeNull();
    // And a deleted slot stays deleted for the rest of the session, rather
    // than being quietly refilled by anything still holding its id.
    expect((await store.save(world, saveId)).status).toBe("discarded");
  });
});

describe("One damaged save does not hide the healthy ones", () => {
  it("quarantines what it cannot read and still lists the rest", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("healthy");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    factory.setRaw("save_broken", {
      kind: "something-else",
      saveId: "save_broken",
    });
    factory.setRaw("save_garbage", 42);

    const listing = await store.list();
    // The healthy game is still there and still openable, which is the whole
    // point: a broken record is not a broken browser.
    expect(listing.saves.map((save) => save.saveId)).toEqual([saveId]);
    expect(listing.damaged).toHaveLength(2);
    expect(await store.load(saveId)).not.toBeNull();
  });

  it("keeps a save from a newer version instead of calling it corrupt", async () => {
    const { store, factory } = storeWith();
    factory.setRaw("save_future", {
      kind: BROWSER_WORLD_RECORD_KIND,
      recordVersion: 99,
      saveId: "save_future",
      metadata: { savedAt: "2026-05-01T10:00:00.000Z" },
      payload: "{}",
    });

    const listing = await store.list();
    expect(listing.damaged).toHaveLength(1);
    expect(listing.damaged[0]!.defect).toBe("unsupported-version");
    // Told apart from damage, because the player should not be advised to
    // delete something a later build could open.
    expect(listing.damaged[0]!.mightBeReadableLater).toBe(true);
    expect(listing.damaged[0]!.saveId).toBe("save_future");
  });

  it("migrates a version 1 record rather than refusing it", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("legacy");
    // Version 1 used the world's id as the slot's id.
    const record = createBrowserWorldRecord(
      world,
      "2026-04-01T10:00:00.000Z",
      "2026-04-01T10:00:00.000Z",
      world.id,
    );
    const legacyMetadata: Record<string, unknown> = { ...record.metadata };
    delete legacyMetadata.worldId;
    factory.setRaw(world.id, {
      ...record,
      recordVersion: 1,
      metadata: legacyMetadata,
    });

    const listing = await store.list();
    expect(listing.damaged).toEqual([]);
    expect(listing.saves).toHaveLength(1);
    expect(listing.saves[0]!.saveId).toBe(world.id);
    expect(listing.saves[0]!.worldId).toBe(world.id);
    expect(await store.load(world.id)).not.toBeNull();
  });
});

describe("Ordering, fencing and acknowledgement", () => {
  it("cannot bring a deleted save back from an autosave already in flight", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("resurrect");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // The write is asked for, then the player deletes the game before it lands.
    factory.control.delay("put", 5);
    const writing = store.save(advanceDemoWorld(world, 7), saveId);
    const deleting = store.remove(saveId);

    const [outcome] = await Promise.all([writing, deleting]);
    factory.control.clearDelays();

    // The player's last word was "delete", so the write that was still waiting
    // is dropped rather than recreating what they got rid of.
    expect(outcome.status).toBe("discarded");
    const listing = await store.list();
    expect(listing.saves).toEqual([]);
    expect(await store.load(saveId)).toBeNull();
  });

  it("discards a write requested before a delete it lost the race to", async () => {
    const { store } = storeWith();
    const world = playerWorld("fence");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const removed = store.remove(saveId);
    // Asked for after the delete was requested: this must not recreate it.
    const late = store.save(advanceDemoWorld(world, 7), saveId);

    await removed;
    const outcome = await late;
    expect(outcome.status).toBe("discarded");
    expect(await store.load(saveId)).toBeNull();
    expect((await store.list()).saves).toEqual([]);
  });

  it("does not treat a failed write as durable", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("retry");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);
    expect(store.acknowledgedSequence(saveId)).toBe(world.actionSequence);

    const advanced = advanceDemoWorld(world, 7);
    factory.control.failNext("put");
    await expect(store.save(advanced, saveId)).rejects.toThrow();

    // The sequence stayed where it was, so the caller knows to try again —
    // this is exactly what used to be lost.
    expect(store.acknowledgedSequence(saveId)).toBe(world.actionSequence);
    expect(store.acknowledgedSequence(saveId)).not.toBe(
      advanced.actionSequence,
    );

    const retried = await store.save(advanced, saveId);
    expect(retried.status).toBe("saved");
    expect(store.acknowledgedSequence(saveId)).toBe(advanced.actionSequence);
  });

  it("keeps a load's own bookkeeping from landing on a newer save", async () => {
    const { store, factory, clock } = storeWith();
    const world = playerWorld("interleave");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const advanced = advanceDemoWorld(world, 30);
    factory.control.delay("get", 3);
    // A load and a newer save, asked for together. The load updates
    // last-played; the save writes a later world. Ordering decides, and the
    // world that ends up stored must be the one written last.
    const loading = store.load(saveId);
    clock.set("2026-05-01T13:00:00.000Z");
    const saving = store.save(advanced, saveId);
    await Promise.all([loading, saving]);
    factory.control.clearDelays();

    const reloaded = await store.load(saveId);
    expect(reloaded!.actionSequence).toBe(advanced.actionSequence);
  });

  it("waits for everything asked for when the player leaves", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("flush");
    const saveId = store.newSaveId(world);

    factory.control.delay("put", 5);
    void store.save(world, saveId);
    await store.flush();
    factory.control.clearDelays();

    expect((await store.list()).saves).toHaveLength(1);
  });
});

describe("Autosave is answerable for the newest world, not the first one", () => {
  function autosaveStore(clockValue = "2026-05-01T10:00:00.000Z") {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt(clockValue).now,
      databaseName: "test-worlds",
      // No sitting through backoff; the retry itself is what is under test.
      delay: () => Promise.resolve(),
    });
    return { factory, store };
  }

  it("writes the newest revision when a later one arrives mid-write", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("coalesce");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // The exact sequence the re-audit described: revision N is being written,
    // the player acts again, and N+1 is handed in while N is still in flight.
    // The boolean gate this replaces dropped N+1 on the floor — and because a
    // ref does not re-render, nothing ever came back for it.
    factory.control.delay("put", 5);
    const first = store.autosave(advanceDemoWorld(world, 3), saveId);
    const newest = advanceDemoWorld(world, 9);
    const second = store.autosave(newest, saveId);
    await Promise.all([first, second]);
    factory.control.clearDelays();

    expect(store.acknowledgedSequence(saveId)).toBe(newest.actionSequence);
    const reloaded = await store.load(saveId);
    expect(reloaded!.actionSequence).toBe(newest.actionSequence);
  });

  it("comes back for a write that failed, without being asked twice", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("retry");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const advanced = advanceDemoWorld(world, 4);
    factory.control.failNext("put");
    // Nothing here calls save again. The old test proved storage worked when
    // the caller retried by hand, which is precisely what nothing did.
    const result = await store.autosave(advanced, saveId);

    expect(result.status).toBe("saved");
    expect(store.acknowledgedSequence(saveId)).toBe(advanced.actionSequence);
  });

  it("says a revision is not saved rather than implying it is", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("give-up");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    factory.control.failNext("put", 20);
    const result = await store.autosave(advanceDemoWorld(world, 4), saveId);
    expect(result.status).toBe("failed");
    // The acknowledgement stays where it was, so nothing downstream believes
    // the newer world is durable.
    expect(store.acknowledgedSequence(saveId)).toBe(world.actionSequence);
  });

  it("drains what is still owed when the player leaves, and says what is not", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("leaving");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // A world handed in and never given a chance to land before Leave.
    factory.control.failNext("put", 20);
    const advanced = advanceDemoWorld(world, 6);
    const pending = store.autosave(advanced, saveId);
    await pending;

    factory.control.failNext("put", 20);
    const stillFailing = await store.flush();
    expect(stillFailing.status).toBe("unsaved");
    expect(stillFailing.unsaved).toContain(saveId);
    expect(stillFailing.reason).not.toBeNull();

    // Once storage is working again, leaving writes it rather than losing it.
    factory.control.clearFailures();
    const settled = await store.flush();
    expect(settled.status).toBe("settled");
    expect((await store.load(saveId))!.actionSequence).toBe(
      advanced.actionSequence,
    );
  });

  it("does not write a slot the player deleted while it was owed", async () => {
    const { store } = autosaveStore();
    const world = playerWorld("deleted-slot");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);
    await store.remove(saveId);

    const result = await store.autosave(advanceDemoWorld(world, 2), saveId);
    expect(result.status).toBe("discarded");
    expect((await store.flush()).status).toBe("settled");
    expect((await store.list()).saves).toHaveLength(0);
  });
});

describe("A slot belongs to one game", () => {
  it("gives two tabs two slots for the same world at the same instant", () => {
    const world = playerWorld("two-tabs");
    // One clock, one world, and each store making its first slot: the counter
    // that used to discriminate them started at zero in both, so both tabs
    // addressed the same slot and one game wrote over the other.
    const ids = new Set(
      Array.from({ length: 8 }, () => storeWith().store.newSaveId(world)),
    );
    expect(ids.size).toBe(8);
  });

  it("keeps two lives from the same setup in different worlds", () => {
    const first = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
      seed: "identity",
      givenName: "A",
      familyName: null,
    });
    const second = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
      seed: "identity",
      givenName: "B",
      familyName: null,
    });
    expect(first.world.seed).not.toBe(second.world.seed);
    expect(first.world.id).not.toBe(second.world.id);
  });
});

describe("A delete that did not happen", () => {
  it("leaves the slot usable and says so, rather than fencing it forever", async () => {
    const { store, factory } = storeWith();
    const world = playerWorld("failed-delete");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    factory.control.failNext("delete");
    await expect(store.remove(saveId)).rejects.toThrow();

    // The save is still there, so the in-memory tombstone would have blocked a
    // slot that was never removed — and lost it at the next restart, when the
    // tombstone is gone and the record is not.
    expect((await store.list()).saves).toHaveLength(1);
    const advanced = advanceDemoWorld(world, 3);
    expect((await store.save(advanced, saveId)).status).toBe("saved");
    expect((await store.load(saveId))!.actionSequence).toBe(
      advanced.actionSequence,
    );

    // And a delete that does land still fences the slot.
    expect(await store.remove(saveId)).toBe(true);
    expect((await store.save(world, saveId)).status).toBe("discarded");
  });
});
