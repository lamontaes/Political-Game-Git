import { ageOnDate } from "../simulation/dates";
import {
  currentLifeCutoff,
  householdMembershipsAt,
} from "../simulation/life-queries";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { factsForPerson, personName } from "../simulation/people";
import {
  createWorldSnapshot,
  deserializeWorld,
  serializeWorld,
} from "../simulation/serialization";
import type {
  EntityId,
  Person,
  SimulationMoment,
  World,
} from "../simulation/types";
import { createSaveId } from "./new-game-identity";

/**
 * Saved games in the browser.
 *
 * A save is the canonical world snapshot and nothing else. The summary shown
 * in the load list is derived from that snapshot every time it is read, so a
 * save can never drift into telling a different story from the world inside it.
 *
 * Three things the audit found wrong are fixed here by construction rather
 * than by care.
 *
 * *Ordering.* Only autosave used to be serialized, so a delete could land
 * between an autosave being asked for and being written, and the save came
 * back from the dead. Every operation that touches storage now goes through
 * one queue, and a delete fences the slot: a write that was already waiting
 * when the save was deleted is discarded instead of recreating it.
 *
 * *Acknowledgement.* A failed write used to advance the sequence the caller
 * treated as durable, so the retry never came and the work was silently lost.
 * A sequence is acknowledged only after the write actually lands.
 *
 * *Identity.* A save slot is not a world. One world can be kept twice — the
 * same life at two points, or a deliberate branch — and those are different
 * saves that must not overwrite each other, so a slot carries its own id and
 * merely records which world is inside it.
 *
 * And one damaged record no longer hides every healthy one: records are read
 * independently, and anything unreadable is quarantined with a reason the
 * player can act on rather than collapsing the whole list into "storage
 * unavailable".
 */

export const BROWSER_WORLD_RECORD_KIND = "political-life-browser-world";
/** Version 2 separated the save slot's identity from the world's. */
export const BROWSER_WORLD_RECORD_VERSION = 2;
/** Versions this build can read, after migration. */
export const READABLE_RECORD_VERSIONS: readonly number[] = [1, 2];

const DEFAULT_DATABASE_NAME = "political-life-worlds";
const DATABASE_VERSION = 1;
const STORE_NAME = "worlds";

export interface BrowserWorldResidenceSummary {
  readonly jurisdictionId: EntityId;
  readonly name: string;
}

export interface BrowserWorldSummary {
  /** The slot. Two saves of one world differ here and nowhere else. */
  readonly saveId: EntityId;
  /** The world inside the slot. */
  readonly worldId: EntityId;
  readonly snapshotId: EntityId;
  readonly snapshotFormatVersion: number;
  readonly worldSchemaVersion: number;
  readonly worldGeneratorVersion: string;
  readonly playerPersonId: EntityId;
  readonly playerName: string;
  readonly playerAge: number;
  readonly residence: BrowserWorldResidenceSummary | null;
  readonly currentMoment: SimulationMoment;
  readonly actionSequence: number;
  readonly createdAt: string;
  readonly savedAt: string;
  readonly lastPlayedAt: string;
}

export interface StoredBrowserWorldRecord {
  readonly kind: typeof BROWSER_WORLD_RECORD_KIND;
  readonly recordVersion: typeof BROWSER_WORLD_RECORD_VERSION;
  readonly saveId: EntityId;
  readonly metadata: BrowserWorldSummary;
  readonly payload: string;
}

/** Why a stored record could not be trusted, in the terms the code reasons in. */
export type SaveDefect =
  | "unreadable-record"
  | "unsupported-version"
  | "unreadable-world"
  | "altered-after-write"
  | "summary-disagrees";

export interface QuarantinedSave {
  /** Null when the record is damaged past the point of naming itself. */
  readonly saveId: EntityId | null;
  readonly defect: SaveDefect;
  /** Said the way a player should hear it. */
  readonly reason: string;
  /** True when a later build might be able to read it, so deleting is a choice. */
  readonly mightBeReadableLater: boolean;
  readonly savedAt: string | null;
}

export interface BrowserWorldListing {
  readonly saves: readonly BrowserWorldSummary[];
  readonly damaged: readonly QuarantinedSave[];
}

/** What became of a write that had to wait its turn. */
export type SaveOutcome =
  | { readonly status: "saved"; readonly summary: BrowserWorldSummary }
  | { readonly status: "discarded"; readonly reason: string };

/**
 * What became of an autosave, once the slot stopped moving.
 *
 * `saved` means this world or a newer one is durable. `discarded` means the
 * slot was deleted. `failed` means it is still only in memory, and says so
 * rather than letting the screen imply otherwise.
 */
export type AutosaveResult =
  | { readonly status: "saved" }
  | { readonly status: "discarded"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

/** What leaving found: either everything is down, or these slots are not. */
export interface FlushResult {
  readonly status: "settled" | "unsaved";
  readonly unsaved: readonly EntityId[];
  readonly reason: string | null;
}

export interface BrowserWorldRepositoryOptions {
  readonly indexedDB?: IDBFactory;
  readonly now?: () => Date;
  readonly databaseName?: string;
  /**
   * How many times one autosave is retried before the store reports it
   * failed. A rejected write is usually transient — a quota prompt, an aborted
   * transaction — and giving up on the first one is how progress was lost.
   */
  readonly autosaveAttempts?: number;
  /** Injectable so tests do not sit through the backoff. */
  readonly delay?: (milliseconds: number) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* The ordered command boundary. Everything that can conflict goes through it. */
/* -------------------------------------------------------------------------- */

export class BrowserSaveStore {
  readonly #factory: IDBFactory;
  readonly #now: () => Date;
  readonly #databaseName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  /** One queue. Ordering is the property, not a side effect of using it. */
  #tail: Promise<unknown> = Promise.resolve();
  /**
   * Slots the player has deleted. A deleted slot stays deleted: any write to
   * it is discarded, whether it was asked for before the delete or after it
   * while the delete was still landing. Keeping a life again takes a new slot,
   * so nothing legitimate is blocked by this.
   */
  readonly #deleted = new Set<string>();
  /** Only advanced by a write that actually landed. */
  readonly #acknowledged = new Map<string, number>();
  #slotCounter = 0;
  readonly #attempts: number;
  readonly #delay: (milliseconds: number) => Promise<void>;

  /**
   * The newest world each slot owes to storage, and one drain per slot working
   * it off. This is the whole autosave contract, and it lives here rather than
   * in a component: the caller says what the newest world is, and the store is
   * answerable for it reaching disk.
   *
   * What it replaces was a boolean in a React ref. While one write was in
   * flight the next world was dropped on the floor — and because a ref does not
   * re-render, nothing ever came back for it. A player could take an action,
   * see it acknowledged, leave, and find it gone. Coalescing is right; losing
   * the newest revision is not, and the difference is that a queue remembers
   * what it skipped.
   */
  readonly #pending = new Map<string, World>();
  readonly #settled = new Map<string, Promise<void>>();
  readonly #failures = new Map<string, string>();

  constructor(options: BrowserWorldRepositoryOptions = {}) {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) {
      throw new Error("Saved games are unavailable in this browser.");
    }
    const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    if (databaseName.trim().length === 0) {
      throw new Error("The saved-game store needs a name.");
    }
    this.#factory = factory;
    this.#now = options.now ?? (() => new Date());
    this.#databaseName = databaseName;
    this.#attempts = Math.max(1, options.autosaveAttempts ?? 3);
    this.#delay =
      options.delay ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  /**
   * A new slot for this world. Called twice for one world it gives two slots,
   * because keeping a life twice is a thing a player is allowed to do.
   *
   * The discriminator used to be the clock plus a counter that started at zero
   * in every store instance, so two tabs keeping the same world in the same
   * millisecond each made their "first" slot and got the same id — one game
   * writing over another. Entropy comes from the browser's random source now,
   * and the nonce is carried in the id alongside the hash rather than being
   * folded into it, so two different nonces cannot produce one id however the
   * hash behaves.
   */
  newSaveId(world: World): EntityId {
    this.#slotCounter += 1;
    const nonce = randomSlotNonce();
    return `${createSaveId(
      world.id,
      `${nowTimestamp(this.#now)}:${this.#slotCounter}:${nonce}`,
    )}_${nonce}` as EntityId;
  }

  /**
   * The last action sequence written durably for a slot, or null if none has
   * been. A caller decides whether to write again from this rather than from
   * what it hoped had happened.
   */
  acknowledgedSequence(saveId: EntityId): number | null {
    return this.#acknowledged.get(saveId) ?? null;
  }

  save(world: World, saveId: EntityId): Promise<SaveOutcome> {
    return this.#enqueue(async () => {
      if (this.#deleted.has(saveId)) {
        // Writing this now would bring back a save the player got rid of.
        return {
          status: "discarded",
          reason: "This saved game was deleted, so it was not written again.",
        } as const;
      }
      const existing = await this.#get(saveId);
      const prior = existing === undefined ? null : readStoredRecord(existing);
      const priorMetadata =
        prior?.kind === "healthy" ? prior.record.metadata : null;
      const timestamp = latestTimestamp(
        nowTimestamp(this.#now),
        priorMetadata?.savedAt,
        priorMetadata?.lastPlayedAt,
      );
      const record = createBrowserWorldRecord(
        world,
        timestamp,
        priorMetadata?.createdAt ?? timestamp,
        saveId,
      );
      await this.#put(record);
      // Only now is anything durable, and only now does the sequence move.
      this.#acknowledged.set(saveId, world.actionSequence);
      return {
        status: "saved",
        summary: cloneSummary(record.metadata),
      } as const;
    });
  }

  load(saveId: EntityId): Promise<World | null> {
    return this.#enqueue(async () => {
      if (this.#deleted.has(saveId)) return null;
      const raw = await this.#get(saveId);
      if (raw === undefined) return null;
      const read = readStoredRecord(raw);
      if (read.kind !== "healthy") {
        throw new Error(read.quarantine.reason);
      }
      const record = read.record;
      if (record.saveId !== saveId) {
        throw new Error("This saved game does not match the one asked for.");
      }
      const world = deserializeWorld(record.payload);
      const lastPlayedAt = latestTimestamp(
        nowTimestamp(this.#now),
        record.metadata.savedAt,
        record.metadata.lastPlayedAt,
      );
      // The last-played stamp is part of the same ordered stream, so it cannot
      // land on top of a newer save written a moment ago.
      await this.#put({
        ...record,
        metadata: { ...record.metadata, lastPlayedAt },
      });
      this.#acknowledged.set(saveId, world.actionSequence);
      return world;
    });
  }

  list(): Promise<BrowserWorldListing> {
    return this.#enqueue(async () => {
      const saves: BrowserWorldSummary[] = [];
      const damaged: QuarantinedSave[] = [];
      // Each record is judged on its own. One damaged save used to take the
      // whole list down with it, which told a player their storage was broken
      // when in fact every other game was fine.
      for (const raw of await this.#getAll()) {
        const read = readStoredRecord(raw);
        if (read.kind === "healthy")
          saves.push(cloneSummary(read.record.metadata));
        else damaged.push(read.quarantine);
      }
      return {
        saves: saves.sort(compareSummaries),
        damaged: damaged.sort((left, right) =>
          (right.savedAt ?? "").localeCompare(left.savedAt ?? ""),
        ),
      };
    });
  }

  async mostRecent(): Promise<BrowserWorldSummary | null> {
    return (await this.list()).saves[0] ?? null;
  }

  /** Removes a slot and fences it, so nothing already in flight recreates it. */
  remove(saveId: EntityId): Promise<boolean> {
    // Marked before the queue runs, so a write that is already waiting sees it.
    this.#deleted.add(saveId);
    const acknowledged = this.#acknowledged.get(saveId);
    this.#acknowledged.delete(saveId);
    return this.#enqueue(async () => {
      try {
        const existing = await this.#get(saveId);
        if (existing === undefined) return false;
        await this.#delete(saveId);
        // Gone for good: nothing is owed to a slot that no longer exists.
        this.#pending.delete(saveId);
        this.#failures.delete(saveId);
        return true;
      } catch (error: unknown) {
        // The fence exists to stop a queued write resurrecting a save that is
        // gone. Nothing is gone here, so leaving the fence up would block the
        // slot for the rest of the session and then lose it at the next
        // restart, when the tombstone is only in memory. Put it back, pick up
        // anything the fence made a drain abandon, and let the caller say what
        // happened.
        this.#deleted.delete(saveId);
        if (acknowledged !== undefined) {
          this.#acknowledged.set(saveId, acknowledged);
        }
        if (this.#pending.has(saveId)) void this.#ensureDrain(saveId);
        throw error;
      }
    });
  }

  /**
   * Hands the store the newest world for a slot and holds it answerable for
   * writing it.
   *
   * Calling this while an earlier write is still in flight is normal and is
   * the case that used to lose data: the newer world replaces the older one in
   * the queue and is written as soon as the drain comes back round. The
   * returned promise settles once the slot is at or beyond this world, so a
   * caller can report honestly rather than optimistically.
   */
  autosave(world: World, saveId: EntityId): Promise<AutosaveResult> {
    if (this.#deleted.has(saveId)) {
      return Promise.resolve({
        status: "discarded",
        reason: "This saved game was deleted, so it was not written again.",
      } as const);
    }
    const sequence = world.actionSequence;
    if (
      this.#acknowledged.get(saveId) === sequence &&
      !this.#pending.has(saveId)
    ) {
      return Promise.resolve({ status: "saved" } as const);
    }
    this.#pending.set(saveId, world);
    this.#failures.delete(saveId);
    const drained = this.#ensureDrain(saveId);
    return drained.then(() => this.#resultFor(saveId, sequence));
  }

  #resultFor(saveId: EntityId, sequence: number): AutosaveResult {
    if (this.#deleted.has(saveId)) {
      return {
        status: "discarded",
        reason: "This saved game was deleted, so it was not written again.",
      } as const;
    }
    const acknowledged = this.#acknowledged.get(saveId) ?? -1;
    if (acknowledged >= sequence) return { status: "saved" } as const;
    return {
      status: "failed",
      reason:
        this.#failures.get(saveId) ?? "This game could not be saved just now.",
    } as const;
  }

  /**
   * Starts, or joins, the one drain working this slot off.
   *
   * The tail re-checks what is owed after clearing itself, which closes the
   * gap where a world handed in as a drain was finishing could have been left
   * with nobody coming back for it.
   */
  #ensureDrain(saveId: EntityId): Promise<void> {
    const running = this.#settled.get(saveId);
    if (running) return running;
    const drain = this.#drain(saveId)
      .catch(() => undefined)
      .then(() => {
        this.#settled.delete(saveId);
      })
      .then(() =>
        this.#pending.has(saveId) && !this.#failures.has(saveId)
          ? this.#ensureDrain(saveId)
          : undefined,
      );
    this.#settled.set(saveId, drain);
    return drain;
  }

  async #drain(saveId: EntityId): Promise<void> {
    while (this.#pending.has(saveId)) {
      const world = this.#pending.get(saveId)!;
      if (this.#deleted.has(saveId)) {
        this.#pending.delete(saveId);
        return;
      }
      if ((this.#acknowledged.get(saveId) ?? -1) >= world.actionSequence) {
        // A newer world landed while this one waited; nothing is owed for it.
        if (this.#pending.get(saveId) === world) this.#pending.delete(saveId);
        continue;
      }
      let written = false;
      for (let attempt = 1; attempt <= this.#attempts; attempt += 1) {
        try {
          const outcome = await this.save(world, saveId);
          if (outcome.status === "discarded") {
            this.#pending.delete(saveId);
            return;
          }
          written = true;
          break;
        } catch (error: unknown) {
          this.#failures.set(
            saveId,
            error instanceof Error
              ? error.message
              : "This game could not be saved just now.",
          );
          if (attempt === this.#attempts) break;
          // Short and increasing: a quota prompt or an aborted transaction is
          // usually over by the next try, and hammering it is not help.
          await this.#delay(attempt * 25);
        }
      }
      // Whatever happened, this world is no longer the newest thing owed
      // unless a newer one arrived while it was being written.
      if (written && this.#pending.get(saveId) === world) {
        this.#pending.delete(saveId);
        this.#failures.delete(saveId);
      }
      if (!written) return;
    }
  }

  /**
   * Waits for the store to stop owing anything, and says what it still owes.
   *
   * Leaving used to call a flush that waited only for writes already enqueued
   * and swallowed their rejections, so a player could leave on top of a world
   * that never reached disk and be told nothing. This drains what is owed,
   * gives a failed slot one more real attempt, and reports what did not land.
   */
  async flush(): Promise<FlushResult> {
    const owed = [...this.#pending.keys()] as EntityId[];
    // One more genuine attempt on the way out, rather than reporting a stale
    // failure the player never had a chance to survive.
    for (const saveId of owed) this.#failures.delete(saveId);
    const drains = owed.map((saveId) => this.#ensureDrain(saveId));
    const running = [...this.#settled.values()];
    await Promise.all(
      [...drains, ...running].map((done) => done.catch(() => undefined)),
    );
    await this.#tail.catch(() => undefined);
    const unsaved = [...this.#pending.keys()] as EntityId[];
    if (unsaved.length === 0) {
      return { status: "settled", unsaved, reason: null };
    }
    return {
      status: "unsaved",
      unsaved,
      reason:
        this.#failures.get(unsaved[0]!) ??
        "This game could not be saved just now.",
    };
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(operation, operation);
    this.#tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #database(): Promise<IDBDatabase> {
    if (!this.#databasePromise) {
      this.#databasePromise = openDatabase(
        this.#factory,
        this.#databaseName,
      ).catch((error: unknown) => {
        this.#databasePromise = null;
        throw error;
      });
    }
    return this.#databasePromise;
  }

  async #get(saveId: EntityId): Promise<unknown | undefined> {
    const database = await this.#database();
    return runRequest(database, "readonly", (store) => store.get(saveId));
  }

  async #getAll(): Promise<readonly unknown[]> {
    const database = await this.#database();
    return runRequest(database, "readonly", (store) => store.getAll());
  }

  async #put(record: StoredBrowserWorldRecord): Promise<void> {
    const database = await this.#database();
    await runRequest(database, "readwrite", (store) => store.put(record));
  }

  async #delete(saveId: EntityId): Promise<void> {
    const database = await this.#database();
    await runRequest(database, "readwrite", (store) => store.delete(saveId));
  }
}

export function createBrowserWorldRecord(
  world: World,
  savedAt: string,
  createdAt: string = savedAt,
  saveId: EntityId = world.id,
): StoredBrowserWorldRecord {
  assertTimestamp(createdAt, "creation time");
  assertTimestamp(savedAt, "saved time");
  if (createdAt > savedAt) {
    throw new Error(
      "A saved game cannot have been created after it was saved.",
    );
  }
  const player = controlledPlayer(world);
  const snapshot = createWorldSnapshot(world);
  const summary: BrowserWorldSummary = {
    saveId,
    worldId: world.id,
    snapshotId: snapshot.snapshotId,
    snapshotFormatVersion: snapshot.formatVersion,
    worldSchemaVersion: world.schemaVersion,
    worldGeneratorVersion: world.generatorVersion,
    playerPersonId: player.id,
    playerName: personName(player),
    playerAge: ageOnDate(player.birthDate, world.currentDate),
    residence: currentResidence(world, player),
    currentMoment: { ...world.currentMoment },
    actionSequence: world.actionSequence,
    createdAt,
    savedAt,
    lastPlayedAt: savedAt,
  };
  return {
    kind: BROWSER_WORLD_RECORD_KIND,
    recordVersion: BROWSER_WORLD_RECORD_VERSION,
    saveId,
    metadata: summary,
    payload: serializeWorld(world),
  };
}

type ReadRecord =
  | { readonly kind: "healthy"; readonly record: StoredBrowserWorldRecord }
  | { readonly kind: "damaged"; readonly quarantine: QuarantinedSave };

/**
 * Reads one stored record, saying what is wrong with it rather than throwing
 * the whole list away.
 *
 * The version numbers a record carries are checked by trying to read the world
 * inside it, not by matching literals. A save whose schema this build does not
 * know is quarantined as possibly-readable-later rather than reported as
 * corrupt, because the two call for different things from a player.
 */
export function readStoredRecord(value: unknown): ReadRecord {
  const damaged = (
    saveId: EntityId | null,
    defect: SaveDefect,
    reason: string,
    mightBeReadableLater = false,
    savedAt: string | null = null,
  ): ReadRecord => ({
    kind: "damaged",
    quarantine: { saveId, defect, reason, mightBeReadableLater, savedAt },
  });

  if (!isRecord(value)) {
    return damaged(
      null,
      "unreadable-record",
      "One saved game could not be read at all, and has been set aside.",
    );
  }
  const saveId =
    typeof value.saveId === "string" ? (value.saveId as EntityId) : null;
  const savedAt =
    isRecord(value.metadata) && typeof value.metadata.savedAt === "string"
      ? value.metadata.savedAt
      : null;

  if (value.kind !== BROWSER_WORLD_RECORD_KIND) {
    return damaged(
      saveId,
      "unreadable-record",
      "One saved game is not in a form this game recognises, and has been set aside.",
      false,
      savedAt,
    );
  }
  if (
    typeof value.recordVersion !== "number" ||
    !READABLE_RECORD_VERSIONS.includes(value.recordVersion)
  ) {
    return damaged(
      saveId,
      "unsupported-version",
      "One saved game was written by a newer version of the game. It has been kept, not deleted.",
      true,
      savedAt,
    );
  }
  if (typeof value.payload !== "string") {
    return damaged(
      saveId,
      "unreadable-record",
      "One saved game is missing the world inside it, and has been set aside.",
      false,
      savedAt,
    );
  }

  let world: World;
  try {
    world = deserializeWorld(value.payload);
  } catch {
    return damaged(
      saveId,
      "unreadable-world",
      "One saved game holds a world this version of the game cannot open. It has been kept, not deleted.",
      true,
      savedAt,
    );
  }
  if (value.payload !== serializeWorld(world)) {
    return damaged(
      saveId,
      "altered-after-write",
      "One saved game was changed after it was written, and has been set aside.",
      false,
      savedAt,
    );
  }

  const migrated = migrateRecord(value, world);
  if (migrated === null) {
    return damaged(
      saveId,
      "summary-disagrees",
      "One saved game's summary does not match the world inside it, and has been set aside.",
      false,
      savedAt,
    );
  }
  return { kind: "healthy", record: migrated };
}

/**
 * Brings a stored record up to the current shape, or refuses it.
 *
 * Version 1 records used the world's id as the slot's id, which is exactly the
 * conflation this version fixes; they migrate by keeping that id as the slot's
 * and naming the world separately. Nothing about the world itself changes, so
 * a migrated save loads the same game it always did.
 */
function migrateRecord(
  value: Record<string, unknown>,
  world: World,
): StoredBrowserWorldRecord | null {
  if (typeof value.saveId !== "string") return null;
  const saveId = value.saveId as EntityId;
  const metadata = value.metadata;
  if (!isRecord(metadata)) return null;
  if (!validTimestamps(metadata)) return null;

  const expected = createBrowserWorldRecord(
    world,
    metadata.savedAt as string,
    metadata.createdAt as string,
    saveId,
  ).metadata;
  const actual: BrowserWorldSummary = {
    ...(metadata as unknown as BrowserWorldSummary),
    saveId,
    // A version 1 record predates the distinction and always held one world.
    worldId:
      typeof metadata.worldId === "string"
        ? (metadata.worldId as EntityId)
        : saveId,
  };
  if (!sameCanonicalMetadata(actual, expected)) return null;

  return {
    kind: BROWSER_WORLD_RECORD_KIND,
    recordVersion: BROWSER_WORLD_RECORD_VERSION,
    saveId,
    metadata: cloneSummary({ ...actual, lastPlayedAt: actual.lastPlayedAt }),
    payload: value.payload as string,
  };
}

/** Kept for callers that want an exception rather than a quarantine record. */
export function validateBrowserWorldRecord(
  value: unknown,
): StoredBrowserWorldRecord {
  const read = readStoredRecord(value);
  if (read.kind !== "healthy") throw new Error(read.quarantine.reason);
  return read.record;
}

function validTimestamps(metadata: Record<string, unknown>): boolean {
  const values = [metadata.createdAt, metadata.savedAt, metadata.lastPlayedAt];
  for (const value of values) {
    if (
      typeof value !== "string" ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value
    ) {
      return false;
    }
  }
  const [createdAt, savedAt, lastPlayedAt] = values as [string, string, string];
  return createdAt <= savedAt && savedAt <= lastPlayedAt;
}

function currentResidence(
  world: World,
  player: Person,
): BrowserWorldResidenceSummary | null {
  const memberships = householdMembershipsAt(
    world,
    player.id,
    currentLifeCutoff(world),
  )
    .filter((membership) => membership.location !== null)
    .sort((left, right) => {
      const leftDate = left.location?.effectiveAt ?? left.membership.startedAt;
      const rightDate =
        right.location?.effectiveAt ?? right.membership.startedAt;
      return (
        rightDate.localeCompare(leftDate) ||
        right.membership.sequence - left.membership.sequence ||
        left.membership.id.localeCompare(right.membership.id)
      );
    });
  const householdJurisdictionId = memberships[0]?.location?.jurisdictionId;
  if (householdJurisdictionId) {
    return residenceSummary(world, householdJurisdictionId);
  }

  const residenceFact = factsForPerson(player)
    .filter(
      (fact) =>
        fact.kind === "residence" &&
        fact.occurredAt <= world.currentDate &&
        (fact.endedAt === null || fact.endedAt >= world.currentDate),
    )
    .sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        left.stableKey.localeCompare(right.stableKey),
    )[0];
  return residenceSummary(
    world,
    residenceFact?.jurisdictionId ?? player.homeJurisdictionId,
  );
}

/** Prefers the place provider's player-facing name over the raw jurisdiction record. */
function residenceSummary(
  world: World,
  jurisdictionId: EntityId,
): BrowserWorldResidenceSummary | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return jurisdiction
    ? {
        jurisdictionId: jurisdiction.id,
        name:
          lifePlaceByJurisdictionId(jurisdictionId)?.displayName ??
          jurisdiction.name,
      }
    : null;
}

function controlledPlayer(world: World): Person {
  if (world.control.kind !== "person") {
    throw new Error("A saved game needs a character the player controls.");
  }
  const player = world.people[world.control.personId];
  if (!player) {
    throw new Error("The saved game's character is missing from its world.");
  }
  return player;
}

function sameCanonicalMetadata(
  actual: BrowserWorldSummary,
  expected: BrowserWorldSummary,
): boolean {
  return (
    actual.saveId === expected.saveId &&
    actual.worldId === expected.worldId &&
    actual.snapshotId === expected.snapshotId &&
    actual.snapshotFormatVersion === expected.snapshotFormatVersion &&
    actual.worldSchemaVersion === expected.worldSchemaVersion &&
    actual.worldGeneratorVersion === expected.worldGeneratorVersion &&
    actual.playerPersonId === expected.playerPersonId &&
    actual.playerName === expected.playerName &&
    actual.playerAge === expected.playerAge &&
    actual.residence?.jurisdictionId === expected.residence?.jurisdictionId &&
    actual.residence?.name === expected.residence?.name &&
    actual.currentMoment?.date === expected.currentMoment.date &&
    actual.currentMoment?.minuteOfDay === expected.currentMoment.minuteOfDay &&
    actual.currentMoment?.timeZone === expected.currentMoment.timeZone &&
    actual.currentMoment?.utcOffsetMinutes ===
      expected.currentMoment.utcOffsetMinutes &&
    actual.actionSequence === expected.actionSequence
  );
}

function cloneSummary(summary: BrowserWorldSummary): BrowserWorldSummary {
  return {
    ...summary,
    residence: summary.residence ? { ...summary.residence } : null,
    currentMoment: { ...summary.currentMoment },
  };
}

function compareSummaries(
  left: BrowserWorldSummary,
  right: BrowserWorldSummary,
): number {
  return (
    right.lastPlayedAt.localeCompare(left.lastPlayedAt) ||
    right.savedAt.localeCompare(left.savedAt) ||
    left.saveId.localeCompare(right.saveId)
  );
}

/**
 * 128 bits from the browser's random source, hex encoded. Falls back only if a
 * browser has no `crypto`, and says so rather than pretending the fallback is
 * as good.
 */
function randomSlotNonce(): string {
  const source = globalThis.crypto;
  if (source && typeof source.getRandomValues === "function") {
    const bytes = source.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }
  // Weaker, and only reachable where the platform offers nothing better.
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  ).join("");
}

function nowTimestamp(now: () => Date): string {
  const date = now();
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error("The clock returned a time the game cannot use.");
  }
  return date.toISOString();
}

function latestTimestamp(
  timestamp: string,
  ...candidates: readonly (string | undefined)[]
): string {
  let latest = timestamp;
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate > latest) latest = candidate;
  }
  return latest;
}

function assertTimestamp(
  value: unknown,
  label: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`This saved game's ${label} is unreadable.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function openDatabase(
  factory: IDBFactory,
  databaseName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "saveId" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(
        new Error("Saved games could not be opened.", { cause: request.error }),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Saved games are in use by another tab. Close it and try again.",
        ),
      );
  });
}

function runRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let result: T;
    let requestCompleted = false;
    let transactionCompleted = false;
    const finish = () => {
      if (requestCompleted && transactionCompleted) resolve(result);
    };
    let request: IDBRequest<T>;
    try {
      request = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      reject(new Error("The saved game could not be read.", { cause: error }));
      return;
    }
    request.onsuccess = () => {
      result = request.result;
      requestCompleted = true;
      finish();
    };
    request.onerror = () =>
      reject(
        new Error("The saved game could not be read.", {
          cause: request.error,
        }),
      );
    transaction.oncomplete = () => {
      transactionCompleted = true;
      finish();
    };
    transaction.onerror = () =>
      reject(new Error("Saving did not finish.", { cause: transaction.error }));
    transaction.onabort = () =>
      reject(
        new Error("Saving was interrupted.", { cause: transaction.error }),
      );
  });
}
