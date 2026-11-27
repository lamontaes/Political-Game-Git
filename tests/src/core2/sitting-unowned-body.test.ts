import { describe, expect, it } from "vitest";
import { sittingHours } from "../../../src/core2/sitting-closeness";
import { registerSittingCalendar } from "../../../src/core2/sitting-closeness";
import { createCore } from "../../../src/core2/state";
import type { CoreInput, PersonInput, Source } from "../../../src/core2/types";

const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-01-01",
  citation: "Fixture people for one boundary assertion, not observed people.",
  estimatedFrom: "Two supplied people and one body no reader owns.",
};
const person = (id: string): PersonInput => ({
  id,
  givenName: id,
  familyName: "Fixture",
  birthDate: "1980-01-01",
  placeId: "place:fixture",
  householdId: `household:${id}`,
  tier: "daily",
  traits: {},
  liquidMinor: 0,
  livingCostDailyMinor: 0,
  source,
  familyIds: [],
  knownIds: [],
});

describe("the shared hours of two people in a body no reader owns yet", () => {
  it("are none, and read no reader that is not there", () => {
    // The sitting readers are one list for the whole process, and a world
    // being built lists a person's bodies before the engine that keeps them
    // has opened: the body is listed, no reader owns it, the hours are zero.
    registerSittingCalendar({
      owns: () => false,
      seats: () => [],
      bodiesOf: () => ["office:fixture:council"],
      sittings: () => [],
      contactHoursPerDay: () => 0,
    });
    const people = [person("person:a"), person("person:b")];
    const core = createCore({
      seed: "sitting-unowned-body",
      startedAt: "2021-01-01",
      people,
      households: people.map((actor) => ({
        id: actor.householdId,
        placeId: actor.placeId,
        memberIds: [actor.id],
        source,
      })),
      jobs: [],
      organizations: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    } as unknown as CoreInput);
    expect(sittingHours(core, "person:a", "person:b")).toBe(0);
  });
});
