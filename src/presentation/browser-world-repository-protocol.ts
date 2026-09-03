import type { EntityId } from "../simulation/types";

/**
 * What one save slot is, on disk, to every tab at once.
 *
 * The audit's two blockers were the same mistake said twice: the store treated
 * its own memory as the truth about a database that several tabs share. Two
 * tabs each wrote an unconditional `put` and each was told `saved`, so one
 * canonical world vanished; and a delete was a `Set` inside one JavaScript
 * object, so a second tab neither saw the deletion nor was stopped from
 * writing the slot back into existence.
 *
 * The fix is to put the things that decide durability where every tab can see
 * them — in the record itself — and to read and write them inside one
 * IndexedDB transaction, which the browser already serializes across tabs.
 *
 * Two persisted facts do all the work.
 *
 * *Generation.* A slot's revision number, kept on the record. It moves only
 * when the world in the slot changes. A writer says which generation it
 * believes it is replacing; if the slot has moved past that, the writer is
 * stale and is refused, rather than being allowed to overwrite work it never
 * saw and be told it succeeded. Opening a save, or listing saves, does not
 * claim a generation — only writing does — so two tabs may read the same slot
 * and the first to write it wins outright.
 *
 * *Tombstone.* Deleting a slot does not empty its key; it writes a tombstone
 * there, at a generation past the record it replaced. A deletion is therefore
 * a durable fact rather than an in-memory intention: a tab that never saw the
 * delete finds the tombstone when it tries to write, is told the save is gone,
 * and cannot recreate it. The slot id is never reused, which is exactly what
 * "a deleted save stays deleted" has to mean when more than one tab is awake.
 */

/** The kind marker on a live saved game. */
export const BROWSER_WORLD_RECORD_KIND = "political-life-browser-world";
/** The kind marker on the durable proof that a slot was deleted. */
export const BROWSER_WORLD_TOMBSTONE_KIND =
  "political-life-browser-world-deleted";

/**
 * Version 2 separated the save slot's identity from the world's. Version 3
 * added the persisted generation and the tombstone, which is what makes a
 * slot mean the same thing in every tab.
 */
export const BROWSER_WORLD_RECORD_VERSION = 3;
/** Versions this build can read, after migration. */
export const READABLE_RECORD_VERSIONS: readonly number[] = [1, 2, 3];

/**
 * The generation a record written before generations existed is treated as.
 *
 * Zero, so the first conditional write over a migrated record moves it to one
 * and any second tab holding the same belief is refused.
 */
export const UNGENERATIONED = 0;

/**
 * A slot as it stands on disk, read shallowly.
 *
 * Shallow on purpose. This is read inside the transaction that decides whether
 * a write may proceed, and deserializing and revalidating a whole world there
 * would put the cost of a save inside the lock that every tab is waiting on.
 * What the decision needs is the generation, the exact bytes already stored,
 * and the timestamps to carry forward. Whether the stored world is *readable*
 * is a different question, asked by `load` and `list`, which is where a player
 * can be told about it.
 */
export type SlotState =
  | { readonly kind: "absent" }
  | { readonly kind: "deleted"; readonly generation: number }
  | {
      readonly kind: "present";
      readonly generation: number;
      readonly payload: string;
      readonly contentId: EntityId | null;
      readonly createdAt: string | null;
      readonly savedAt: string | null;
      readonly lastPlayedAt: string | null;
    }
  | { readonly kind: "unreadable"; readonly generation: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generationOf(value: Record<string, unknown>): number {
  const generation = value.generation;
  return typeof generation === "number" &&
    Number.isInteger(generation) &&
    generation >= 0
    ? generation
    : UNGENERATIONED;
}

function timestampOf(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  if (metadata === null) return null;
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

/** Reads what a stored value says about the slot, without trusting it further. */
export function readSlotState(value: unknown): SlotState {
  if (value === undefined || value === null) return { kind: "absent" };
  if (!isRecord(value))
    return { kind: "unreadable", generation: UNGENERATIONED };
  if (value.kind === BROWSER_WORLD_TOMBSTONE_KIND) {
    return { kind: "deleted", generation: generationOf(value) };
  }
  if (
    value.kind !== BROWSER_WORLD_RECORD_KIND ||
    typeof value.recordVersion !== "number" ||
    !READABLE_RECORD_VERSIONS.includes(value.recordVersion) ||
    typeof value.payload !== "string"
  ) {
    return { kind: "unreadable", generation: generationOf(value) };
  }
  const metadata = isRecord(value.metadata) ? value.metadata : null;
  const contentId =
    metadata !== null && typeof metadata.snapshotId === "string"
      ? (metadata.snapshotId as EntityId)
      : null;
  return {
    kind: "present",
    generation: generationOf(value),
    payload: value.payload,
    contentId,
    createdAt: timestampOf(metadata, "createdAt"),
    savedAt: timestampOf(metadata, "savedAt"),
    lastPlayedAt: timestampOf(metadata, "lastPlayedAt"),
  };
}

/**
 * What a conditional write is allowed to do, decided from the slot as it
 * actually stands rather than from what the writing tab remembers.
 */
export type WriteVerdict =
  | { readonly kind: "write"; readonly generation: number }
  /** These exact bytes are already stored. Nothing to do, and nothing lost. */
  | { readonly kind: "already-durable"; readonly generation: number }
  /** The slot is gone for good. Writing would resurrect it. */
  | { readonly kind: "discarded"; readonly reason: string }
  /** Someone else holds the slot. Overwriting would destroy their world. */
  | { readonly kind: "conflict"; readonly reason: string };

const SLOT_DELETED =
  "This saved game was deleted, so it was not written again.";
const SLOT_GONE =
  "This saved game is no longer there, so it was not written again.";
const SLOT_MOVED =
  "This saved game was changed somewhere else — another tab or window has it open. Nothing was written over.";
const SLOT_TAKEN =
  "Another saved game is already kept in this slot, so nothing was written over it.";
const SLOT_UNREADABLE =
  "This saved game could not be read, so it was not written over.";

/**
 * Compare and set, in the terms a save slot is in.
 *
 * `expected` is the generation the writer last saw for this slot, or null if
 * it has never seen it. Never adopting a generation it did not observe is the
 * point: a tab that lost the slot stays lost until it opens the save again or
 * keeps its life somewhere new. Silently adopting would turn the refusal back
 * into the overwrite it exists to prevent.
 */
export function decideWrite(
  state: SlotState,
  expected: number | null,
  payload: string,
): WriteVerdict {
  switch (state.kind) {
    case "deleted":
      return { kind: "discarded", reason: SLOT_DELETED };
    case "unreadable":
      return { kind: "conflict", reason: SLOT_UNREADABLE };
    case "absent":
      // Never seen: this is a new slot, and writing it creates it. Seen
      // before: the record it had is gone, and putting it back would undo
      // whatever removed it.
      return expected === null
        ? { kind: "write", generation: 1 }
        : { kind: "discarded", reason: SLOT_GONE };
    case "present":
      // Convergence, checked as bytes rather than as a digest: what this
      // writer wants stored is character-for-character what is stored. That
      // is true however the slot got there, so it is safe to report even to a
      // writer whose generation is behind — it has lost nothing.
      if (state.payload === payload) {
        return { kind: "already-durable", generation: state.generation };
      }
      if (expected === null) {
        return { kind: "conflict", reason: SLOT_TAKEN };
      }
      if (state.generation !== expected) {
        return { kind: "conflict", reason: SLOT_MOVED };
      }
      return { kind: "write", generation: state.generation + 1 };
  }
}

export const SLOT_MESSAGES = {
  deleted: SLOT_DELETED,
  gone: SLOT_GONE,
  moved: SLOT_MOVED,
  taken: SLOT_TAKEN,
  unreadable: SLOT_UNREADABLE,
} as const;
