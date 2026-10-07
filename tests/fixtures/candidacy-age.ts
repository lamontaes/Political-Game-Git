import {
  candidacyPackForJurisdiction,
  electiveOfficesForJurisdiction,
} from "../../src/simulation/candidacy";
import { ageOnDate } from "../../src/simulation/dates";
import type { EntityId, World } from "../../src/simulation/types";

/** Select fixture people against the office record, without inventing an age.
 * Unknown qualifications cannot establish an eligible fixture person.
 */
export function fixtureMeetsRecordedCandidacyAge(
  world: World,
  personId: EntityId,
): boolean {
  const person = world.people[personId];
  if (!person) return false;
  const pack = candidacyPackForJurisdiction(person.homeJurisdictionId);
  const office = pack?.offices[0];
  if (!pack || !office) return false;
  const age = electiveOfficesForJurisdiction(
    person.homeJurisdictionId,
    world.currentDate,
  ).find((row) => row.officeKey === office.officeKey)?.qualification.minimumAge;
  return (
    age?.kind === "known" &&
    ageOnDate(person.birthDate, world.currentDate) >= age.value
  );
}
