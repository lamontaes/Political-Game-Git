/**
 * The roles a person holds in their place's life, as generation of who exists
 * (Coordinator, Nov 8: county people need the roles and ties that make real
 * people run, read the same way for named people and counted ones): how active
 * they are in a party and the employer they own. They sit on `looks`
 * (`partyActivity`, `ownedEmployerId`), so a counted member keeps them in the
 * store and a filled-in person has them. The civic roles a person holds (a
 * party's chair, a seat at its committee meetings) are read from the parties
 * engine's own records (`civicRolesOf` in modules/candidacy.ts), never stored
 * here.
 */
import { stableHash } from "./kernel/ids";
import { parameter as p } from "./parameters";
import type { CoreInput, PersonInput } from "./types";

/** A person's place on the unit line, from the world's seed and their id (the same every time). */
function quantile(seed: string, id: string, purpose: string): number {
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  return (
    Number.parseInt(
      stableHash(`${seed}:${purpose}:${id}`).slice(0, digits),
      radix,
    ) /
    radix ** digits
  );
}

/**
 * Everyone of voting age gets a party activity: nothing for most, and for the
 * active share (`partyActiveShare`, the share who work for a party or
 * candidate) a level from just above 0 to 1 by where they stand within it, so
 * activity slides and no one flips at a line.
 */
export function partyActivityOf(seed: string, id: string): number {
  const share = p("partyActiveShare");
  const u = quantile(seed, id, "party-activity");
  return u < 1 - share ? 0 : (u - (1 - share)) / share;
}

export function withRoles(input: CoreInput): CoreInput {
  const adult = p("votingAge");
  const start = Date.parse(`${input.startedAt}T00:00:00Z`);
  const meanYear = p("daysPerMeanYear") * 86_400_000;
  const people = input.people.map((person): PersonInput => {
    const age =
      (start - Date.parse(`${person.birthDate}T00:00:00Z`)) / meanYear;
    if (age < adult) return person;
    const activity = partyActivityOf(input.seed, person.id);
    if (activity <= 0) return person;
    return {
      ...person,
      looks: {
        ...(person.looks ?? {}),
        partyActivity: activity.toFixed(4),
      },
    };
  });
  return { ...input, people };
}
