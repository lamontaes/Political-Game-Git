/**
 * The record dev mode writes to force a situation type whose cause is one record of a kind (owner,
 * Nov 16: dev mode must "trace and force every scene to play"). The record is built from the type's
 * own first cause at the moment of the force, for the player of the world it runs in: its kind is
 * the cause's record kind, and each fact the cause reads (`causeFacts`) names that player, the first
 * living person they know, or the value the cause lists. The force map (scene-force-map.json) keeps
 * only which types a record stages, never a person: a map that kept the facts of the world it was
 * measured in named that world's player, so in every other world the record named a stranger and
 * the director wrote a journal line instead of the scene (Nov 24). The probe that writes the map
 * (scripts/words/force-all-probe.mts) and the scene trace's force (dev-views/scene-trace.ts) both
 * build the record here, so what was measured is what is forced.
 */
import type { CoreState, PersonId } from "../core2/types";
import type { SituationType } from "../director/scheduling";

/** The types whose cause an engine's own function brings about (`DevMode.forceScene`): no record is written for them here. */
export const OWN_RECIPES: readonly string[] = ["death", "illness", "layoff"];

/** The record kind of a type's first cause, or "" where its cause is no record (a circumstance or a turn in a tie). */
export function forceCause(type: SituationType) {
  const cause = type.causes.find((c) => c.causeRecord) ?? type.causes[0];
  if (!cause) return undefined;
  const label = cause.match?.label ?? "";
  const kind =
    cause.causeRecord ??
    (label.startsWith("feeling:event:")
      ? label.slice("feeling:event:".length)
      : (cause.match?.causeKind?.replace(/^event:/, "") ?? ""));
  return { cause, kind };
}

/** The first living person the player knows, who stands in a record as anyone else it names. */
export function forceCircle(core: CoreState, playerId: PersonId) {
  const player = core.people.get(playerId);
  return player
    ? [...player.familyIds, ...player.knownIds].find(
        (id) => id !== playerId && core.people.get(id)?.alive,
      )
    : undefined;
}

/** The record that forces `type` for `playerId`, today, with the id given; undefined where its cause is no record. */
export function forceEvent(
  core: CoreState,
  type: SituationType,
  playerId: PersonId,
  id: string,
  citation: string,
) {
  const found = forceCause(type);
  const player = core.people.get(playerId);
  if (!found?.kind || !player) return undefined;
  const other = forceCircle(core, playerId);
  const facts: Record<string, string> = {};
  for (const want of found.cause.match?.causeFacts ?? []) {
    if (want.absent) continue;
    facts[want.key] =
      want.is === "subject"
        ? playerId
        : want.is === "other" && other
          ? other
          : (want.equals?.[0] ??
            (want.includes === "subject"
              ? JSON.stringify([playerId])
              : playerId));
  }
  return {
    id,
    date: core.date,
    kind: found.kind,
    personIds: [playerId, ...(other ? [other] : [])],
    witnessIds: [],
    placeId: player.placeId,
    facts,
    source: { tag: "ESTIMATED", citation, asOf: core.date },
  };
}
