import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { PARTY_RECORD_ID_KIND, partyRecords } from "./integrity";
import type { PartyRecord } from "./types";

export type PartyRecordDraft = PartyRecord extends infer R
  ? R extends PartyRecord
    ? Omit<R, "id" | "sequence" | "recordedAt">
    : never
  : never;

export function partyRecordId(world: World, stableKey: string): EntityId {
  return createStableId(PARTY_RECORD_ID_KIND, `${world.id}:${stableKey}`);
}

/**
 * Appends party records. `validate: false` is for a writer that asserts the
 * whole World once after a batch; nothing else may skip validation.
 */
export function appendPartyRecords(
  world: World,
  drafts: readonly PartyRecordDraft[],
  options: { readonly validate?: boolean } = {},
): World {
  if (drafts.length === 0) return world;
  let sequence = world.history.nextSequence;
  const recordedAt = makeIsoDate(world.currentDate);
  const records = drafts.map(
    (draft) =>
      ({
        ...draft,
        id: partyRecordId(world, draft.stableKey),
        sequence: sequence++,
        recordedAt,
      }) as PartyRecord,
  );
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      partyRecords: [...partyRecords(world), ...records],
    },
  };
  if (options.validate !== false) assertWorldIntegrity(next);
  return next;
}
