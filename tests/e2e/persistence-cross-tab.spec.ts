import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * The cross-tab persistence boundary, in a real browser against real
 * IndexedDB.
 *
 * The audit found the two blockers here rather than in the suite, and said why:
 * the repository tests all built one store, so no slot was ever shared and no
 * write ever raced another. The Node tests now share a database and a
 * transaction lock, but a fake that models the browser is still a model of it.
 * The guarantee the repair rests on — that a read, a comparison and a write
 * inside one `readwrite` transaction cannot be interleaved by another context
 * on the same origin — belongs to IndexedDB itself, so it is worth asking
 * IndexedDB.
 *
 * Two `BrowserSaveStore` instances over one database is exactly what two tabs
 * are: `PlayerGame` constructs one per mount.
 *
 * The modules loaded below are the production ones, served by the same dev
 * server the rest of this suite runs against. Their shape is described here
 * rather than imported, because the end-to-end project is compiled apart from
 * `src`; what is under test is the behaviour of the real code at runtime, and a
 * signature that drifts fails at the call.
 */

const DATABASE = "cross-tab-acceptance-proof";

interface Harness {
  readonly databaseName: string;
  readonly repositoryPath: string;
  readonly simulationPath: string;
}

const harness: Harness = {
  databaseName: DATABASE,
  repositoryPath: "/src/presentation/browser-world-repository.ts",
  simulationPath: "/src/simulation/index.ts",
};

/** The store's surface, as this test uses it. */
interface StoreLike {
  newSaveId(world: unknown): string;
  save(world: unknown, saveId: string): Promise<{ status: string }>;
  load(saveId: string): Promise<Record<string, unknown> | null>;
  autosave(world: unknown, saveId: string): Promise<{ status: string }>;
  remove(saveId: string): Promise<boolean>;
  list(): Promise<{ saves: { saveId: string }[] }>;
  flush(): Promise<{ status: string }>;
}

interface RepositoryLike {
  BrowserSaveStore: new (options: { databaseName: string }) => StoreLike;
  readStoredRecord(value: unknown): { kind: string };
}

interface WorldLike {
  readonly id: string;
  readonly currentDate: string;
  readonly actionSequence: number;
  readonly personOrder: readonly string[];
}

interface SimulationLike {
  createDemoWorld(seed?: string): WorldLike;
  createWorldSnapshot(world: unknown): { snapshotId: string };
  recordWorldEvent(world: unknown, event: unknown): WorldLike;
}

async function freshPage(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    (databaseName: string) =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      }),
    DATABASE,
  );
}

test("only one of two tabs may call its own divergent world durable", async ({
  page,
}) => {
  await freshPage(page);

  const result = await page.evaluate(async (setup: Harness) => {
    const repository = (await import(
      /* @vite-ignore */ setup.repositoryPath
    )) as RepositoryLike;
    const simulation = (await import(
      /* @vite-ignore */ setup.simulationPath
    )) as SimulationLike;
    const { BrowserSaveStore, readStoredRecord } = repository;
    const { createDemoWorld, createWorldSnapshot, recordWorldEvent } =
      simulation;

    const contentId = (world: unknown) => createWorldSnapshot(world).snapshotId;
    const withEvent = (world: WorldLike, key: string) =>
      recordWorldEvent(world, {
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
          socialContext:
            "A canonical history write that does not advance time.",
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });

    const base = createDemoWorld("cross-tab-divergent");
    const world = {
      ...base,
      control: { kind: "person", personId: base.personOrder[0] },
    } as unknown as WorldLike;

    const options = { databaseName: setup.databaseName };
    const tabA = new BrowserSaveStore(options);
    const tabB = new BrowserSaveStore(options);
    const saveId = tabA.newSaveId(world);

    await tabA.save(world, saveId);
    // The ordinary way to get here: a second window on the same save.
    await tabB.load(saveId);

    const fromA = withEvent(world, "cross-tab:a");
    const fromB = withEvent(world, "cross-tab:b");

    const [resultA, resultB] = await Promise.all([
      tabA.autosave(fromA, saveId),
      tabB.autosave(fromB, saveId),
    ]);
    const flushA = await tabA.flush();
    const flushB = await tabB.flush();

    // Read the slot the way any other tab would, through a third store.
    const onlooker = new BrowserSaveStore(options);
    const stored = await onlooker.load(saveId);

    const rawRecord = await new Promise<unknown>((resolve, reject) => {
      const open = indexedDB.open(setup.databaseName, 1);
      open.onsuccess = () => {
        const read = open.result
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .get(saveId);
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      };
      open.onerror = () => reject(open.error);
    });

    return {
      sameActionSequence:
        fromA.actionSequence === world.actionSequence &&
        fromB.actionSequence === world.actionSequence,
      divergent: contentId(fromA) !== contentId(fromB),
      statuses: [resultA.status, resultB.status].sort(),
      flushes: [flushA.status, flushB.status].sort(),
      storedContent: stored === null ? null : contentId(stored),
      contentA: contentId(fromA),
      contentB: contentId(fromB),
      settledTabWroteDisk:
        stored !== null &&
        contentId(stored) ===
          (flushA.status === "settled" ? contentId(fromA) : contentId(fromB)),
      readStoredIsHealthy: readStoredRecord(rawRecord).kind === "healthy",
    };
  }, harness);

  // The premise: two different worlds carrying one action sequence.
  expect(result.sameActionSequence).toBe(true);
  expect(result.divergent).toBe(true);

  // The audited head told both tabs `saved` and kept only one of the worlds.
  expect(result.statuses).toEqual(["conflict", "saved"]);
  expect(result.flushes).toEqual(["settled", "unsaved"]);
  expect(result.storedContent).not.toBeNull();
  expect([result.contentA, result.contentB]).toContain(result.storedContent);
  expect(result.settledTabWroteDisk).toBe(true);
  expect(result.readStoredIsHealthy).toBe(true);
});

test("a deletion in one tab is durable against every other tab", async ({
  page,
}) => {
  await freshPage(page);

  const result = await page.evaluate(async (setup: Harness) => {
    const repository = (await import(
      /* @vite-ignore */ setup.repositoryPath
    )) as RepositoryLike;
    const simulation = (await import(
      /* @vite-ignore */ setup.simulationPath
    )) as SimulationLike;
    const { BrowserSaveStore } = repository;
    const { createDemoWorld, recordWorldEvent } = simulation;

    const withEvent = (world: WorldLike, key: string) =>
      recordWorldEvent(world, {
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
          socialContext:
            "A canonical history write that does not advance time.",
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });

    const base = createDemoWorld("cross-tab-deleted");
    const world = {
      ...base,
      control: { kind: "person", personId: base.personOrder[0] },
    } as unknown as WorldLike;

    const options = { databaseName: setup.databaseName };
    const tabA = new BrowserSaveStore(options);
    const tabB = new BrowserSaveStore(options);
    const saveId = tabA.newSaveId(world);

    await tabA.save(world, saveId);
    await tabB.load(saveId);
    const removed = await tabA.remove(saveId);

    // Violation one on the audited head: an unchanged world short-circuited
    // against the tab's own cache and reported `saved` about a record that no
    // longer existed anywhere.
    const unchanged = await tabB.autosave(world, saveId);
    const afterUnchanged = (await tabB.list()).saves.length;

    // Violation two: the next genuinely new world was an unconditional put,
    // and it brought the deleted save back.
    const after = withEvent(world, "cross-tab:after-delete");
    const resurrecting = await tabB.autosave(after, saveId);
    const explicit = await tabB.save(after, saveId);
    const afterResurrection = (await tabB.list()).saves.length;
    const flushB = (await tabB.flush()).status;

    // A fresh store, as a reload would build: the slot is gone there too.
    const reloaded = new BrowserSaveStore(options);
    const reloadedSaves = (await reloaded.list()).saves.length;
    const reloadedLoad = await reloaded.load(saveId);
    const reloadedWrite = await reloaded.save(after, saveId);

    // The slot is fenced; the life is not.
    const freshSlot = tabB.newSaveId(after);
    const kept = await tabB.save(after, freshSlot);

    return {
      removed,
      unchanged: unchanged.status,
      afterUnchanged,
      resurrecting: resurrecting.status,
      explicit: explicit.status,
      afterResurrection,
      flushB,
      reloadedSaves,
      reloadedLoadIsNull: reloadedLoad === null,
      reloadedWrite: reloadedWrite.status,
      kept: kept.status,
      keptSlots: (await tabB.list()).saves.map((save) => save.saveId),
      freshSlot,
    };
  }, harness);

  expect(result.removed).toBe(true);
  expect(result.unchanged).toBe("discarded");
  expect(result.afterUnchanged).toBe(0);
  expect(result.resurrecting).toBe("discarded");
  expect(result.explicit).toBe("discarded");
  expect(result.afterResurrection).toBe(0);
  expect(result.flushB).toBe("settled");

  // Deletion survives the process, not just the tab that asked for it.
  expect(result.reloadedSaves).toBe(0);
  expect(result.reloadedLoadIsNull).toBe(true);
  expect(result.reloadedWrite).toBe("discarded");

  // And keeping the life again is still allowed, in a slot of its own.
  expect(result.kept).toBe("saved");
  expect(result.keptSlots).toEqual([result.freshSlot]);
});
