import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { addDays } from "../dates";
import { governmentUnitsForState } from "../government-units";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../municipal-government";
import { lifePlaceByJurisdictionId } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import { ensureLocalCouncilMeetings } from "../living-world/local-council-meetings";
import { ensureLocalGovernmentSeats } from "../living-world/local-government-seats";

import {
  councilMeetingCadenceFor,
  councilMeetingPopulationBand,
  intervalFromRecordedCadence,
} from "./council-meeting-cadence";

describe("local council meeting cadence", () => {
  it("uses a place's recorded recurring schedule before estimating", () => {
    const row = councilMeetingCadenceFor({
      id: "gus2025:savannah",
      unitType: "municipality",
      placeGeoid: "1369000",
    });

    expect(row).toMatchObject({
      placeGeoid: "1369000",
      estimated: false,
      sourceGovernmentKey: "us-ga-savannah",
      sampleGovernmentKeys: ["us-ga-savannah"],
    });
    expect(row?.councilMeetingIntervalDays).toBeCloseTo(365.2425 / 24);
  });

  it("estimates from the median in the same body type and population band", () => {
    const row = councilMeetingCadenceFor({
      id: "gus2025:miami",
      unitType: "municipality",
      placeGeoid: "1245000",
    });

    expect(row).toMatchObject({
      placeGeoid: "1245000",
      governmentType: "municipality",
      populationBand: "250000-plus",
      councilMeetingIntervalDays: 365.2425 / 24,
      estimated: true,
      sourceGovernmentKey: null,
      sampleGovernmentKeys: ["us-nj-jersey-city"],
    });
  });

  it("leaves a band without read schedules unavailable instead of inventing an interval", () => {
    expect(
      councilMeetingCadenceFor({
        id: "gus2025:small-place",
        unitType: "municipality",
        placeGeoid: "5645050",
      }),
    ).toBeNull();
  });

  it("does not turn a descriptive OTHER cadence into a numeric period", () => {
    expect(
      intervalFromRecordedCadence({
        kind: "OTHER",
        ordinals: [],
        weekday: null,
        startTime: null,
        note: "The source did not establish a recurrence.",
      }),
    ).toBeNull();
  });

  it("uses explicit population bands for the median grouping", () => {
    expect(councilMeetingPopulationBand(49_999)).toBe("under-50000");
    expect(councilMeetingPopulationBand(50_000)).toBe("50000-to-249999");
    expect(councilMeetingPopulationBand(249_999)).toBe("50000-to-249999");
    expect(councilMeetingPopulationBand(250_000)).toBe("250000-plus");
  });

  it("prints a random-place new-game cadence row and schedules that same row", () => {
    const seed = "b05-p6-random-place-cadence-20261006";
    const candidates = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((state) =>
      governmentUnitsForState(state),
    )
      .filter(
        (unit) =>
          unit.unitType === "municipality" &&
          unit.functionalActive &&
          unit.placeGeoid,
      )
      .map((unit) => ({
        unit,
        rank: createHash("sha256").update(`${seed}:${unit.id}`).digest("hex"),
      }))
      .sort((left, right) => left.rank.localeCompare(right.rank))
      .flatMap(({ unit }) => {
        const government = municipalGovernmentByKey(unit.id);
        const row = councilMeetingCadenceFor(unit);
        return government &&
          municipalRulePackFor(government).ok &&
          row?.estimated === true
          ? [{ unit, row }]
          : [];
      });
    const selected = candidates[0];
    expect(selected).toBeDefined();

    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: selected!.unit.placeGeoid!,
      seed,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const place = lifePlaceByJurisdictionId(
      game.world.people[game.playerPersonId]!.homeJurisdictionId,
    );
    expect(place?.sourceGeoid).toBe(selected!.unit.placeGeoid);
    const seated = ensureLocalGovernmentSeats(game.world, game.playerPersonId);
    const scheduled = ensureLocalCouncilMeetings(seated, game.playerPersonId);
    const due = scheduled.history.futureDueItems.find(
      (item) =>
        item.transitionKey === "civic:local-council-meeting" &&
        item.jurisdictionId ===
          game.world.people[game.playerPersonId]!.homeJurisdictionId,
    );
    expect(due?.dueAt).toBe(
      addDays(
        scheduled.currentDate,
        Math.round(selected!.row.councilMeetingIntervalDays),
      ),
    );
    const continued = deserializeWorld(serializeWorld(scheduled));
    expect(
      continued.history.futureDueItems.find((item) => item.id === due?.id)
        ?.dueAt,
    ).toBe(due?.dueAt);
    console.log("B05 P6 random-place new-game cadence", {
      seed,
      worldId: scheduled.id,
      simulationDate: scheduled.currentDate,
      placeGeoid: place?.sourceGeoid,
      governmentUnitId: selected!.unit.id,
      intervalDays: selected!.row.councilMeetingIntervalDays,
      estimated: selected!.row.estimated,
      sampleGovernmentKeys: selected!.row.sampleGovernmentKeys,
      dueId: due?.id,
      nextMeeting: due?.dueAt,
    });
  });
});
