import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, makeIsoDate } from "../dates";
import { lifePlaceSearch } from "../life-places";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import type { World } from "../types";
import {
  HAZARD_EPISODE_TRANSITION_KEY,
  HAZARD_SAMPLE_TRANSITION_KEY,
  STORM_CATALOG,
  hazardSampleHandler,
  crisisRecords,
  representedHazardAreas,
  representedRate,
  sampleMonthlyHazards,
} from "./index";

const LONG = 900_000;

/**
 * CRUNCH47 C2: hazards occur on their own, from the recorded catalog, bounded
 * by what this World represents — and nothing happens where nothing is
 * exposed.
 */
function open(seed: string, placeKey: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 30,
      depth: "summarize-earlier-life",
    }),
  ).game!;
}

const peebles = lifePlaceSearch("Peebles", 20, {
  stateJurisdictionKey: "US-OH",
  scope: "locality",
}).find((place) => /\bPeebles\b/i.test(place.displayName))!;

describe("automatic hazard production", () => {
  it("rates come from the catalog and are thinned to one represented place", () => {
    expect(STORM_CATALOG.stateMonthlyCatalog).toBeDefined();
    const june = representedRate("KY", "thunderstorm-wind", 6)!;
    const january = representedRate("KY", "thunderstorm-wind", 1)!;
    // A state-wide June rate is many episodes; one county's share is small.
    expect(june).toBeGreaterThan(0);
    expect(june).toBeLessThan(1);
    expect(june).toBeGreaterThan(january);
    // Every cell either has a number or says it has none; never NaN.
    for (const row of STORM_CATALOG.stateMonthlyCatalog!) {
      expect(Number.isNaN(row.episodesPerExposureYear ?? 0)).toBe(false);
    }
  });

  it(
    "a current opening samples episodes that name the recorded episode they came from",
    () => {
      const life = open("world47-hazard", peebles.key);
      const areas = representedHazardAreas(life.world);
      expect(areas.length).toBeGreaterThan(0);
      expect(
        life.world.history.futureDueItems.filter(
          (item) => item.transitionKey === HAZARD_SAMPLE_TRANSITION_KEY,
        ).length,
      ).toBe(1);

      // Over a year of ordinary time the stream produces its own episodes.
      const later = advanceWorld(
        life.world,
        400,
        createCampaignElectionTransitionRegistry(),
      );
      assertWorldIntegrity(later);
      const episodes = crisisRecords(later).filter(
        (record) => record.kind === "hazard-episode",
      );
      const sampled = episodes.filter((record) =>
        record.kind === "hazard-episode"
          ? record.basis.includes("historical-report-resampling")
          : false,
      );
      // Report what this seed produced, so the proof is a measurement.
      console.info(
        JSON.stringify({
          hazardEpisodes: episodes.length,
          sampledFromCatalog: sampled.length,
          days: 400,
        }),
      );
      for (const record of sampled) {
        if (record.kind !== "hazard-episode") continue;
        expect(record.sourceReference).toMatch(/^ncei-storm-events:/);
        expect(record.jurisdictionIds.length).toBeGreaterThan(0);
        for (const jurisdictionId of record.jurisdictionIds) {
          expect(
            areas.some((area) => area.jurisdictionId === jurisdictionId),
          ).toBe(true);
        }
      }
      // Only reports a town would live through become its disasters.
      for (const record of sampled) {
        if (record.kind !== "hazard-episode") continue;
        expect(["major", "catastrophic"]).toContain(record.magnitude);
      }
      // Episodes are drawn on their recorded day, not all on the first.
      const drawnDays = Array.from({ length: 12 }, (_, month) =>
        sampleMonthlyHazards(
          life.world,
          makeIsoDate(`2027-${String(month + 1).padStart(2, "0")}-01`),
        ),
      ).flat();
      expect(drawnDays.length).toBeGreaterThan(2);
      expect(drawnDays.some((sample) => sample.dayOfMonth !== 1)).toBe(true);
      const due = life.world.history.futureDueItems.find(
        (item) => item.transitionKey === HAZARD_SAMPLE_TRANSITION_KEY,
      )!;
      const arrivals = Array.from({ length: 24 }, (_, month) => {
        const dueAt = makeIsoDate(
          `${2027 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}-01`,
        );
        return hazardSampleHandler(life.world, { ...due, dueAt })
          .world.history.futureDueItems.filter(
            (item) => item.transitionKey === HAZARD_EPISODE_TRANSITION_KEY,
          )
          .map((item) => item.dueAt);
      }).flat();
      console.info(JSON.stringify({ scheduledArrivals: arrivals.length }));
      expect(arrivals.length).toBeGreaterThan(0);
      expect(arrivals.every((date) => !date.endsWith("-01"))).toBe(true);
      // Replaying the same month on the same world gives the same sample.
      const month = makeIsoDate(
        addDays(life.world.currentDate, 40).slice(0, 8) + "01",
      );
      expect(JSON.stringify(sampleMonthlyHazards(life.world, month))).toBe(
        JSON.stringify(sampleMonthlyHazards(life.world, month)),
      );
    },
    LONG,
  );

  it("a world with nothing exposed produces nothing", () => {
    const empty = {
      ...({} as World),
      jurisdictionOrder: [],
      jurisdictions: {},
      history: { futureDueItems: [] },
    } as unknown as World;
    expect(representedHazardAreas(empty)).toHaveLength(0);
    expect(sampleMonthlyHazards(empty, makeIsoDate("2026-06-01"))).toHaveLength(
      0,
    );
  });
});
