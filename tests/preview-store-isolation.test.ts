import { describe, expect, it } from "vitest";

import { BrowserShellStateStore } from "../src/presentation/browser-shell-state";
import { BrowserSaveStore } from "../src/presentation/browser-world-repository";
import { previewDatabaseName } from "../src/presentation/art-preview";
import {
  DEFAULT_PREFERENCES,
  refKey,
} from "../src/presentation/shell-navigation";
import { createNewGameWorld } from "../src/presentation/new-game";
import type { ShellRef } from "../src/presentation/shell-navigation";
import type { StoredShellState } from "../src/presentation/browser-shell-state";
import type { EntityId } from "../src/simulation";
import type { NewGameSetup } from "../src/presentation/new-game";

/**
 * The development art preview, proved isolated where it can actually leak.
 *
 * A string comparison of two database names is not this proof, and the earlier
 * conclusion drawn from one — that observing a separate world database showed
 * the preview was contained — was wrong. A life is kept in TWO object stores:
 * the world in one and the shell's own per-slot state in the other. Pins, the
 * journal and the wardrobe CHOICE are shell state, and for a while the preview
 * namespaced the first store and not the second, so a candidate outfit picked
 * in the preview was written into the ordinary database under the ordinary
 * slot id.
 *
 * So this seeds a real ordinary life through the real store classes, does the
 * preview's work against the SAME save id, and then reads the ordinary records
 * back to see whether they survived. The last test is the control: it reverts
 * the shell-store namespace alone and requires the leak to reappear, because a
 * containment test that passes with the containment removed is not a test.
 */

const SLOT = "slot-under-test" as EntityId;
const ALICE: ShellRef = { kind: "person", id: "person-alice" as EntityId };
const BOB: ShellRef = { kind: "person", id: "person-bob" as EntityId };

/**
 * IndexedDB as this module depends on it, keyed BY DATABASE NAME.
 *
 * The fake already in the tree answers every `open` with the same database
 * whatever name it is given, which is exactly the distinction under test here
 * — against it, an isolated store and a leaking one are indistinguishable and
 * every assertion below would pass for the wrong reason.
 */
class FakeIndexedDb {
  readonly databases = new Map<string, Map<string, Map<string, unknown>>>();

  asFactory(): IDBFactory {
    return {
      open: (name: string) => {
        const stores =
          this.databases.get(name) ?? new Map<string, Map<string, unknown>>();
        this.databases.set(name, stores);
        const database = this.#database(stores);
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

  #database(stores: Map<string, Map<string, unknown>>): IDBDatabase {
    return {
      objectStoreNames: { contains: (name: string) => stores.has(name) },
      createObjectStore: (name: string) => {
        stores.set(name, new Map());
        return {} as IDBObjectStore;
      },
      onversionchange: null,
      close: () => undefined,
      transaction: (name: string) => this.#transaction(stores, name),
    } as unknown as IDBDatabase;
  }

  #transaction(
    stores: Map<string, Map<string, unknown>>,
    name: string,
  ): IDBTransaction {
    const records = stores.get(name) ?? new Map<string, unknown>();
    stores.set(name, records);
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
        openCursor: () => request(null),
        getAll: () => request([...records.values()]),
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

/** What an ordinary player has after a while: pins, a journal and an outfit. */
function ordinaryShellState(): StoredShellState {
  return {
    pins: [
      { key: refKey(ALICE), ref: ALICE, size: "expanded" },
      { key: refKey(BOB), ref: BOB, size: "tiny" },
    ],
    preferences: DEFAULT_PREFERENCES,
    journal: {
      ambition: "Be some use to the people on this street.",
      notes: [
        {
          id: "note-ordinary",
          title: "What I decided",
          body: "Written in an ordinary game, on production art.",
          group: "decisions",
          personId: null,
          eventKey: null,
        },
      ],
    },
    personWardrobes: {
      "person-alice": {
        personId: "person-alice",
        families: { top: "production-choice" },
      },
    },
  };
}

/** What the preview writes over the top of it, at the SAME slot id. */
function previewShellState(): StoredShellState {
  return {
    pins: [],
    preferences: DEFAULT_PREFERENCES,
    journal: { ambition: "", notes: [] },
    personWardrobes: {
      "person-alice": {
        personId: "person-alice",
        families: { top: "candidate-choice" },
      },
    },
  };
}

function aWorld(seed: string) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup).world;
}

const PRODUCTION_DB = previewDatabaseName("production");
const PREVIEW_DB = previewDatabaseName("candidate-review");

describe("an ordinary save survives everything the preview does", () => {
  it("keeps the interface store's pins, journal and wardrobe intact", async () => {
    const idb = new FakeIndexedDb();

    // An ordinary life, saved the ordinary way.
    const ordinaryShell = new BrowserShellStateStore({
      indexedDB: idb.asFactory(),
      databaseName: PRODUCTION_DB,
    });
    const seeded = ordinaryShellState();
    expect(await ordinaryShell.write(SLOT, seeded)).toBe(true);

    // The preview, doing its work against the SAME slot id.
    const previewShell = new BrowserShellStateStore({
      indexedDB: idb.asFactory(),
      databaseName: PREVIEW_DB,
    });
    expect(await previewShell.write(SLOT, previewShellState())).toBe(true);

    // Read the ordinary record back. Not "is it present" — is it UNCHANGED.
    const after = await ordinaryShell.read(SLOT);
    expect(after).not.toBeNull();
    expect(after!.personWardrobes["person-alice"]?.families.top).toBe(
      "production-choice",
    );
    expect(after!.pins.map((pin) => pin.key)).toStrictEqual(
      seeded.pins.map((pin) => pin.key),
    );
    expect(after!.journal.notes).toHaveLength(1);
    expect(after!.journal.notes[0]?.title).toBe("What I decided");
    expect(after!.journal.ambition).toBe(seeded.journal.ambition);

    // And the preview's own record is there, separately, holding its own choice.
    const preview = await previewShell.read(SLOT);
    expect(preview!.personWardrobes["person-alice"]?.families.top).toBe(
      "candidate-choice",
    );
  });

  it("keeps the world store's saved life loadable and unchanged", async () => {
    const idb = new FakeIndexedDb();
    const ordinaryWorlds = new BrowserSaveStore({
      indexedDB: idb.asFactory(),
      databaseName: PRODUCTION_DB,
    });
    const previewWorlds = new BrowserSaveStore({
      indexedDB: idb.asFactory(),
      databaseName: PREVIEW_DB,
    });

    const ordinaryWorld = aWorld("isolation-ordinary");
    const saveId = ordinaryWorlds.newSaveId(ordinaryWorld);
    const saved = await ordinaryWorlds.save(ordinaryWorld, saveId);
    expect(saved.status).toBe("saved");

    // The preview saves a DIFFERENT life at the same slot id in its own database.
    const previewWorld = aWorld("isolation-preview");
    expect((await previewWorlds.save(previewWorld, saveId)).status).toBe(
      "saved",
    );

    // The ordinary life still loads, and it is still the ordinary life.
    const reloaded = await ordinaryWorlds.load(saveId);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.id).toBe(ordinaryWorld.id);
    expect(reloaded!.personOrder).toStrictEqual(ordinaryWorld.personOrder);
    expect(reloaded!.id).not.toBe(previewWorld.id);
  });

  it("leaks again the moment the interface namespace is reverted", async () => {
    /*
     * THE CONTROL. This is the defect as it stood: the world store namespaced
     * and the shell store left on the production name. If containment can be
     * removed and the two tests above still pass, they are decoration.
     */
    const idb = new FakeIndexedDb();
    const ordinaryShell = new BrowserShellStateStore({
      indexedDB: idb.asFactory(),
      databaseName: PRODUCTION_DB,
    });
    await ordinaryShell.write(SLOT, ordinaryShellState());

    const leakingPreviewShell = new BrowserShellStateStore({
      indexedDB: idb.asFactory(),
      // The revert: the preview's world went elsewhere, its shell state did not.
      databaseName: PRODUCTION_DB,
    });
    await leakingPreviewShell.write(SLOT, previewShellState());

    const after = await ordinaryShell.read(SLOT);
    // The ordinary player's outfit, pins and journal are gone.
    expect(after!.personWardrobes["person-alice"]?.families.top).toBe(
      "candidate-choice",
    );
    expect(after!.pins).toHaveLength(0);
    expect(after!.journal.notes).toHaveLength(0);
  });
});
