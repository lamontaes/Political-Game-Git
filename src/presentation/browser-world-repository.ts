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
  worldContentId,
} from "../simulation/serialization";
import type {
  EntityId,
  Person,
  SimulationMoment,
  World,
} from "../simulation/types";
import {
  BROWSER_WORLD_RECORD_KIND,
  BROWSER_WORLD_RECORD_VERSION,
  BROWSER_WORLD_TOMBSTONE_KIND,
  READABLE_RECORD_VERSIONS,
  SLOT_MESSAGES,
  decideWrite,
  readSlotState,
} from "./browser-world-repository-protocol";
import { createSaveId } from "./new-game-identity";

export {
  BROWSER_WORLD_RECORD_KIND,
  BROWSER_WORLD_RECORD_VERSION,
  BROWSER_WORLD_TOMBSTONE_KIND,
  READABLE_RECORD_VERSIONS,
};

/**
 * Saved games in the browser.
 *
 * A save is the canonical world snapshot and nothing else. The summary shown
 * in the load list is derived from that snapshot every time it is read, so a
 * save can never drift into telling a different story from the world inside it.
 *
 * What the audits found wrong is fixed here by construction rather than by
 * care.
 *
 * *Ordering.* Only autosave used to be serialized, so a delete could land
 * between an autosave being asked for and being written, and the save came
 * back from the dead. Every operation that touches storage goes through one
 * queue.
 *
 * *Acknowledgement.* A failed write used to advance what the caller treated as
 * durable, so the retry never came and the work was silently lost. Nothing is
 * acknowledged until the write actually lands.
 *
 * *Revision identity.* Durability is decided by the content of the world and
 * by the store's own request order — never by `World.actionSequence`. That
 * number counts advanced time, not world revisions: a conversation turn, a
 * formative beat or a legislative step writes canonical history and leaves it
 * exactly where it was. A store that read it as a revision number saw the
 * player's new world carrying the old number, called it already durable, and
 * dropped it.
 *
 * *Whose truth.* This is the one the last audit was about, and it is the
 * reason the code below looks the way it does. Every tab builds its own store
 * over the same IndexedDB database, so a store's memory is a belief about a
 * shared thing, not a fact about it. Believing it was two silent data-loss
 * bugs: two tabs each wrote an unconditional `put` and were each told `saved`,
 * losing one canonical world; and a deletion lived in a `Set` inside one
 * JavaScript object, so another tab neither saw it nor was stopped from
 * writing the slot back into existence.
 *
 * So durability is now decided from the record on disk, inside one IndexedDB
 * transaction that reads the slot, compares it, and writes — which the browser
 * serializes across tabs. Every acknowledgement this store gives means the
 * intended world is represented in the shared store, not that this tab
 * finished a request. A writer whose belief about the slot is stale is told
 * so, by name, instead of being allowed to overwrite work it never saw. The
 * details of that protocol are in `browser-world-repository-protocol.ts`.
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

const DEFAULT_DATABASE_NAME = "political-life-worlds";
const DATABASE_VERSION = 1;
const STORE_NAME = "worlds";
const WRITE_FAILED = "This game could not be saved just now.";

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
  /**
   * The slot's revision, shared by every tab. It moves when the world in the
   * slot changes and stays put when only the last-played stamp does, so
   * opening a save does not take the slot away from a tab that is playing it.
   */
  readonly generation: number;
  readonly metadata: BrowserWorldSummary;
  readonly payload: string;
}

/** The durable proof that a slot was deleted, kept at the slot's own key. */
export interface StoredBrowserWorldTombstone {
  readonly kind: typeof BROWSER_WORLD_TOMBSTONE_KIND;
  readonly recordVersion: typeof BROWSER_WORLD_RECORD_VERSION;
  readonly saveId: EntityId;
  readonly generation: number;
  readonly deletedAt: string;
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

/**
 * What became of a write.
 *
 * `conflict` is the one the cross-tab repair added, and it is deliberately not
 * a failure: nothing went wrong with storage, the slot simply is not this
 * store's to write. Collapsing it into `failed` would invite a retry that can
 * only ever destroy the other tab's world.
 */
export type SaveOutcome =
  | { readonly status: "saved"; readonly summary: BrowserWorldSummary }
  | { readonly status: "discarded"; readonly reason: string }
  | { readonly status: "conflict"; readonly reason: string };

/**
 * What became of an autosave, once the slot stopped moving.
 *
 * `saved` means this world, or a newer one from this store, is durable in the
 * shared database. `discarded` means the slot was deleted — here or in another
 * tab, and either way for good. `conflict` means another tab holds the slot.
 * `failed` means the world is still only in memory, and says so rather than
 * letting the screen imply otherwise.
 */
export type AutosaveResult =
  | { readonly status: "saved" }
  | { readonly status: "discarded"; readonly reason: string }
  | { readonly status: "conflict"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

/** Why a slot is not settled, in the terms a shell has to act on. */
export type UnsavedReason = "pending" | "failed" | "conflict";

export interface UnsavedSlot {
  readonly saveId: EntityId;
  readonly kind: UnsavedReason;
  readonly reason: string;
}

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

/**
 * A world a slot owes to storage, and the store's own name for the asking.
 *
 * `content` is what makes it that world; `ordinal` is where the request sits
 * in the store's order. Both belong to persistence. Neither is borrowed from
 * the simulation, which is the whole point.
 */
interface PendingWrite {
  readonly world: World;
  readonly content: EntityId;
  readonly ordinal: number;
}

/** What one conditional write decided, and the record it decided about. */
interface WriteSettlement {
  readonly verdict: ReturnType<typeof decideWrite>;
  readonly record?: StoredBrowserWorldRecord;
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
   * Slots known to hold a tombstone. This is a cache of a durable fact, not
   * the fact itself — which is the distinction the audit found missing. A
   * deleted slot is deleted because the database says so; this only saves the
   * round trip, and is filled in from any tombstone this store meets, so a tab
   * that never asked for the deletion still learns about it.
   */
  readonly #deleted = new Set<string>();
  /**
   * A delete this store has asked for and not yet had confirmed.
   *
   * Provisional, and treated as provisional: it turns away an explicit save
   * asked for after the player said "delete", because that is the player's
   * older word, but it never destroys a world already owed to a slot. Doing
   * that was how a failed delete lost an autosave — the fence went up, the
   * drain threw the owed write away, the delete then failed, and the rollback
   * found nothing left to restart.
   */
  readonly #removing = new Set<string>();
  readonly #removals = new Map<string, Promise<boolean>>();
  /**
   * The generation this store last saw for a slot, and therefore the one it
   * claims to be replacing when it writes.
   *
   * Set by opening a save and by writes that landed — never by listing, which
   * is a glance at the shelf and not a claim on anything, and never by a
   * refused write, because adopting the generation that refused you is just
   * the overwrite again with an extra step.
   */
  readonly #observed = new Map<string, number>();
  /**
   * What is actually on disk for a slot, named by the content identity of the
   * world rather than by anything the domain happens to count.
   *
   * Set only from a verdict a transaction reached against the stored record.
   */
  readonly #durableContent = new Map<string, EntityId>();
  /**
   * The newest persistence request the slot has satisfied.
   *
   * Ordering is the store's own, not the domain's. A caller asking whether its
   * world reached disk is answered by "this exact content is durable, or a
   * request made after yours is" — which is what it actually needs to know.
   */
  readonly #durableRequest = new Map<string, number>();
  /** Monotonic, store-owned, and the only source of persistence order. */
  #requestCounter = 0;
  /** Content identity is a hash of the whole world; compute it once per world. */
  readonly #contentIds = new WeakMap<World, EntityId>();
  #slotCounter = 0;
  readonly #attempts: number;
  readonly #delay: (milliseconds: number) => Promise<void>;

  /**
   * The newest world each slot owes to storage, and one drain per slot working
   * it off. This is the whole autosave contract, and it lives here rather than
   * in a component: the caller says what the newest world is, and the store is
   * answerable for it reaching disk.
   */
  readonly #pending = new Map<string, PendingWrite>();
  readonly #settled = new Map<string, Promise<void>>();
  readonly #failures = new Map<string, string>();
  /** Slots another writer holds. Not retried, and not quietly forgotten. */
  readonly #conflicts = new Map<string, string>();

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
   * The content identity of the world this store has confirmed durable in a
   * slot, or null if it has confirmed none. Every value here was reached by
   * comparing against the stored record, not by remembering a request.
   */
  durableContentId(saveId: EntityId): EntityId | null {
    return this.#durableContent.get(saveId) ?? null;
  }

  /**
   * The newest persistence request this slot has satisfied, or null if none
   * has. Store-owned and monotonic, so "my request or a newer one is durable"
   * is a comparison rather than a guess.
   */
  durableRequestOrdinal(saveId: EntityId): number | null {
    return this.#durableRequest.get(saveId) ?? null;
  }

  /** The slot generation this store believes it holds, or null if none. */
  observedGeneration(saveId: EntityId): number | null {
    return this.#observed.get(saveId) ?? null;
  }

  /**
   * Every slot this store owes something to, and why.
   *
   * The shell needs this because a tab can be closed, and closing it destroys
   * everything that is only in memory. There was no way to ask before, so
   * there was no guard: a player could act, watch a write fail, close the
   * window, and lose the world with nothing having said a word. What is
   * reported is deliberately wider than "a write is in flight" — a world that
   * failed, and a slot lost to another tab, are both work the player has not
   * got anywhere durable.
   */
  unsavedWork(): readonly UnsavedSlot[] {
    const unsaved: UnsavedSlot[] = [];
    for (const saveId of this.#pending.keys()) {
      const failure = this.#failures.get(saveId);
      unsaved.push({
        saveId: saveId as EntityId,
        kind: failure === undefined ? "pending" : "failed",
        reason: failure ?? WRITE_FAILED,
      });
    }
    for (const [saveId, reason] of this.#conflicts) {
      if (this.#pending.has(saveId)) continue;
      unsaved.push({ saveId: saveId as EntityId, kind: "conflict", reason });
    }
    return unsaved;
  }

  /**
   * Says this store is no longer writing to a slot, and stops it being owed.
   *
   * The honest way out of a conflict. A tab that lost a slot cannot write it
   * and must not pretend the loss did not happen, so the shell detaches the
   * life from that slot and offers to keep it somewhere new; this is how the
   * shell says it has done so. Without it, leaving would be refused forever
   * over a slot nothing could ever write.
   */
  releaseSlot(saveId: EntityId): void {
    this.#pending.delete(saveId);
    this.#failures.delete(saveId);
    this.#conflicts.delete(saveId);
    this.#observed.delete(saveId);
    this.#durableContent.delete(saveId);
    this.#durableRequest.delete(saveId);
  }

  /** One hash of one world, kept so the drain does not recompute it. */
  #contentId(world: World): EntityId {
    const cached = this.#contentIds.get(world);
    if (cached !== undefined) return cached;
    const identity = worldContentId(world);
    this.#contentIds.set(world, identity);
    return identity;
  }

  save(world: World, saveId: EntityId): Promise<SaveOutcome> {
    return this.#enqueue(async () => {
      if (this.#deleted.has(saveId) || this.#removing.has(saveId)) {
        // Writing this now would bring back a save the player got rid of.
        return {
          status: "discarded",
          reason: SLOT_MESSAGES.deleted,
        } as const;
      }
      return this.#writeSlot(prepareWorldRecord(world), saveId);
    });
  }

  /**
   * One conditional write, decided against the record on disk.
   *
   * The world is prepared before the transaction opens, so the only work
   * inside the lock every tab shares is a comparison and a put.
   */
  async #writeSlot(
    prepared: PreparedRecord,
    saveId: EntityId,
  ): Promise<SaveOutcome> {
    const settled = await this.#commit<WriteSettlement>(saveId, (current) => {
      const state = readSlotState(current);
      const verdict = decideWrite(
        state,
        this.#observed.get(saveId) ?? null,
        prepared.payload,
      );
      if (verdict.kind === "discarded" || verdict.kind === "conflict") {
        return { write: null, result: { verdict } };
      }
      const stored = state.kind === "present" ? state : null;
      const savedAt = latestTimestamp(
        nowTimestamp(this.#now),
        stored?.savedAt ?? undefined,
        stored?.lastPlayedAt ?? undefined,
      );
      const createdAt = stored?.createdAt ?? savedAt;
      const record = completeRecord(
        prepared,
        saveId,
        savedAt,
        createdAt,
        verdict.generation,
      );
      if (verdict.kind === "write") {
        return { write: record, result: { verdict, record } };
      }
      // Nothing is written when the bytes already match. The caller still gets
      // a summary, and it describes the record that is actually there — the
      // world is the same world, but its stamps are the ones it was stored
      // with, not the ones this write would have given it.
      return {
        write: null,
        result: {
          verdict,
          record: {
            ...record,
            metadata: {
              ...record.metadata,
              savedAt: stored?.savedAt ?? record.metadata.savedAt,
              lastPlayedAt:
                stored?.lastPlayedAt ?? record.metadata.lastPlayedAt,
            },
          },
        },
      };
    });

    const verdict = settled.verdict;
    if (verdict.kind === "discarded") {
      // A tombstone is durable authority, so this store now knows too.
      this.#deleted.add(saveId);
      this.#forgetSlotState(saveId);
      return { status: "discarded", reason: verdict.reason } as const;
    }
    if (verdict.kind === "conflict") {
      this.#conflicts.set(saveId, verdict.reason);
      return { status: "conflict", reason: verdict.reason } as const;
    }
    // Only now is anything durable, and only now does the store say so.
    this.#observed.set(saveId, verdict.generation);
    this.#durableContent.set(saveId, prepared.contentId);
    this.#conflicts.delete(saveId);
    return {
      status: "saved",
      summary: cloneSummary(settled.record!.metadata),
    } as const;
  }

  load(saveId: EntityId): Promise<World | null> {
    return this.#enqueue(async () => {
      if (this.#deleted.has(saveId)) return null;
      const raw = await this.#get(saveId);
      const state = readSlotState(raw);
      if (state.kind === "deleted") {
        this.#deleted.add(saveId);
        this.#forgetSlotState(saveId);
        return null;
      }
      if (state.kind === "absent") return null;
      const read = readStoredRecord(raw);
      if (read.kind !== "healthy") {
        throw new Error(
          read.kind === "damaged"
            ? read.quarantine.reason
            : SLOT_MESSAGES.deleted,
        );
      }
      const record = read.record;
      if (record.saveId !== saveId) {
        throw new Error("This saved game does not match the one asked for.");
      }
      const world = deserializeWorld(record.payload);
      // Opening a save is how a tab comes to hold the slot: what it has in
      // hand now *is* what is stored, so it may write over it. The payload was
      // not rewritten, so what is durable is what was read.
      this.#observed.set(saveId, record.generation);
      this.#durableContent.set(saveId, this.#contentId(world));
      this.#conflicts.delete(saveId);

      const lastPlayedAt = latestTimestamp(
        nowTimestamp(this.#now),
        record.metadata.savedAt,
        record.metadata.lastPlayedAt,
      );
      // The last-played stamp is bookkeeping, not a revision: it keeps the
      // generation where it is, so opening a save in a second tab does not
      // take the slot away from the tab that is playing it. And it is
      // conditional, so it cannot land on top of a newer save.
      await this.#commit(saveId, (current) => {
        const now = readSlotState(current);
        if (now.kind !== "present" || now.generation !== record.generation) {
          return { write: null, result: undefined };
        }
        return {
          write: {
            ...record,
            metadata: { ...record.metadata, lastPlayedAt },
          },
          result: undefined,
        };
      });
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
        if (read.kind === "healthy") {
          saves.push(cloneSummary(read.record.metadata));
        } else if (read.kind === "deleted") {
          // A tombstone is neither a save nor damage. Meeting one is also how
          // a tab that never asked for the deletion finds out about it, which
          // is worth taking: the next autosave is turned away without a round
          // trip, rather than being told a deleted slot is fine.
          this.#deleted.add(read.saveId);
          this.#forgetSlotState(read.saveId);
        } else {
          damaged.push(read.quarantine);
        }
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

  /**
   * Deletes a slot for good, everywhere.
   *
   * The slot's key is not emptied; a tombstone is written there at a later
   * generation. That is what makes the deletion a fact other tabs meet rather
   * than an intention this one holds: a stale tab's next write finds the
   * tombstone, is told the save is gone, and cannot put it back. The slot id
   * is never reused afterwards.
   */
  remove(saveId: EntityId): Promise<boolean> {
    const inFlight = this.#removals.get(saveId);
    if (inFlight) return inFlight;
    // Provisional only: it turns away an explicit save asked for after the
    // player said "delete". It does not touch what is already owed.
    this.#removing.add(saveId);
    const removal = this.#enqueue(() => this.#tombstone(saveId)).then(
      (removed) => {
        this.#removing.delete(saveId);
        this.#removals.delete(saveId);
        if (removed) {
          this.#deleted.add(saveId);
          this.#pending.delete(saveId);
          this.#forgetSlotState(saveId);
        }
        return removed;
      },
      (error: unknown) => {
        // Nothing was removed, so nothing may be treated as removed. The
        // provisional fence comes down and the drain — which waited rather
        // than throwing the owed world away — picks it up again.
        this.#removing.delete(saveId);
        this.#removals.delete(saveId);
        if (this.#pending.has(saveId)) void this.#ensureDrain(saveId);
        throw error;
      },
    );
    this.#removals.set(saveId, removal);
    return removal;
  }

  #tombstone(saveId: EntityId): Promise<boolean> {
    if (this.#deleted.has(saveId)) return Promise.resolve(false);
    return this.#commit(saveId, (current) => {
      const state = readSlotState(current);
      if (state.kind === "deleted") return { write: null, result: false };
      if (state.kind === "absent") return { write: null, result: false };
      // An unreadable record is deleted too: a quarantined save is exactly the
      // one a player most wants to be rid of.
      const tombstone: StoredBrowserWorldTombstone = {
        kind: BROWSER_WORLD_TOMBSTONE_KIND,
        recordVersion: BROWSER_WORLD_RECORD_VERSION,
        saveId,
        generation: state.generation + 1,
        deletedAt: nowTimestamp(this.#now),
      };
      return { write: tombstone, result: true };
    });
  }

  #forgetSlotState(saveId: EntityId | string): void {
    this.#failures.delete(saveId);
    this.#conflicts.delete(saveId);
    this.#observed.delete(saveId);
    this.#durableContent.delete(saveId);
    this.#durableRequest.delete(saveId);
  }

  /**
   * Hands the store the newest world for a slot and holds it answerable for
   * writing it.
   *
   * Calling this while an earlier write is still in flight is normal and is
   * the case that used to lose data: the newer world replaces the older one in
   * the queue and is written as soon as the drain comes back round. The
   * returned promise settles once the slot is at or beyond this world.
   *
   * There is no local shortcut for "I already wrote this". There used to be,
   * and it was a lie in any tab but the one that wrote it: after another tab
   * deleted the slot, the shortcut answered `saved` about a record that no
   * longer existed. Every autosave now asks the database, and the answer costs
   * one comparison when nothing has changed.
   */
  autosave(world: World, saveId: EntityId): Promise<AutosaveResult> {
    if (this.#deleted.has(saveId)) {
      return Promise.resolve({
        status: "discarded",
        reason: SLOT_MESSAGES.deleted,
      } as const);
    }
    const content = this.#contentId(world);
    this.#requestCounter += 1;
    const ordinal = this.#requestCounter;
    this.#pending.set(saveId, { world, content, ordinal });
    this.#failures.delete(saveId);
    const drained = this.#ensureDrain(saveId);
    return drained.then(() => this.#resultFor(saveId, ordinal, content));
  }

  #resultFor(
    saveId: EntityId,
    ordinal: number,
    content: EntityId,
  ): AutosaveResult {
    if (this.#deleted.has(saveId)) {
      return {
        status: "discarded",
        reason: SLOT_MESSAGES.deleted,
      } as const;
    }
    // Two ways this request is honoured: its own world is on disk, or a
    // request made after it has landed and superseded it. Both mean the
    // player has lost nothing; neither is a statement about actionSequence.
    if (this.#durableContent.get(saveId) === content) {
      return { status: "saved" } as const;
    }
    if ((this.#durableRequest.get(saveId) ?? -1) >= ordinal) {
      return { status: "saved" } as const;
    }
    const conflict = this.#conflicts.get(saveId);
    if (conflict !== undefined) {
      return { status: "conflict", reason: conflict } as const;
    }
    return {
      status: "failed",
      reason: this.#failures.get(saveId) ?? WRITE_FAILED,
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
        this.#pending.has(saveId) &&
        !this.#failures.has(saveId) &&
        !this.#conflicts.has(saveId)
          ? this.#ensureDrain(saveId)
          : undefined,
      );
    this.#settled.set(saveId, drain);
    return drain;
  }

  async #drain(saveId: EntityId): Promise<void> {
    while (this.#pending.has(saveId)) {
      if (this.#deleted.has(saveId)) {
        this.#pending.delete(saveId);
        return;
      }
      const removal = this.#removals.get(saveId);
      if (removal !== undefined) {
        // A delete is provisional until it commits. Waiting is the whole
        // repair: if it commits, the loop sees the tombstone and this world is
        // rightly discarded; if it fails, the world is still owed and still
        // here to be written.
        await removal.then(
          () => undefined,
          () => undefined,
        );
        continue;
      }
      const request = this.#pending.get(saveId)!;
      let prepared: PreparedRecord;
      try {
        prepared = prepareWorldRecord(request.world);
      } catch (error: unknown) {
        this.#failures.set(saveId, messageOf(error));
        return;
      }
      let written = false;
      for (let attempt = 1; attempt <= this.#attempts; attempt += 1) {
        try {
          const outcome = await this.#enqueue(() =>
            this.#writeSlot(prepared, saveId),
          );
          if (outcome.status === "discarded") {
            this.#pending.delete(saveId);
            return;
          }
          if (outcome.status === "conflict") {
            // Not a failure and not retried: trying again can only overwrite
            // the world this store lost the slot to. It stays reported as
            // unsaved until the shell says what to do with it.
            this.#pending.delete(saveId);
            return;
          }
          this.#noteDurableRequest(saveId, request.ordinal);
          written = true;
          break;
        } catch (error: unknown) {
          this.#failures.set(saveId, messageOf(error));
          if (attempt === this.#attempts) break;
          // Short and increasing: a quota prompt or an aborted transaction is
          // usually over by the next try, and hammering it is not help.
          await this.#delay(attempt * 25);
        }
      }
      // Whatever happened, this world is no longer the newest thing owed
      // unless a newer one arrived while it was being written.
      if (written && this.#pending.get(saveId) === request) {
        this.#pending.delete(saveId);
        this.#failures.delete(saveId);
      }
      if (!written) return;
    }
  }

  /** Durability order only ever moves forward. */
  #noteDurableRequest(saveId: EntityId, ordinal: number): void {
    const durable = this.#durableRequest.get(saveId) ?? -1;
    if (ordinal > durable) this.#durableRequest.set(saveId, ordinal);
  }

  /**
   * Waits for the store to stop owing anything, and says what it still owes.
   *
   * Leaving used to call a flush that waited only for writes already enqueued
   * and swallowed their rejections, so a player could leave on top of a world
   * that never reached disk and be told nothing. This drains what is owed,
   * gives a failed slot one more real attempt, and reports what did not land —
   * including a slot lost to another tab, which is not a storage failure but
   * is certainly not saved.
   */
  async flush(): Promise<FlushResult> {
    const owed = [...this.#pending.keys()] as EntityId[];
    // One more genuine attempt on the way out, rather than reporting a stale
    // failure the player never had a chance to survive.
    for (const saveId of owed) this.#failures.delete(saveId);
    const drains = owed.map((saveId) => this.#ensureDrain(saveId));
    const running = [...this.#settled.values()];
    const removals = [...this.#removals.values()];
    await Promise.all(
      [...drains, ...running, ...removals].map((done) =>
        done.then(
          () => undefined,
          () => undefined,
        ),
      ),
    );
    await this.#tail.catch(() => undefined);
    const unsaved = this.unsavedWork();
    if (unsaved.length === 0) {
      return { status: "settled", unsaved: [], reason: null };
    }
    return {
      status: "unsaved",
      unsaved: unsaved.map((slot) => slot.saveId),
      reason: unsaved[0]!.reason,
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

  async #commit<T>(
    saveId: EntityId,
    decide: (current: unknown) => CommitDecision<T>,
  ): Promise<T> {
    const database = await this.#database();
    return runCompareAndSwap(database, saveId, decide);
  }
}

/* -------------------------------------------------------------------------- */
/* Records.                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Everything about a record that depends only on the world.
 *
 * Prepared before a transaction opens, because serializing a world is the
 * expensive part of a save and the read-compare-write transaction is a lock
 * every tab queues behind. What is left to do inside it is a string
 * comparison and, at most, a put.
 */
interface PreparedRecord {
  readonly payload: string;
  readonly contentId: EntityId;
  readonly fields: Omit<
    BrowserWorldSummary,
    "saveId" | "createdAt" | "savedAt" | "lastPlayedAt"
  >;
}

function prepareWorldRecord(world: World): PreparedRecord {
  const player = controlledPlayer(world);
  // One snapshot, used for the summary, the payload and the content identity.
  // `serializeWorld` is exactly `JSON.stringify(createWorldSnapshot(world))`.
  const snapshot = createWorldSnapshot(world);
  return {
    payload: JSON.stringify(snapshot),
    contentId: snapshot.snapshotId,
    fields: {
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
    },
  };
}

function completeRecord(
  prepared: PreparedRecord,
  saveId: EntityId,
  savedAt: string,
  createdAt: string,
  generation: number,
): StoredBrowserWorldRecord {
  assertTimestamp(createdAt, "creation time");
  assertTimestamp(savedAt, "saved time");
  if (createdAt > savedAt) {
    throw new Error(
      "A saved game cannot have been created after it was saved.",
    );
  }
  return {
    kind: BROWSER_WORLD_RECORD_KIND,
    recordVersion: BROWSER_WORLD_RECORD_VERSION,
    saveId,
    generation,
    metadata: {
      saveId,
      ...prepared.fields,
      createdAt,
      savedAt,
      lastPlayedAt: savedAt,
    },
    payload: prepared.payload,
  };
}

export function createBrowserWorldRecord(
  world: World,
  savedAt: string,
  createdAt: string = savedAt,
  saveId: EntityId = world.id,
  generation = 1,
): StoredBrowserWorldRecord {
  return completeRecord(
    prepareWorldRecord(world),
    saveId,
    savedAt,
    createdAt,
    generation,
  );
}

type ReadRecord =
  | { readonly kind: "healthy"; readonly record: StoredBrowserWorldRecord }
  | { readonly kind: "deleted"; readonly saveId: EntityId }
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

  // The proof that a slot was deleted. Not a save, and not damage: a player
  // should see neither a game nor a warning for a game they got rid of.
  if (value.kind === BROWSER_WORLD_TOMBSTONE_KIND && saveId !== null) {
    return { kind: "deleted", saveId };
  }

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
 * conflation version 2 fixes; they migrate by keeping that id as the slot's
 * and naming the world separately. Version 1 and 2 records predate the shared
 * generation, so they migrate in at generation zero: the first conditional
 * write moves them to one, and a second tab holding the same belief is refused
 * rather than allowed to overwrite. Nothing about the world itself changes, so
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
  const generation =
    typeof value.generation === "number" &&
    Number.isInteger(value.generation) &&
    value.generation >= 0
      ? value.generation
      : 0;

  const expected = createBrowserWorldRecord(
    world,
    metadata.savedAt as string,
    metadata.createdAt as string,
    saveId,
    generation,
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
    generation,
    metadata: cloneSummary({ ...actual, lastPlayedAt: actual.lastPlayedAt }),
    payload: value.payload as string,
  };
}

/** Kept for callers that want an exception rather than a quarantine record. */
export function validateBrowserWorldRecord(
  value: unknown,
): StoredBrowserWorldRecord {
  const read = readStoredRecord(value);
  if (read.kind !== "healthy") {
    throw new Error(
      read.kind === "damaged" ? read.quarantine.reason : SLOT_MESSAGES.deleted,
    );
  }
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : WRITE_FAILED;
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

interface CommitDecision<T> {
  readonly write: unknown | null;
  readonly result: T;
}

/**
 * Read the slot, decide, and write — all inside one transaction.
 *
 * This is where cross-tab correctness actually lives. IndexedDB serializes
 * overlapping read-write transactions on an object store, and the put below is
 * issued synchronously from the get's success handler, so it is part of the
 * same transaction: no other tab can observe or change the slot between the
 * comparison and the write. A second tab racing this one does not interleave
 * with it; it queues behind it, reads what this one wrote, and is told its own
 * belief about the slot is out of date.
 *
 * `decide` must be synchronous and must not await, because awaiting would let
 * the transaction finish and take the guarantee with it.
 */
function runCompareAndSwap<T>(
  database: IDBDatabase,
  saveId: string,
  decide: (current: unknown) => CommitDecision<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    let result: T;
    let decided = false;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    let store: IDBObjectStore;
    let read: IDBRequest<unknown>;
    try {
      store = transaction.objectStore(STORE_NAME);
      read = store.get(saveId);
    } catch (error) {
      fail(new Error("The saved game could not be read.", { cause: error }));
      return;
    }

    read.onsuccess = () => {
      let decision: CommitDecision<T>;
      try {
        decision = decide(read.result);
      } catch (error) {
        fail(
          error instanceof Error
            ? error
            : new Error("The saved game could not be written."),
        );
        return;
      }
      result = decision.result;
      decided = true;
      if (decision.write === null) return;
      try {
        const write = store.put(decision.write);
        write.onerror = () =>
          fail(new Error("Saving did not finish.", { cause: write.error }));
      } catch (error) {
        fail(new Error("Saving did not finish.", { cause: error }));
      }
    };
    read.onerror = () =>
      fail(
        new Error("The saved game could not be read.", { cause: read.error }),
      );

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      if (decided) resolve(result);
      else reject(new Error("The saved game could not be read."));
    };
    transaction.onerror = () =>
      fail(new Error("Saving did not finish.", { cause: transaction.error }));
    transaction.onabort = () =>
      fail(new Error("Saving was interrupted.", { cause: transaction.error }));
  });
}
