import { describe, expect, it } from "vitest";

import {
  advanceDemoWorld,
  createDemoWorld,
  createWorldSnapshot,
  deserializeWorld,
  measurePosition,
  recordWorldEvent,
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
import type { UnsavedSlot } from "./browser-world-repository";
import { guardUnsavedWork } from "./unsaved-work-guard";
import type { UnloadTarget } from "./unsaved-work-guard";
import { recordedConversationIntents } from "./conversation-continuity";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { createNewGameWorld } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { householdConversationRoom, openOrdinaryLife } from "./ordinary-life";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
} from "./run-b-conversation";
import { createHouseholdObligationProgress } from "./run-b-conversation-progress";

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
  readonly #queue: (() => void)[] = [];
  #active = false;
  #running = false;
  #settling = false;
  #settled = false;
  #release: (() => void) | null = null;

  constructor(
    records: Map<string, unknown>,
    control: FakeStorageControl,
    lock: FakeTransactionLock,
  ) {
    this.#records = records;
    this.#control = control;
    lock.acquire((release) => {
      this.#release = release;
      this.#active = true;
      this.#pump();
    });
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
    this.#queue.push(() => {
      const settle = () => {
        let failed = false;
        try {
          if (this.#control.shouldFail(operation)) {
            throw new Error("Fake IndexedDB was told to fail this write.");
          }
          request.result = run();
        } catch (error) {
          failed = true;
          request.error = new DOMException(
            error instanceof Error ? error.message : "Fake IndexedDB failure",
          );
        }
        if (failed) {
          request.onerror?.();
          this.#running = false;
          this.#abort();
          return;
        }
        // A success handler may issue another request on this transaction —
        // which is exactly what a read-decide-write does, and the reason this
        // fake had to grow up. Anything queued from in here runs before the
        // transaction is allowed to complete.
        request.onsuccess?.();
        this.#running = false;
        this.#pump();
      };
      const delay = this.#control.delayFor(operation);
      if (delay > 0) setTimeout(settle, delay);
      else queueMicrotask(settle);
    });
    if (this.#active) this.#pump();
    return request as unknown as IDBRequest<T>;
  }

  #pump(): void {
    if (!this.#active || this.#running || this.#settled) return;
    const next = this.#queue.shift();
    if (next) {
      this.#running = true;
      next();
      return;
    }
    if (this.#settling) return;
    this.#settling = true;
    queueMicrotask(() => {
      this.#settling = false;
      if (this.#settled) return;
      if (this.#running || this.#queue.length > 0) {
        this.#pump();
        return;
      }
      this.#settled = true;
      this.oncomplete?.();
      this.#release?.();
    });
  }

  #abort(): void {
    if (this.#settled) return;
    this.#settled = true;
    this.#queue.length = 0;
    this.onabort?.();
    this.#release?.();
  }
}

/**
 * Transactions run one at a time, the way a browser runs them.
 *
 * Real IndexedDB serializes overlapping read-write transactions on an object
 * store, and that is precisely the guarantee the cross-tab repair rests on: a
 * second tab cannot slip between another tab's read and its write. A fake that
 * let them interleave would let a cross-tab test pass or fail for reasons no
 * browser has, so this one takes the same lock the browser does.
 */
class FakeTransactionLock {
  #tail: Promise<void> = Promise.resolve();

  acquire(start: (release: () => void) => void): void {
    const previous = this.#tail;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#tail = previous.then(() => held);
    void previous.then(() => start(release));
  }
}

type FakeOperation = "get" | "getAll" | "put" | "delete";

class FakeStorageControl {
  #failures = new Map<FakeOperation, number>();
  #skips = new Map<FakeOperation, number>();
  #delays = new Map<FakeOperation, number>();

  /**
   * Fails the next `times` occurrences of an operation, after letting `after`
   * of them through first.
   *
   * `after` exists because deleting a slot writes a tombstone rather than
   * emptying a key, so "fail the delete but not the autosave that was already
   * owed" is now a question about which `put` — and that race is exactly the
   * one the audit found.
   */
  failNext(operation: FakeOperation, times = 1, after = 0): void {
    this.#failures.set(operation, times);
    this.#skips.set(operation, after);
  }

  delay(operation: FakeOperation, milliseconds: number): void {
    this.#delays.set(operation, milliseconds);
  }

  clearDelays(): void {
    this.#delays.clear();
  }

  clearFailures(): void {
    this.#failures.clear();
    this.#skips.clear();
  }

  shouldFail(operation: FakeOperation): boolean {
    const remaining = this.#failures.get(operation) ?? 0;
    if (remaining <= 0) return false;
    const skip = this.#skips.get(operation) ?? 0;
    if (skip > 0) {
      this.#skips.set(operation, skip - 1);
      return false;
    }
    this.#failures.set(operation, remaining - 1);
    return true;
  }

  delayFor(operation: FakeOperation): number {
    return this.#delays.get(operation) ?? 0;
  }
}

/**
 * One database. Open it from as many stores as you like — they share the
 * records and the transaction lock, which is what a second browser tab
 * actually gets.
 */
class FakeIndexedDbFactory {
  readonly records = new Map<string, unknown>();
  readonly control = new FakeStorageControl();
  readonly #lock = new FakeTransactionLock();
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
          this.#lock,
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
    expect(store.durableContentId(saveId)).toBe(contentId(world));

    const advanced = advanceDemoWorld(world, 7);
    factory.control.failNext("put");
    await expect(store.save(advanced, saveId)).rejects.toThrow();

    // What is durable stayed where it was, so the caller knows to try again —
    // this is exactly what used to be lost.
    expect(store.durableContentId(saveId)).toBe(contentId(world));
    expect(store.durableContentId(saveId)).not.toBe(contentId(advanced));

    const retried = await store.save(advanced, saveId);
    expect(retried.status).toBe("saved");
    expect(store.durableContentId(saveId)).toBe(contentId(advanced));
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

    expect(store.durableContentId(saveId)).toBe(contentId(newest));
    const reloaded = await store.load(saveId);
    expect(contentId(reloaded!)).toBe(contentId(newest));
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
    expect(store.durableContentId(saveId)).toBe(contentId(advanced));
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
    expect(store.durableContentId(saveId)).toBe(contentId(world));
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

    // Deleting a slot writes a tombstone to it rather than emptying its key,
    // so the write is the operation that can fail. The assertions below are
    // unchanged: a delete that did not happen must leave the slot usable.
    factory.control.failNext("put");
    await expect(store.remove(saveId)).rejects.toThrow();

    // The save is still there, so a fence held only in memory would have
    // blocked a slot that was never removed — and lost it at the next restart,
    // when the fence is gone and the record is not.
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

/* -------------------------------------------------------------------------- */
/* Persistence revision identity.                                             */
/* -------------------------------------------------------------------------- */

/**
 * A canonical world change that does not advance the action sequence.
 *
 * `actionSequence` is not a world revision counter. Only `advanceTime` and
 * `advanceMinutes` move it, so every writer that records history without
 * advancing the clock — conversation turns, formative beats, legislative
 * steps, ordinary-life bookkeeping — produces a canonically different world
 * carrying the number the previous one had. A store that treats that number
 * as the persistence revision will call the new world already durable and
 * throw the player's action away.
 */
function withRecordedEvent(world: World, key: string): World {
  return recordWorldEvent(world, {
    stableKey: key,
    type: "simulation.persistence-revision-probe",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.persistence"],
    summary: `A canonical world change recorded as ${key}.`,
    context: {
      location: null,
      socialContext: "A canonical history write that does not advance time.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function contentId(world: World): EntityId {
  return createWorldSnapshot(world).snapshotId;
}

describe("Durability is content identity and request order, not actionSequence", () => {
  function autosaveStore(clockValue = "2026-05-01T10:00:00.000Z") {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt(clockValue).now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });
    return { factory, store };
  }

  // A. Same action sequence, different history.
  it("writes a world whose history changed without the action sequence moving", async () => {
    const { store } = autosaveStore();
    const first = playerWorld("revision-identity");
    const saveId = store.newSaveId(first);
    await store.save(first, saveId);

    const second = withRecordedEvent(first, "revision-identity:one");

    // The premise, stated rather than assumed: the same number, a different
    // world. A store that keys durability off the number cannot tell them
    // apart; a store that keys off content can.
    expect(second.actionSequence).toBe(first.actionSequence);
    expect(contentId(second)).not.toBe(contentId(first));
    expect(second.history.events.length).toBe(first.history.events.length + 1);

    const result = await store.autosave(second, saveId);
    expect(result.status).toBe("saved");

    const reloaded = await store.load(saveId);
    expect(contentId(reloaded!)).toBe(contentId(second));
    expect(reloaded!.history.events.at(-1)!.stableKey).toBe(
      "revision-identity:one",
    );
  });

  it("reports what is durable as content, not as an action sequence", async () => {
    const { store } = autosaveStore();
    const world = playerWorld("durable-content");
    const saveId = store.newSaveId(world);

    expect(store.durableContentId(saveId)).toBeNull();
    await store.save(world, saveId);
    expect(store.durableContentId(saveId)).toBe(contentId(world));

    const changed = withRecordedEvent(world, "durable-content:one");
    expect(store.durableContentId(saveId)).not.toBe(contentId(changed));
    await store.autosave(changed, saveId);
    expect(store.durableContentId(saveId)).toBe(contentId(changed));
  });

  // C. Rapid distinct mutations, two of them sharing an action sequence.
  it("keeps the newest requested world, not the largest action sequence", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("rapid");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // Advanced first, so the newest request carries a *lower* action sequence
    // than one already queued. Ordering by that number would write the wrong
    // world and call it correct.
    const advanced = advanceDemoWorld(world, 5);
    const sameSequence = withRecordedEvent(world, "rapid:one");
    const newest = withRecordedEvent(sameSequence, "rapid:two");
    expect(newest.actionSequence).toBe(world.actionSequence);
    expect(newest.actionSequence).toBeLessThan(advanced.actionSequence);

    factory.control.delay("put", 5);
    const writes = [
      store.autosave(advanced, saveId),
      store.autosave(sameSequence, saveId),
      store.autosave(newest, saveId),
    ];
    const results = await Promise.all(writes);
    factory.control.clearDelays();

    expect(results.map((result) => result.status)).toEqual([
      "saved",
      "saved",
      "saved",
    ]);
    const reloaded = await store.load(saveId);
    expect(contentId(reloaded!)).toBe(contentId(newest));
  });

  // D. Exact duplicate.
  it("recognises an exact duplicate as already durable without writing again", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("duplicate");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // If the store wrote again it would fail, because storage is refusing.
    factory.control.failNext("put", 20);
    expect((await store.autosave(world, saveId)).status).toBe("saved");
    expect((await store.autosave(world, saveId)).status).toBe("saved");
    factory.control.clearFailures();

    // And ordering, retry and flush are all still intact afterwards.
    expect((await store.flush()).status).toBe("settled");
    const changed = withRecordedEvent(world, "duplicate:one");
    expect((await store.autosave(changed, saveId)).status).toBe("saved");
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });

  // E. Failure and flush.
  it("refuses to call a life saved when only the older world reached disk", async () => {
    const { store, factory } = autosaveStore();
    const world = playerWorld("unsaved-leave");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "unsaved-leave:one");
    expect(changed.actionSequence).toBe(world.actionSequence);

    factory.control.failNext("put", 20);
    const result = await store.autosave(changed, saveId);
    expect(result.status).toBe("failed");

    factory.control.failNext("put", 20);
    const leaving = await store.flush();
    expect(leaving.status).toBe("unsaved");
    expect(leaving.unsaved).toContain(saveId);
    // What is on disk is still the older world, and the store says so.
    expect(store.durableContentId(saveId)).toBe(contentId(world));

    factory.control.clearFailures();
    expect((await store.flush()).status).toBe("settled");
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });

  // F. Delete fence.
  it("cannot resurrect a deleted slot with a distinct same-sequence world", async () => {
    const { store } = autosaveStore();
    const world = playerWorld("fenced");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);
    expect(await store.remove(saveId)).toBe(true);

    const changed = withRecordedEvent(world, "fenced:one");
    expect(changed.actionSequence).toBe(world.actionSequence);
    expect((await store.autosave(changed, saveId)).status).toBe("discarded");
    expect((await store.save(changed, saveId)).status).toBe("discarded");
    expect((await store.flush()).status).toBe("settled");
    expect((await store.list()).saves).toHaveLength(0);
  });
});

describe("A player's conversation survives leaving", () => {
  // B. The real production conversation path, not a synthetic mutation.
  it("keeps a household turn that did not advance the action sequence", async () => {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt("2026-05-01T10:00:00.000Z").now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });

    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "conversation-durability",
      givenName: null,
      familyName: null,
    });
    const opened = openOrdinaryLife(game.world, game.playerPersonId);
    const saveId = store.newSaveId(opened);
    expect((await store.save(opened, saveId)).status).toBe("saved");

    const room = householdConversationRoom(opened, game.playerPersonId)!;
    const spoken = commitConversationTurn(opened, {
      session: createConversationSessionDescriptor(opened, room),
      room,
      progress: createHouseholdObligationProgress(),
      turnOrdinal: 1,
      addressee: room.eligibleAddresseePersonIds[0]!,
      audibility: "normal",
      intent: "listen",
    }).world;

    // The behaviour this test is guarding against: a real player turn that
    // leaves the action sequence exactly where it was.
    expect(spoken.actionSequence).toBe(opened.actionSequence);
    expect(contentId(spoken)).not.toBe(contentId(opened));

    expect((await store.autosave(spoken, saveId)).status).toBe("saved");
    expect((await store.flush()).status).toBe("settled");

    const reloaded = await store.load(saveId);
    expect(
      recordedConversationIntents(
        reloaded!,
        game.playerPersonId,
        "household-obligation",
      ),
    ).toHaveLength(1);
    expect(contentId(reloaded!)).toBe(contentId(spoken));
  });
});

describe("A bill moved through committee survives leaving", () => {
  /**
   * The same defect, on a second production path.
   *
   * Opening legislative work and taking a step both write canonical history
   * and leave `actionSequence` exactly where it was, so under the old contract
   * a player could move a measure to referral, through a hearing and out of
   * committee, autosave after each step, and find on reload that none of it
   * happened. That is not a variant of the conversation bug; it is the same
   * bug reached through a different door, which is why the fix belongs in the
   * store rather than in either writer.
   */
  it("keeps steps that did not advance the action sequence", async () => {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt("2026-05-01T10:00:00.000Z").now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });

    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      household: "shares-a-home",
      seed: "legislative-durability",
      givenName: null,
      familyName: null,
    });
    const capabilities = resolvePlayerCapabilities(game.world);
    const saveId = store.newSaveId(game.world);
    expect((await store.save(game.world, saveId)).status).toBe("saved");

    const opened = openLegislativeWork(game.world, {
      scenarioKey: "kentucky",
      playerPersonId: game.playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });
    expect(opened.world.actionSequence).toBe(game.world.actionSequence);
    expect((await store.autosave(opened.world, saveId)).status).toBe("saved");

    let moved = opened.world;
    const stepsThatDidNotAdvanceTheSequence: string[] = [];
    for (const step of [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
    ] as const) {
      const before = moved;
      moved = applyLegislativeCommand(moved, opened.assignment, {
        kind: "take-step",
        step,
      }).world;
      expect(contentId(moved)).not.toBe(contentId(before));
      if (moved.actionSequence === before.actionSequence) {
        stepsThatDidNotAdvanceTheSequence.push(step);
      }
      expect((await store.autosave(moved, saveId)).status).toBe("saved");
    }
    // Some steps advance the clock and some only write history. The ones that
    // only write history are the ones the old contract lost, and there is at
    // least one of them in an ordinary bill's path through committee.
    expect(stepsThatDidNotAdvanceTheSequence.length).toBeGreaterThan(0);
    expect((await store.flush()).status).toBe("settled");

    const reloaded = await store.load(saveId);
    expect(contentId(reloaded!)).toBe(contentId(moved));
    const before = measurePosition(moved, opened.assignment.measureId);
    const after = measurePosition(reloaded!, opened.assignment.measureId);
    expect(after.phase).toBe(before.phase);
    expect(after.chamberKey).toBe(before.chamberKey);
  });
});

/* -------------------------------------------------------------------------- */
/* The Codex acceptance audit, reproduced.                                     */
/*                                                                             */
/* Everything below fails on the audited head 1d1a4f68. They are written to    */
/* the shape of the audit's own probes: real store instances over one shared   */
/* database, divergent worlds that deliberately keep the same actionSequence,  */
/* and assertions about what is on disk rather than about what a store said.   */
/* -------------------------------------------------------------------------- */

/**
 * Two stores over one database, which is what two browser tabs actually are.
 *
 * The audited head's "two tabs" test built eight stores over eight databases
 * and checked that their slot ids differed. That is a true thing about ids and
 * says nothing about concurrency: no slot was ever shared, so no write ever
 * raced another. Sharing the factory shares the records *and* the transaction
 * lock, so these tabs contend the way tabs do.
 */
function sharedDatabase(clockValue = "2026-05-01T10:00:00.000Z") {
  const factory = new FakeIndexedDbFactory();
  const clock = clockAt(clockValue);
  const openTab = () =>
    new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clock.now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });
  return { factory, clock, openTab };
}

/** What is actually on disk for a slot, read the way any other tab would. */
function storedContentId(
  factory: FakeIndexedDbFactory,
  saveId: EntityId,
): EntityId | null {
  const read = readStoredRecord(factory.records.get(saveId));
  return read.kind === "healthy" ? read.record.metadata.snapshotId : null;
}

describe("Two tabs, one database", () => {
  // BLOCKER 1.
  it("lets only one of two tabs call its own divergent world durable", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-divergent");
    const saveId = tabA.newSaveId(world);

    await tabA.save(world, saveId);
    // Both tabs have the same life open, which is the ordinary way to get here:
    // a second window on the same save.
    expect(await tabB.load(saveId)).not.toBeNull();

    const fromA = withRecordedEvent(world, "two-tabs:a");
    const fromB = withRecordedEvent(world, "two-tabs:b");
    // The premise, stated rather than assumed: two different worlds carrying
    // one action sequence, so nothing here is rescued by that number.
    expect(fromA.actionSequence).toBe(world.actionSequence);
    expect(fromB.actionSequence).toBe(world.actionSequence);
    expect(contentId(fromA)).not.toBe(contentId(fromB));

    const [resultA, resultB] = await Promise.all([
      tabA.autosave(fromA, saveId),
      tabB.autosave(fromB, saveId),
    ]);

    // Exactly one may be told its world is durable. On the audited head both
    // were, and one canonical world was gone with nothing having said so.
    const statuses = [resultA.status, resultB.status].sort();
    expect(statuses).toEqual(["conflict", "saved"]);

    const winner = resultA.status === "saved" ? fromA : fromB;
    const loser = resultA.status === "saved" ? fromB : fromA;
    expect(storedContentId(factory, saveId)).toBe(contentId(winner));
    expect(storedContentId(factory, saveId)).not.toBe(contentId(loser));

    // And the tab that lost is not allowed to leave believing it is settled.
    const losingTab = resultA.status === "saved" ? tabB : tabA;
    const leaving = await losingTab.flush();
    expect(leaving.status).toBe("unsaved");
    expect(leaving.unsaved).toContain(saveId);
    expect(leaving.reason).not.toBeNull();
    expect(losingTab.unsavedWork().map((slot) => slot.kind)).toEqual([
      "conflict",
    ]);
  });

  it("refuses a stale tab that never opened the slot it is writing over", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-unseen");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);

    // Tab B knows the slot id but has never read the slot, so it has no claim
    // on it. Writing a different world there would be a pure overwrite.
    const strange = withRecordedEvent(playerWorld("two-tabs-other"), "other");
    const outcome = await tabB.save(strange, saveId);
    expect(outcome.status).toBe("conflict");
    expect(storedContentId(factory, saveId)).toBe(contentId(world));
  });

  it("tells a tab its own world is durable when the other tab wrote exactly it", async () => {
    const { openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-converged");
    const saveId = tabA.newSaveId(world);

    await tabA.save(world, saveId);
    // Nothing was lost — the world tab B wanted stored is stored — so refusing
    // here would be as dishonest as the overwrite, in the other direction.
    expect((await tabB.autosave(world, saveId)).status).toBe("saved");
    expect((await tabB.flush()).status).toBe("settled");
  });

  // BLOCKER 1, in the shape the same-sequence repair is tested in for one tab.
  it("keeps N, N+1 and N+2 from one tab and refuses the stale tab throughout", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-rapid");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);
    expect(await tabB.load(saveId)).not.toBeNull();

    const first = withRecordedEvent(world, "rapid-tabs:one");
    const second = withRecordedEvent(first, "rapid-tabs:two");
    const third = withRecordedEvent(second, "rapid-tabs:three");
    // Not one of these advances the clock, so all four share one number.
    expect(third.actionSequence).toBe(world.actionSequence);

    factory.control.delay("put", 2);
    const writes = await Promise.all([
      tabA.autosave(first, saveId),
      tabA.autosave(second, saveId),
      tabA.autosave(third, saveId),
    ]);
    factory.control.clearDelays();
    expect(writes.map((write) => write.status)).toEqual([
      "saved",
      "saved",
      "saved",
    ]);
    expect(storedContentId(factory, saveId)).toBe(contentId(third));

    // The other tab has been out of date since the first of those landed.
    const stale = withRecordedEvent(world, "rapid-tabs:stale");
    expect((await tabB.autosave(stale, saveId)).status).toBe("conflict");
    expect(storedContentId(factory, saveId)).toBe(contentId(third));

    // Opening the save again is how a tab legitimately catches up, and then it
    // may write once more.
    expect(await tabB.load(saveId)).not.toBeNull();
    const caughtUp = withRecordedEvent(third, "rapid-tabs:caught-up");
    expect((await tabB.autosave(caughtUp, saveId)).status).toBe("saved");
    expect(storedContentId(factory, saveId)).toBe(contentId(caughtUp));
    expect((await tabB.flush()).status).toBe("settled");
  });

  // BLOCKER 2.
  it("does not let a stale tab acknowledge or resurrect a deleted save", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-deleted");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);
    expect(await tabB.load(saveId)).not.toBeNull();

    expect(await tabA.remove(saveId)).toBe(true);
    expect((await tabA.list()).saves).toHaveLength(0);

    // The first violation: the audited head short-circuited an unchanged world
    // against its own cache and said `saved` about a record that no longer
    // existed anywhere.
    expect((await tabB.autosave(world, saveId)).status).toBe("discarded");
    expect((await tabB.flush()).status).toBe("settled");
    expect((await tabB.list()).saves).toHaveLength(0);

    // The second: the next genuinely new world was an unconditional put, and
    // it brought the deleted save back.
    const after = withRecordedEvent(world, "two-tabs:after-delete");
    expect(after.actionSequence).toBe(world.actionSequence);
    expect((await tabB.autosave(after, saveId)).status).toBe("discarded");
    expect((await tabB.save(after, saveId)).status).toBe("discarded");
    expect(await tabB.load(saveId)).toBeNull();
    expect((await tabB.list()).saves).toHaveLength(0);
    expect(storedContentId(factory, saveId)).toBeNull();

    // A deleted slot is fenced; the life is not. Keeping it again is allowed,
    // and takes a slot of its own.
    const fresh = tabB.newSaveId(after);
    expect(fresh).not.toBe(saveId);
    expect((await tabB.save(after, fresh)).status).toBe("saved");
    expect((await tabB.list()).saves.map((save) => save.saveId)).toEqual([
      fresh,
    ]);
  });

  it("carries a deletion to a tab that only ever looked at the list", async () => {
    const { openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-listed");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);
    expect(await tabB.load(saveId)).not.toBeNull();
    expect(await tabA.remove(saveId)).toBe(true);

    // A tombstone is not a saved game and not a damaged one; a player should
    // see neither a game nor a warning for a game they got rid of.
    const listing = await tabB.list();
    expect(listing.saves).toEqual([]);
    expect(listing.damaged).toEqual([]);
    expect((await tabB.autosave(world, saveId)).status).toBe("discarded");
  });

  it("survives a delete racing a write from the other tab, either way round", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("two-tabs-race");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);
    expect(await tabB.load(saveId)).not.toBeNull();

    const changed = withRecordedEvent(world, "two-tabs-race:one");
    factory.control.delay("put", 2);
    const [writing, removing] = await Promise.all([
      tabB.autosave(changed, saveId),
      tabA.remove(saveId),
    ]);
    factory.control.clearDelays();

    expect(removing).toBe(true);
    // Whichever order the two transactions took, the player's delete is the
    // last word: nothing is on disk and nothing claims otherwise.
    expect(["saved", "discarded"]).toContain(writing.status);
    expect((await tabB.list()).saves).toEqual([]);
    expect(await tabB.load(saveId)).toBeNull();
    expect((await tabB.autosave(changed, saveId)).status).toBe("discarded");
    expect((await tabB.flush()).status).toBe("settled");
  });
});

/* -------------------------------------------------------------------------- */
/* MODERATE 1 — a delete that fails must not take an owed world with it.      */
/* -------------------------------------------------------------------------- */

describe("A failed delete keeps what was already owed", () => {
  function owedStore(clockValue = "2026-05-01T10:00:00.000Z") {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt(clockValue).now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });
    return { factory, store };
  }

  it("still writes the world a provisional delete was standing in front of", async () => {
    const { store, factory } = owedStore();
    const world = playerWorld("owed-through-delete");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "owed-through-delete:one");
    expect(changed.actionSequence).toBe(world.actionSequence);

    // The exact race the audit ran: a world is owed to the slot, deletion is
    // asked for immediately behind it, and the deletion fails. On the audited
    // head the fence went up first, the drain threw the owed world away
    // because of it, and the rollback then found nothing to put back — so the
    // save survived, the newest world did not, and `flush` said settled.
    factory.control.delay("put", 2);
    factory.control.failNext("put", 1, 1);
    const autosaving = store.autosave(changed, saveId);
    const removing = store.remove(saveId);

    await expect(removing).rejects.toThrow();
    expect((await autosaving).status).toBe("saved");
    factory.control.clearDelays();
    factory.control.clearFailures();

    // The delete did not happen, so the save is still here — and it is the
    // world the player actually had, not the older one.
    expect((await store.flush()).status).toBe("settled");
    expect((await store.list()).saves).toHaveLength(1);
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });

  it("does not call itself settled while a failed delete left a world owed", async () => {
    const { store, factory } = owedStore();
    const world = playerWorld("owed-and-failing");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "owed-and-failing:one");
    factory.control.failNext("put", 20);
    expect((await store.autosave(changed, saveId)).status).toBe("failed");

    // Deleting fails too. Nothing was removed, so nothing may be forgotten:
    // the world is still owed and leaving has to say so.
    factory.control.failNext("put", 20);
    await expect(store.remove(saveId)).rejects.toThrow();
    expect(store.unsavedWork().map((slot) => slot.saveId)).toEqual([saveId]);

    factory.control.failNext("put", 20);
    const leaving = await store.flush();
    expect(leaving.status).toBe("unsaved");
    expect(leaving.unsaved).toContain(saveId);

    // And once storage works, leaving writes it rather than losing it.
    factory.control.clearFailures();
    expect((await store.flush()).status).toBe("settled");
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });

  it("discards the owed world when the delete it waited for does commit", async () => {
    const { store, factory } = owedStore();
    const world = playerWorld("owed-then-deleted");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "owed-then-deleted:one");
    // The first attempt at the owed world fails, so it is genuinely still owed
    // when the delete lands behind it and the drain has to wait for it.
    factory.control.failNext("put", 1);
    const autosaving = store.autosave(changed, saveId);
    const removing = store.remove(saveId);

    expect(await removing).toBe(true);
    expect((await autosaving).status).toBe("discarded");
    expect((await store.flush()).status).toBe("settled");
    expect((await store.list()).saves).toEqual([]);
    expect(store.unsavedWork()).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* MAJOR 1 — closing the tab.                                                 */
/* -------------------------------------------------------------------------- */

/** Just enough of `window` to prove what the guard does and does not do. */
class FakeWindow implements UnloadTarget {
  readonly #listeners = new Map<string, ((event: Event) => void)[]>();

  addEventListener(type: string, listener: (event: Event) => void): void {
    const existing = this.#listeners.get(type) ?? [];
    existing.push(listener);
    this.#listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.#listeners.set(
      type,
      (this.#listeners.get(type) ?? []).filter((entry) => entry !== listener),
    );
  }

  listenerCount(type: string): number {
    return (this.#listeners.get(type) ?? []).length;
  }

  /** Returns whether anything asked the browser not to go through with it. */
  dispatch(type: string): boolean {
    let prevented = false;
    const event = {
      type,
      preventDefault: () => {
        prevented = true;
      },
    } as unknown as Event;
    for (const listener of [...(this.#listeners.get(type) ?? [])]) {
      listener(event);
    }
    return prevented;
  }
}

describe("Closing the tab is a way of leaving", () => {
  function guardedStore(clockValue = "2026-05-01T10:00:00.000Z") {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt(clockValue).now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });
    const window = new FakeWindow();
    const seen: UnsavedSlot[][] = [];
    const stop = guardUnsavedWork(store, window, {
      onUnsaved: (unsaved) => seen.push([...unsaved]),
    });
    return { factory, store, window, seen, stop };
  }

  it("says nothing while there is nothing to say", async () => {
    const { store, window, stop } = guardedStore();
    const world = playerWorld("close-quiet");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);
    expect((await store.autosave(world, saveId)).status).toBe("saved");

    // A page that always asks is a page whose question stops meaning anything.
    expect(window.dispatch("beforeunload")).toBe(false);
    stop();
    expect(window.listenerCount("beforeunload")).toBe(0);
  });

  it("stops a silent close while a write has failed", async () => {
    const { store, factory, window, seen } = guardedStore();
    const world = playerWorld("close-failed");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "close-failed:one");
    factory.control.failNext("put", 20);
    expect((await store.autosave(changed, saveId)).status).toBe("failed");

    // On the audited head nothing was watching this at all: the newest world
    // existed only in `#pending`, and closing the window destroyed it without
    // a word. There is no promise here that an unload write lands — only that
    // the close cannot be silent.
    expect(window.dispatch("beforeunload")).toBe(true);
    expect(seen.at(-1)).toEqual([
      { saveId, kind: "failed", reason: expect.any(String) },
    ]);

    // Leaving on purpose still refuses, and once storage recovers both agree.
    expect((await store.flush()).status).toBe("unsaved");
    factory.control.clearFailures();
    expect((await store.flush()).status).toBe("settled");
    expect(window.dispatch("beforeunload")).toBe(false);
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });

  it("stops a silent close while a slow write is still in flight", async () => {
    const { store, factory, window } = guardedStore();
    const world = playerWorld("close-slow");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "close-slow:one");
    factory.control.delay("put", 20);
    const autosaving = store.autosave(changed, saveId);
    expect(store.unsavedWork().map((slot) => slot.kind)).toEqual(["pending"]);
    expect(window.dispatch("beforeunload")).toBe(true);

    expect((await autosaving).status).toBe("saved");
    factory.control.clearDelays();
    expect(window.dispatch("beforeunload")).toBe(false);
  });

  it("stops a silent close while a slot has been lost to another tab", async () => {
    const { factory, openTab } = sharedDatabase();
    const tabA = openTab();
    const tabB = openTab();
    const world = playerWorld("close-conflicted");
    const saveId = tabA.newSaveId(world);
    await tabA.save(world, saveId);
    expect(await tabB.load(saveId)).not.toBeNull();

    await tabA.autosave(withRecordedEvent(world, "close-conflicted:a"), saveId);
    const losing = withRecordedEvent(world, "close-conflicted:b");
    expect((await tabB.autosave(losing, saveId)).status).toBe("conflict");

    const window = new FakeWindow();
    guardUnsavedWork(tabB, window);
    expect(window.dispatch("beforeunload")).toBe(true);

    // Releasing the slot is the shell saying it has taken the life somewhere
    // else — which is the only honest way out, and the only thing that quiets
    // the guard.
    tabB.releaseSlot(saveId);
    expect(window.dispatch("beforeunload")).toBe(false);
    expect((await tabB.flush()).status).toBe("settled");

    const fresh = tabB.newSaveId(losing);
    expect((await tabB.save(losing, fresh)).status).toBe("saved");
    expect(storedContentId(factory, fresh)).toBe(contentId(losing));
  });

  it("tries once more on the way out, without claiming that it worked", async () => {
    const { store, factory, window } = guardedStore();
    const world = playerWorld("close-pagehide");
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    const changed = withRecordedEvent(world, "close-pagehide:one");
    factory.control.failNext("put", 20);
    expect((await store.autosave(changed, saveId)).status).toBe("failed");

    factory.control.clearFailures();
    window.dispatch("pagehide");
    // Best effort, and only that: the page may be gone first. What is asserted
    // is that the attempt is made, not that a closing page can guarantee it.
    expect((await store.flush()).status).toBe("settled");
    expect(contentId((await store.load(saveId))!)).toBe(contentId(changed));
  });
});

/* -------------------------------------------------------------------------- */
/* MODERATE 2 — content identity is about content.                            */
/* -------------------------------------------------------------------------- */

/**
 * The same world with its record maps rebuilt in the opposite insertion order.
 *
 * Every explicit order array and every value is left exactly as it was, so
 * nothing semantic changes. This is what a reducer that spreads a changed
 * person last, or a map rebuilt after a delete, produces in practice.
 */
function reversedRecordOrder(world: World): World {
  const reverse = <T>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).reverse());
  return {
    ...world,
    people: reverse(world.people),
    jurisdictions: reverse(world.jurisdictions),
  };
}

describe("Content identity is about content, not insertion order", () => {
  it("gives one identity to a world whose record maps were rebuilt in another order", () => {
    const world = playerWorld("canonical-order");
    const reordered = reversedRecordOrder(world);

    // The premise: genuinely different bytes, genuinely the same world.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(world));
    expect(Object.keys(reordered.people)).toEqual(
      [...Object.keys(world.people)].reverse(),
    );
    expect(reordered.personOrder).toEqual(world.personOrder);

    // On the audited head these were two different revisions of one life.
    expect(contentId(reordered)).toBe(contentId(world));
    expect(createWorldSnapshot(reordered).snapshotId).toBe(
      createWorldSnapshot(world).snapshotId,
    );
  });

  it("round-trips a reordered world under its own identity", () => {
    const world = playerWorld("canonical-round-trip");
    const reordered = reversedRecordOrder(world);
    const payload = serializeWorld(reordered);
    const restored = deserializeWorld(payload);
    expect(restored).toStrictEqual(reordered);
    expect(contentId(restored)).toBe(contentId(world));
  });

  it("writes exactly what it was handed, deciding that from bytes and not from a hash", async () => {
    const factory = new FakeIndexedDbFactory();
    const store = new BrowserSaveStore({
      indexedDB: factory.asFactory(),
      now: clockAt("2026-05-01T10:00:00.000Z").now,
      databaseName: "test-worlds",
      delay: () => Promise.resolve(),
    });
    const world = playerWorld("canonical-store");
    const reordered = reversedRecordOrder(world);
    const saveId = store.newSaveId(world);
    await store.save(world, saveId);

    // Skipping durable work is the one decision a 64-bit digest must not be
    // trusted with, so it is made on the stored bytes. These two worlds share
    // an identity and differ in bytes, so this writes — costing one write, and
    // never a world.
    expect((await store.autosave(reordered, saveId)).status).toBe("saved");
    const stored = await store.load(saveId);
    expect(JSON.stringify(stored)).toBe(JSON.stringify(reordered));

    // Handed in a second time, the bytes now match and nothing is written —
    // proved by refusing every write for the duration.
    factory.control.failNext("put", 20);
    expect((await store.autosave(reordered, saveId)).status).toBe("saved");
    factory.control.clearFailures();
  });
});
