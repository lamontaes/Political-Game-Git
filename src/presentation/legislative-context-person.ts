import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  drawGeneratedPersonName,
  SeededRng,
} from "../simulation";
import { inventedPersonBirthDate } from "../simulation/invented-person-age";
import type { EntityId, IsoDate, World } from "../simulation";

/** Whether these two people have any recorded history with each other. */
export function ensureContextPerson(
  world: World,
  input: {
    readonly stableKey: string;
    readonly playerPersonId: EntityId;
    readonly jurisdictionId: EntityId;
  },
): World {
  const personId = characterHistoryContextPersonId(world, input.stableKey);
  if (world.people[personId]) return world;
  const rng = new SeededRng(world.seed).fork(input.stableKey);
  const name = drawGeneratedPersonName(rng);
  return applyCharacterHistoryPlan(world, {
    stableKey: input.stableKey,
    mode: "quick-generated",
    personId: input.playerPersonId,
    transitions: [
      {
        kind: "context-person",
        input: {
          stableKey: input.stableKey,
          givenName: name.givenName,
          familyName: name.familyName,
          identity: name.identity,
          birthDate: colleagueBirthDate(world.currentDate),
          homeJurisdictionId: input.jurisdictionId,
        },
      },
    ],
  }).world;
}

/** An adult old enough to be seated. No other claim is made about them. */
function colleagueBirthDate(currentDate: IsoDate): IsoDate {
  return inventedPersonBirthDate(null, {
    role: "seated-colleague",
    referenceDate: currentDate,
    age: 51,
    placement: { monthDay: currentDate.slice(5) as `${number}-${number}` },
  });
}
