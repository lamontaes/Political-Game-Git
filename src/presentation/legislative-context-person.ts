import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  drawCanonicalNameForGender,
  makeIsoDate,
  SeededRng,
} from "../simulation";
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
  const name = drawCanonicalNameForGender(rng, "unstated");
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
          birthDate: colleagueBirthDate(world.currentDate),
          homeJurisdictionId: input.jurisdictionId,
        },
      },
    ],
  }).world;
}

/** An adult old enough to be seated. No other claim is made about them. */
function colleagueBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 51}${currentDate.slice(4)}`,
  );
}
