import { dateAtAge } from "./dates";
import { recordChildAuthorityState } from "./life";
import { childAuthorityStateAt } from "./life-queries";
import {
  AGE_OF_MAJORITY_RULES,
  ageOfMajorityFor,
  type AgeOfMajorityRules,
} from "./age-of-majority";
import type { World } from "./types";

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "coming-of-age-v1",
};

/**
 * Somebody who grows up is no longer anybody's child to answer for.
 *
 * A new game opens a child's life with a guardian or parent holding authority
 * over them, and nothing in play ever ended it. The summarized pasts end
 * theirs at eighteen ("Reached adulthood", see `character-history.ts`); this
 * does the same for a life that is played, but only where the child's own
 * state has a sourced rule.
 *
 * Every authority still active over somebody past their state's age of
 * majority ends on that birthday, with the basis it already had. It runs as
 * days pass and when a save is imported, so an older save is repaired the
 * next time it moves, back-dated to the birthday. Opening a save alone writes
 * nothing. Nothing is written for a child whose state has no rule, for an
 * authority recorded as starting at or after that birthday (it was written
 * about an adult on purpose), or for somebody who died before it. Running
 * this again changes nothing.
 *
 * `rules` exists for tests; play uses `AGE_OF_MAJORITY_RULES`.
 */
export function catchUpComingOfAge(
  world: World,
  rules: AgeOfMajorityRules = AGE_OF_MAJORITY_RULES,
): World {
  let next = world;
  for (const authority of world.history.childAuthorities) {
    const person = next.people[authority.childPersonId];
    if (!person) continue;
    const rule = ageOfMajorityFor(next, person.id, rules);
    if (!rule) continue;
    const majority = dateAtAge(person.birthDate, rule.age);
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
