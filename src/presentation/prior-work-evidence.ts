import type { EntityId, World } from "../simulation";

/**
 * What the record actually establishes about two people's shared past.
 *
 * Knowing somebody and having worked with them are different facts, and the
 * game may only claim the one it holds. The defect this module exists to
 * close read any interaction naming both people — a drink, a introduction, a
 * shared bus ride — as proof of collaboration, and told the player they had
 * "worked together before" on the strength of `contact:met-socially`.
 *
 * The classification is therefore made from the contract of each record, not
 * from the fact that two ids appear in one:
 *
 * - `shared-work` — a record whose own contract entails the two of them
 *   working the same matter: a `work:` or `mentorship:` relationship
 *   interaction, or a recorded legislative negotiation between them, which is
 *   by definition the two of them dealing with each other over a measure.
 * - `acquaintance` — some interaction between them exists, but nothing in it
 *   entails shared work. They have met; that is all the record says.
 * - `none` — no record in the families this surface can see puts them
 *   together.
 *
 * This is a read-only projection over existing canonical records. It queries
 * more than one family on purpose: a missing `relationshipInteraction` may not
 * erase shared work another accepted record already establishes.
 */
export type PriorWorkEvidence = "shared-work" | "acquaintance" | "none";

/** Interaction namespaces whose contract entails working on something together. */
const SHARED_WORK_NAMESPACES = ["work", "mentorship"] as const;

function entailsSharedWork(kind: string): boolean {
  const namespace = kind.slice(0, kind.indexOf(":"));
  return (SHARED_WORK_NAMESPACES as readonly string[]).includes(namespace);
}

function namesBoth(
  ids: readonly EntityId[],
  first: EntityId,
  second: EntityId,
): boolean {
  return ids.includes(first) && ids.includes(second);
}

export function priorWorkEvidence(
  world: World,
  first: EntityId,
  second: EntityId,
): PriorWorkEvidence {
  if (first === second) return "none";

  const negotiated = (world.history.legislativeNegotiations ?? []).some(
    (record) =>
      namesBoth(
        [record.initiatorPersonId, record.counterpartyPersonId],
        first,
        second,
      ),
  );
  if (negotiated) return "shared-work";

  const interactions = world.history.relationshipInteractions.filter((record) =>
    namesBoth(record.personIds, first, second),
  );
  if (interactions.some((record) => entailsSharedWork(record.kind))) {
    return "shared-work";
  }
  return interactions.length > 0 ? "acquaintance" : "none";
}

/** The most recent interaction between two people, whatever kind it was. */
export function latestInteractionBetween(
  world: World,
  first: EntityId,
  second: EntityId,
) {
  return [...world.history.relationshipInteractions]
    .reverse()
    .find((record) => namesBoth(record.personIds, first, second));
}
