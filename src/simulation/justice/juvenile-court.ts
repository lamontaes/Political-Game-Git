import { lawInForce } from "../governing/law-in-force";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdByKey } from "./pretrial";

const JUVENILE_COURT_QUESTION =
  "justice-public-safety.raise-juvenile-court-age";

/**
 * General adult jurisdiction begins after the law's inclusive juvenile ceiling.
 * A Boolean answer supplies no numeric age. Unknown terms stay unsupported;
 * a younger person's adult transfer requires a separately saved authorized
 * decision, which this general-age reader does not infer.
 */
export function adultCourtAgeAt(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate = world.currentDate,
): number | null {
  const propositionId = propositionIdByKey(world, JUVENILE_COURT_QUESTION);
  const law = propositionId
    ? lawInForce(world, jurisdictionId, propositionId, onDate)
    : null;
  if (!law) return null;
  const questionKey =
    world.policyCatalog.propositions[propositionId!]?.stableKey;
  if (!questionKey) return null;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey: "age",
    unit: "years",
    onDate,
  });
  if (!term || !Number.isInteger(term.value) || term.value < 0) return null;
  return term.value + 1;
}
