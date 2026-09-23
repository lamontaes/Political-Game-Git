import { dateAtAge } from "./dates";
import { recordChildAuthorityState } from "./life";
import { childAuthorityStateAt } from "./life-queries";
import type { World } from "./types";

/**
 * PLACEHOLDER(research: age-of-majority-by-state). Eighteen everywhere,
 * standing in until the question is answered: Alabama and Nebraska use
 * nineteen and Mississippi twenty-one, and a guardianship or support order
 * can run past it. Replace it with the jurisdiction's own age; do not tune it.
 */
export const AGE_OF_MAJORITY_PLACEHOLDER = 18;

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "coming-of-age-v1",
};

/**
 * Somebody who grows up is no longer anybody's child to answer for.
 *
 * A new game opens a child's life with a guardian or parent holding authority
 * over them, and nothing in play ever ended it. A twenty-seven-year-old who
 * owned her own house still had "your guardian" at home on her profile. The
 * summarized pasts end theirs at eighteen ("Reached adulthood", see
 * `character-history.ts`); this does the same for a life that is played.
 *
 * Every authority still active over somebody who has reached the age of
 * majority ends on their birthday that year, with the basis it already had.
 * It runs as days pass and when a save is imported, so an older save whose
 * grown character still has an open authority is repaired the next time it
 * moves, back-dated to the birthday rather than to the day it was noticed.
 * Opening a save alone writes nothing. An authority recorded as starting at
 * or after that birthday was written deliberately about an adult and is left
 * alone, as is one over somebody who died before it. Running this again
 * changes nothing.
 */
export function catchUpComingOfAge(world: World): World {
  let next = world;
  for (const authority of world.history.childAuthorities) {
    const person = next.people[authority.childPersonId];
    if (!person) continue;
    const majority = dateAtAge(person.birthDate, AGE_OF_MAJORITY_PLACEHOLDER);
    if (majority > next.currentDate) continue;
    if (authority.establishedAt >= majority) continue;
    if (
      next.history.personDeaths.some(
        (death) => death.personId === person.id && death.diedAt < majority,
      )
    )
      continue;
    const state = childAuthorityStateAt(next, authority.id);
    if (state?.status !== "active") continue;
    next = recordChildAuthorityState(next, {
      stableKey: `${authority.stableKey}:ended:adulthood`,
      childAuthorityId: authority.id,
      // Never before the state it supersedes.
      effectiveAt: state.effectiveAt > majority ? state.effectiveAt : majority,
      status: "ended",
      basisKind: state.basisKind,
      context: "Reached adulthood",
      provenance: PROVENANCE,
      supersedesStateId: state.id,
    });
  }
  return next;
}
