import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { simulationMomentAtLocalTime } from "../simulation/dates";
import {
  holdProtest,
  inviteToProtest,
  organizeProtest,
  protestAttendance,
  protests,
} from "../simulation/living-world/protests";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  createFormationContext,
  recordPrivateBelief,
} from "../simulation/politics";
import { recordRelationshipInteraction } from "../simulation/records";
import { advanceWorldMinutes } from "../simulation/time-work";
import { placeForLocationKey } from "./place-backdrops";
import { protestLocationKey, protestPresentPeople } from "./protest-presence";

const SEED = "sc4-protest-rally-stage-20261006";
const place = drawRandomPlace(
  SEED,
  (row) => municipalGovernmentForLifePlace(row) !== null,
);

describe(`a protest day shows the rally stage (seed ${SEED}, ${place.displayName})`, () => {
  it("places the organizer and the recorded attendees, only on the day it was held", () => {
    const small = smallWorld({
      place: place.key,
      date: "2026-01-05",
      seed: SEED,
      people: 12,
      household: true,
    });
    let world = small.world;
    const organizer = world.personOrder[0]!;
    const supporter = world.personOrder[1]!;
    const bystander = world.personOrder[2]!;
    const proposition = Object.values(world.policyCatalog.propositions)[0]!;
    world = recordPrivateBelief(world, {
      stableKey: `protest-view:${supporter}`,
      personId: supporter,
      propositionId: proposition.id,
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "I want this proposition enacted and will show up for it.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `protest-tie:${supporter}`,
      personIds: [supporter, organizer],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "care:looked-after",
      change: "strengthened",
      significance: "major",
      summary: "The organizer and resident have helped each other.",
      tags: [],
    });
    const startsAt = simulationMomentAtLocalTime({
      date: world.currentDate,
      minuteOfDay: Math.max(world.currentMoment.minuteOfDay, 10 * 60),
      timeZone: world.currentMoment.timeZone,
    });
    world = organizeProtest(world, {
      stableKey: "protest:sc4",
      organizerPersonId: organizer,
      jurisdictionId: small.jurisdictionId,
      propositionId: proposition.id,
      stance: "support",
      startsAt,
      placeKey: "public-sidewalk",
      placeLabel: `${place.displayName} public sidewalk`,
    });
    const key = protests(world)[0]!.stableKey;
    world = inviteToProtest(world, {
      protestKey: key,
      minutes: 240,
      outreachKey: "protest-outreach",
    });
    // Planned and invited, not yet held: no stage for anyone.
    expect(protestLocationKey(world, organizer)).toBeNull();
    expect(protestPresentPeople(world, organizer)).toEqual([]);

    const held = holdProtest(
      advanceWorldMinutes(
        world,
        startsAt.minuteOfDay - world.currentMoment.minuteOfDay,
      ),
      key,
    );
    const attendees = protestAttendance(held, key);
    expect(attendees, `${SEED} ${place.key}`).toContain(supporter);
    // The organizer, viewing, sees the attendees on the stage.
    const locationKey = protestLocationKey(held, organizer)!;
    expect(placeForLocationKey(held, organizer, locationKey)).toBe(
      "rally-stage",
    );
    const seen = protestPresentPeople(held, organizer).map((p) => p.personId);
    expect(seen).toEqual(expect.arrayContaining(attendees));
    expect(seen).not.toContain(organizer);
    for (const id of seen) expect(held.people[id]).toBeDefined();
    // A resident who did not attend and did not organize sees no stage.
    if (!attendees.includes(bystander)) {
      expect(protestLocationKey(held, bystander)).toBeNull();
      expect(protestPresentPeople(held, bystander)).toEqual([]);
    }
    // An attendee sees the organizer on the stage too.
    expect(
      protestPresentPeople(held, supporter).map((p) => p.personId),
    ).toContain(organizer);
    // The next day the protest is over.
    const later = advanceWorldMinutes(held, 24 * 60);
    expect(protestLocationKey(later, organizer)).toBeNull();
  }, 120_000);
});
