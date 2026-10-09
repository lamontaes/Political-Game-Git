import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { adultLifeSituations } from "../simulation/adult-situations";
import {
  CRIME_EVENT_TYPES,
  recordSampledCrime,
  unreportedOffenseFor,
} from "../simulation/crime/producer";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import {
  deserializeWorld,
  serializeWorldPayload,
} from "../simulation/serialization";
import { chooseAdultOption } from "./adult-life";

const places = lifePlaceStateIdentities().map((place) => place.usps);

describe("crime choices remember recorded occurrences", () => {
  it("covers every state, district and territory", () => {
    expect(places).toHaveLength(56);
    expect(new Set(places).size).toBe(56);
  });

  it.each(places)(
    "binds the incident and preserves selected and quiet responses in %s",
    (place) => {
      const fixture = smallWorld({
        place,
        seed: `p2-g-crime-memory:${place}`,
        people: 3,
      });
      const personId = fixture.personId;
      expect(
        ageOnDate(
          fixture.world.people[personId]!.birthDate,
          fixture.world.currentDate,
        ),
      ).toBeGreaterThanOrEqual(18);
      const happened = recordSampledCrime(
        fixture.world,
        makeIsoDate(`${fixture.world.currentDate.slice(0, 7)}-01`),
        {
          offense: "assault",
          jurisdictionId: fixture.jurisdictionId,
          targetId: personId,
          victimPersonIds: [personId],
          occurredAt: fixture.world.currentDate,
          reported: false,
          playerChooses: personId,
        },
      );
      const incident = unreportedOffenseFor(happened, personId)!;
      expect(incident.type).toBe(CRIME_EVENT_TYPES.unreported);
      const situation = adultLifeSituations(happened, {
        personId,
        asOfDate: happened.currentDate,
      }).find((row) => row.key === "adult.crime-report")!;
      const option = situation.options.find((row) => row.key === "report-it")!;
      expect(option.memory).toBe(incident.summary);
      expect(option.memory.trim()).not.toBe("");
      expect(option.memory).not.toBe(option.label);
      expect(
        happened.history.events.filter(
          (row) => row.type === CRIME_EVENT_TYPES.reported,
        ),
      ).toHaveLength(0);

      const reported = chooseAdultOption(happened, {
        personId,
        situationKey: "adult.crime-report",
        optionKey: "report-it",
      });
      const report = reported.history.events.find(
        (row) => row.stableKey === `${incident.stableKey}:reported-later`,
      )!;
      expect(report.type).toBe(CRIME_EVENT_TYPES.reported);
      expect(report.participants).toContainEqual({
        personId,
        role: "agency:crime-reporter",
        detail: null,
      });
      const choice = reported.history.events.find(
        (row) =>
          row.tags.includes("adult.crime-report") &&
          row.tags.includes("choice.report-it"),
      )!;
      expect(choice.context.choice).toBe(option.label);
      expect(choice.summary).toBe(incident.summary);
      expect(
        reported.history.memories.filter((row) => row.eventId === choice.id),
      ).toEqual([
        expect.objectContaining({ rememberedSummary: incident.summary }),
      ]);
      const loaded = deserializeWorld(serializeWorldPayload(reported));
      expect(loaded.history.events.find((row) => row.id === report.id)).toEqual(
        report,
      );
      expect(loaded.history.events.find((row) => row.id === choice.id)).toEqual(
        choice,
      );
      expect(unreportedOffenseFor(loaded, personId)).toBeNull();

      const quiet = chooseAdultOption(happened, {
        personId,
        situationKey: "adult.crime-report",
        optionKey: "keep-it-to-yourself",
      });
      const quietLoaded = deserializeWorld(serializeWorldPayload(quiet));
      expect(
        quietLoaded.history.events.filter(
          (row) => row.type === CRIME_EVENT_TYPES.reported,
        ),
      ).toHaveLength(0);
      expect(
        quietLoaded.history.events.some((row) =>
          row.tags.includes("choice.keep-it-to-yourself"),
        ),
      ).toBe(true);
    },
  );
});
