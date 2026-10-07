import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { recordWorldEvent } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import { pickDistinct, SeededRng } from "../rng";
import type { EntityId, EventType, World } from "../types";
import {
  jailTermOn,
  sentencesOf,
  PROSECUTION_SENTENCED_EVENT,
} from "./jail-terms";

const SEED = "b13-p4-saved-reversal-custody";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  lifePlaceStateIdentities().length,
).map(
  ({ jurisdictionKey }) =>
    pickDistinct(
      new SeededRng(`${SEED}:${jurisdictionKey}`),
      searchLifePlaces("", 50, { stateJurisdictionKey: jurisdictionKey }),
      1,
    )[0]!,
);

function event(
  world: World,
  key: string,
  personId: EntityId,
  type: EventType,
  tags: readonly string[],
): World {
  return recordWorldEvent(world, {
    stableKey: key,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:defendant", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags,
    summary: "Controlled saved-court-history fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe(`saved appellate custody consequences across all 56 places (${SEED})`, () => {
  it.each(places)(
    "ends only the reversed sentence in $displayName",
    (place) => {
      let world = createScenarioWorld(`${SEED}:${place.key}`, place.context, {
        peopleCount: 3,
      });
      const personId = world.personOrder[0]!;
      const otherId = world.personOrder[1]!;
      world = event(
        world,
        "sentence:first",
        personId,
        PROSECUTION_SENTENCED_EVENT,
        ["justice.sentence:jail", "justice.sentence-months:12"],
      );
      const firstId = world.history.events.at(-1)!.id;
      world = event(
        world,
        "sentence:other",
        otherId,
        PROSECUTION_SENTENCED_EVENT,
        ["justice.sentence:jail", "justice.sentence-life"],
      );
      expect(jailTermOn(world, personId)).not.toBeNull();
      expect(jailTermOn(world, otherId)).not.toBeNull();
      for (const outcome of ["affirm", "send-back"]) {
        const unchanged = event(
          world,
          `appeal:${outcome}`,
          personId,
          "justice.appeal-decided",
          [`judgment:${firstId}`, `outcome:${outcome}`],
        );
        expect(jailTermOn(unchanged, personId)).not.toBeNull();
      }
      const reversed = event(
        world,
        "appeal:reverse",
        personId,
        "justice.appeal-decided",
        [`judgment:${firstId}`, "outcome:reverse"],
      );
      expect(jailTermOn(reversed, personId)).toBeNull();
      expect(jailTermOn(reversed, otherId)).not.toBeNull();
      expect(sentencesOf(reversed, personId)[0]!.until).toBe(world.currentDate);
      const loaded = deserializeWorld(serializeWorld(reversed));
      expect(jailTermOn(loaded, personId)).toBeNull();
      expect(jailTermOn(loaded, otherId)).not.toBeNull();
      console.log(
        `${place.displayName} (${place.stateJurisdictionKey}): reversed custody held -> released; other sentence held; affirm/send-back held`,
      );
    },
  );
});
