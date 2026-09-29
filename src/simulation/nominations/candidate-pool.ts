import type { EntityId, IsoDate, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";

/**
 * People an office's earlier cycles already brought into a district: each
 * party's recruits and the candidates nobody recruited. They live in the
 * district they were asked to run in, so a later cycle asks them first and
 * generates a new person only when none of them can stand.
 */
export interface PastCandidate {
  readonly personId: EntityId;
  readonly year: number;
  readonly party: string;
  readonly kind: "prospect" | "self-starter";
}

const CONTEXT_PREFIX = "life-context-v1:";

/**
 * Every past prospect and self-starter an office's candidate writer made,
 * by seat. Keys are `${version}:${seatKey}:${year}:${party}:${kind}`, the
 * stable keys the writers give `createCharacterHistoryContextPeople`.
 */
export function pastCandidatesBySeat(
  world: World,
  version: string,
): ReadonlyMap<string, readonly PastCandidate[]> {
  const prefix = `${CONTEXT_PREFIX}${version}:`;
  const bySeat = new Map<string, PastCandidate[]>();
  for (const personId of world.personOrder) {
    const key = world.people[personId]?.generationKey;
    if (!key?.startsWith(prefix)) continue;
    const parts = key.slice(prefix.length).split(":");
    if (parts.length < 4) continue;
    const kind = parts.at(-1);
    if (kind !== "prospect" && kind !== "self-starter") continue;
    const party = parts.at(-2)!;
    const year = Number(parts.at(-3));
    if (!Number.isInteger(year)) continue;
    const seatKey = parts.slice(0, -3).join(":");
    const list = bySeat.get(seatKey) ?? [];
    list.push({ personId, year, party, kind });
    bySeat.set(seatKey, list);
  }
  return bySeat;
}

/**
 * The past candidate a party turns to first: someone of that party from an
 * earlier cycle who can still stand, preferring the kind asked for and then
 * the most recent cycle. `canStand` decides who can: alive, of age, not the
 * sitting member, not already in this year's field.
 */
export function returningCandidate(
  pool: readonly PastCandidate[] | undefined,
  input: {
    readonly party: string;
    readonly year: number;
    readonly prefer: PastCandidate["kind"];
    readonly canStand: (personId: EntityId) => boolean;
  },
): EntityId | null {
  if (!pool) return null;
  const ranked = pool
    .filter((row) => row.party === input.party && row.year < input.year)
    .sort(
      (a, b) =>
        Number(b.kind === input.prefer) - Number(a.kind === input.prefer) ||
        b.year - a.year ||
        a.personId.localeCompare(b.personId),
    );
  const seen = new Set<EntityId>();
  for (const row of ranked) {
    if (seen.has(row.personId)) continue;
    seen.add(row.personId);
    if (input.canStand(row.personId)) return row.personId;
  }
  return null;
}

/**
 * Whether a past candidate can be asked again on the intake day: living, and
 * not the person being played, whose own choices decide their candidacies.
 * Their age and health are theirs to weigh when asked, not a bar here.
 */
export function canStandAgain(
  world: World,
  personId: EntityId,
  intakeDate: IsoDate,
): boolean {
  const person = world.people[personId];
  return (
    person !== undefined &&
    !(world.control.kind === "person" && world.control.personId === personId) &&
    isPersonAliveAt(world, personId, {
      asOfDate: intakeDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  );
}
