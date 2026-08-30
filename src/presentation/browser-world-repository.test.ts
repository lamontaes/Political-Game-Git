import { describe, expect, it } from "vitest";

import {
  advanceDemoWorld,
  createDemoWorld,
  createLifeStartWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  BROWSER_WORLD_RECORD_KIND,
  BrowserWorldRepository,
  SerializedAutosaveCoordinator,
  createBrowserWorldRecord,
  validateBrowserWorldRecord,
} from "./browser-world-repository";

class FakeTransaction {
  error: DOMException | null = null;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  readonly #records: Map<string, unknown>;

  constructor(records: Map<string, unknown>) {
    this.#records = records;
  }

  objectStore(): IDBObjectStore {
    const store = {
      get: (key: IDBValidKey) =>
        this.#request(() => {
          const value = this.#records.get(String(key));
          return value === undefined ? undefined : structuredClone(value);
        }),
      getAll: () =>
        this.#request(() =>
          [...this.#records.values()].map((value) => structuredClone(value)),
        ),
      put: (value: unknown) =>
        this.#request(() => {
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
        this.#request(() => {
          this.#records.delete(String(key));
          return undefined;
        }),
    };
    return store as unknown as IDBObjectStore;
  }

  #request<T>(operation: () => T): IDBRequest<T> {
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
    queueMicrotask(() => {
      try {
        request.result = operation();
        request.onsuccess?.();
        queueMicrotask(() => this.oncomplete?.());
      } catch (error) {
        request.error = new DOMException(
          error instanceof Error ? error.message : "Fake IndexedDB failure",
        );
        request.onerror?.();
      }
    });
    return request as unknown as IDBRequest<T>;
  }
}

class FakeIndexedDbFactory {
  readonly records = new Map<string, unknown>();
  #hasStore = false;

  asFactory(): IDBFactory {
    return {
      open: () => this.#open(),
    } as unknown as IDBFactory;
  }

  setRaw(saveId: EntityId, value: unknown): void {
    this.records.set(saveId, structuredClone(value));
  }

  #open(): IDBOpenDBRequest {
    const objectStoreNames = {
      contains: () => this.#hasStore,
    };
    const database = {
      objectStoreNames,
      onversionchange: null,
      createObjectStore: () => {
        this.#hasStore = true;
        return {} as IDBObjectStore;
      },
      transaction: () =>
        new FakeTransaction(this.records) as unknown as IDBTransaction,
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

describe("browser world records", () => {
  it("stores the exact canonical snapshot with player and world metadata", () => {
    const world = playerWorld("browser-record");
    const record = createBrowserWorldRecord(world, "2026-08-29T14:00:00.000Z");
    const player =
      world.control.kind === "person"
        ? world.people[world.control.personId]
        : undefined;

    expect(record.kind).toBe(BROWSER_WORLD_RECORD_KIND);
    expect(record.saveId).toBe(world.id);
    expect(record.payload).toBe(serializeWorld(world));
    expect(record.metadata).toMatchObject({
      saveId: world.id,
      worldId: world.id,
      snapshotFormatVersion: 14,
      worldSchemaVersion: 15,
      worldGeneratorVersion: "demo-world-v15",
      playerPersonId: player?.id,
      playerName: player
        ? `${player.givenName} ${player.familyName}`
        : undefined,
      currentMoment: world.currentMoment,
      actionSequence: world.actionSequence,
      createdAt: "2026-08-29T14:00:00.000Z",
      savedAt: "2026-08-29T14:00:00.000Z",
      lastPlayedAt: "2026-08-29T14:00:00.000Z",
    });
    expect(record.metadata.residence?.name).toBeTruthy();
    expect(validateBrowserWorldRecord(record)).toStrictEqual(record);
  });

  it("rejects unsupported, malformed, and metadata-mismatched records", () => {
    const record = createBrowserWorldRecord(
      playerWorld("browser-corruption"),
      "2026-08-29T14:00:00.000Z",
    );

    expect(() =>
      validateBrowserWorldRecord({ ...record, recordVersion: 2 }),
    ).toThrow(/unsupported record version/i);
    expect(() =>
      validateBrowserWorldRecord({ ...record, payload: "not-json" }),
    ).toThrow(/world snapshot is invalid/i);
    expect(() =>
      validateBrowserWorldRecord({
        ...record,
        metadata: { ...record.metadata, playerName: "Someone Else" },
      }),
    ).toThrow(/metadata does not match/i);
  });
});

describe("browser world repository", () => {
  it("projects a friendly real-place residence without changing the world", async () => {
    const factory = new FakeIndexedDbFactory();
    const repository = new BrowserWorldRepository({
      indexedDB: factory.asFactory(),
      now: () => new Date("2026-08-30T14:00:00.000Z"),
      databaseName: "friendly-place-summary",
    });
    const world = createLifeStartWorld({
      givenName: "Place",
      familyName: "Proof",
      startAge: 16,
      currentResidence: "chicago-illinois",
      seed: "friendly-place-summary",
    });

    const summary = await repository.save(world);
    expect(summary.residence?.name).toBe("Chicago, Illinois");
    expect(world.jurisdictions[summary.residence!.jurisdictionId]?.name).toBe(
      "Chicago city, Illinois",
    );
    expect(await repository.load(world.id)).toStrictEqual(world);
  });

  it("persists multiple worlds, preserves creation time, and sorts stably", async () => {
    const factory = new FakeIndexedDbFactory();
    const clock = clockAt("2026-08-29T14:00:00.000Z");
    const repository = new BrowserWorldRepository({
      indexedDB: factory.asFactory(),
      now: clock.now,
      databaseName: "repository-order-test",
    });
    const alpha = playerWorld("browser-alpha");
    const beta = playerWorld("browser-beta");

    const alphaFirst = await repository.save(alpha);
    clock.set("2026-08-29T14:01:00.000Z");
    const betaFirst = await repository.save(beta);
    expect((await repository.list()).map((save) => save.saveId)).toStrictEqual([
      beta.id,
      alpha.id,
    ]);

    clock.set("2026-08-29T14:02:00.000Z");
    const alphaSecond = await repository.save(advanceDemoWorld(alpha, 7));
    expect(alphaSecond.createdAt).toBe(alphaFirst.createdAt);
    expect(alphaSecond.savedAt).toBe("2026-08-29T14:02:00.000Z");
    expect(alphaSecond.lastPlayedAt).toBe(alphaSecond.savedAt);
    expect(alphaSecond.snapshotId).not.toBe(alphaFirst.snapshotId);
    expect((await repository.mostRecent())?.saveId).toBe(alpha.id);

    clock.set("2026-08-29T14:03:00.000Z");
    expect(await repository.load(beta.id)).toStrictEqual(beta);
    const afterLoad = await repository.list();
    expect(afterLoad.map((save) => save.saveId)).toStrictEqual([
      beta.id,
      alpha.id,
    ]);
    expect(afterLoad[0]).toMatchObject({
      createdAt: betaFirst.createdAt,
      savedAt: betaFirst.savedAt,
      lastPlayedAt: "2026-08-29T14:03:00.000Z",
    });
  });

  it("returns null for a missing world and removes an existing save", async () => {
    const factory = new FakeIndexedDbFactory();
    const repository = new BrowserWorldRepository({
      indexedDB: factory.asFactory(),
      now: () => new Date("2026-08-29T14:00:00.000Z"),
    });
    const world = playerWorld("browser-remove");
    const missingId = "world_missing" as EntityId;

    expect(await repository.load(missingId)).toBeNull();
    expect(await repository.remove(missingId)).toBe(false);
    await repository.save(world);
    expect(await repository.remove(world.id)).toBe(true);
    expect(await repository.list()).toStrictEqual([]);
  });

  it("validates every record read from IndexedDB", async () => {
    const factory = new FakeIndexedDbFactory();
    const world = playerWorld("browser-read-validation");
    const valid = createBrowserWorldRecord(world, "2026-08-29T14:00:00.000Z");
    factory.setRaw(world.id, {
      ...valid,
      metadata: { ...valid.metadata, worldId: "world_wrong" },
    });
    const repository = new BrowserWorldRepository({
      indexedDB: factory.asFactory(),
      now: () => new Date("2026-08-29T14:01:00.000Z"),
    });

    await expect(repository.list()).rejects.toThrow(/metadata does not match/i);
    await expect(repository.load(world.id)).rejects.toThrow(
      /metadata does not match/i,
    );
  });
});

describe("serialized autosave coordinator", () => {
  it("serializes saves and continues after an individual failure", async () => {
    const first = playerWorld("autosave-first");
    const second = playerWorld("autosave-second");
    const third = playerWorld("autosave-third");
    const calls: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const target = {
      async save(world: World) {
        calls.push(world.seed);
        if (world.id === first.id) await firstGate;
        if (world.id === second.id) throw new Error("save failed");
        return createBrowserWorldRecord(world, "2026-08-29T14:00:00.000Z")
          .metadata;
      },
    };
    const coordinator = new SerializedAutosaveCoordinator(target);

    const firstSave = coordinator.save(first);
    const failedSave = coordinator.save(second);
    const thirdSave = coordinator.save(third);
    await Promise.resolve();
    expect(calls).toStrictEqual([first.seed]);
    releaseFirst?.();

    await expect(firstSave).resolves.toMatchObject({ saveId: first.id });
    await expect(failedSave).rejects.toThrow("save failed");
    await expect(thirdSave).resolves.toMatchObject({ saveId: third.id });
    await coordinator.flush();
    expect(calls).toStrictEqual([first.seed, second.seed, third.seed]);
  });
});
