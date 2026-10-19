/**
 * A household's move into a new home (the housing engine's `housing.moved`
 * record) becomes a moment for the watched person it names, scored from the
 * recorded cause (pool: world-new-homes-moves-read). The fixture world stands
 * in for the housing engine; the engine's own record is checked in the played
 * world by world-moments.test.ts.
 */
import { expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../core2/life";
import { P } from "../core2/parameters";
import type { CoreInput, CoreModule, Source } from "../core2/types";
import { createDirector } from "./ledger";

const startedAt = "2021-01-01";
const placeId = "place:moved-fixture";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled small move input, not observed people.",
  estimatedFrom: "Authored fixture identities.",
};
const id = "person:mover";
const input: CoreInput = {
  seed: "housing-moved-moment",
  startedAt,
  people: [
    {
      id,
      givenName: "Mover",
      familyName: "Fixture",
      birthDate: "1985-01-01",
      placeId,
      countyId: `${placeId}:county`,
      householdId: "household:mover",
      tier: "daily",
      traits: {},
      liquidMinor: P.zero,
      livingCostDailyMinor: P.zero,
      familyIds: [],
      knownIds: [],
      source,
    },
  ],
  households: [{ id: "household:mover", placeId, memberIds: [id], source }],
  jobs: [],
  organizations: [],
  familyLinks: [],
  focusPersonIds: [id],
  focusPlaceIds: [],
  calendarDates: [],
  gaps: [],
};

const eventId = "event:housing-move:household:mover:2021-01-10";
const housingWorld: CoreModule = {
  id: "housing-world",
  onAfterDay(api) {
    if (api.state.date !== "2021-01-10") return;
    api.emit({
      id: eventId,
      date: api.state.date,
      kind: "housing.moved",
      personIds: [id],
      placeId,
      publicRecord: false,
      topic: "project:fixture",
      source,
    });
  },
};

it("scores a recorded move into a new home as a moment that cites the record", () => {
  const director = createDirector({ watch: [id] });
  const core = createLifeCore(input, {
    scheduledWork: false,
    modules: [housingWorld, director.module],
  });
  director.start(core);
  advanceCore(core, "2021-01-15");
  const moments = director.ledger.people.get(id)!.moments;
  const moved = moments.filter((row) => row.causeId === eventId);
  expect(moved.map((row) => row.personId)).toEqual([id]);
  expect(moved[0]!.impact).toBeGreaterThan(0);
});
