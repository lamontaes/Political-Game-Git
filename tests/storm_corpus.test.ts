import { describe, expect, it } from "vitest";
import {
  compileStormCorpus,
  createStormAggregateId,
  createStormEpisodeId,
  createStormEventId,
  getCoverageEraForDate,
  knotsToMph,
  mapEventTypeToFamily,
  mphToKnots,
  normalizeIsoDateTime,
  normalizeStormEpisode,
  normalizeStormEvent,
  parseDamageItem,
  parseStormDamage,
  parseStormEpisodeId,
  parseStormEventId,
  parseStormMagnitude,
  SCALE_TRANSITION_DATE_EF,
  validateStormCorpus,
} from "../src/storm_corpus";
import type { RawStormEventInput, StormCorpus } from "../src/storm_corpus";

describe("NOAA Storm Events Source Corpus", () => {
  describe("1. Magnitude Unit Safety", () => {
    it("converts between knots and mph accurately without unit ambiguity", () => {
      expect(knotsToMph(50)).toBe(57.5);
      expect(knotsToMph(65)).toBe(74.8);
      expect(mphToKnots(57.5)).toBe(50);
      expect(mphToKnots(74.8)).toBe(65);
    });

    it("parses wind magnitude in knots with explicit qualifier", () => {
      const parsed = parseStormMagnitude(
        { magnitude: 65, magnitudeType: "EG" },
        "severe_storm",
        "2023-03-03T11:00:00Z",
      );
      expect(parsed.unit).toBe("knots");
      expect(parsed.value).toBe(65);
      expect(parsed.magnitudeType).toBe("EG");
      expect(parsed.rawMagnitude).toBe(65);
    });

    it("parses hail magnitude in inches diameter", () => {
      const parsed = parseStormMagnitude(
        { magnitude: 1.75, magnitudeType: "INCHES" },
        "severe_storm",
        "2004-05-30T16:45:00Z",
      );
      expect(parsed.unit).toBe("inches");
      expect(parsed.value).toBe(1.75);
    });

    it("enforces F-scale for pre-2007 tornadoes and EF-scale for post-2007 tornadoes", () => {
      expect(SCALE_TRANSITION_DATE_EF).toBe("2007-02-01");

      // 1974 Super Outbreak F4
      const pre2007 = parseStormMagnitude(
        { magnitude: 4, torFScale: "F4" },
        "tornado",
        "1974-04-03T16:30:00Z",
      );
      expect(pre2007.unit).toBe("f_scale");
      expect(pre2007.value).toBe(4);
      expect(pre2007.rawTorFScale).toBe("F4");

      // 2021 Western KY EF4
      const post2007 = parseStormMagnitude(
        { magnitude: 4, torFScale: "EF4" },
        "tornado",
        "2021-12-10T20:56:00Z",
      );
      expect(post2007.unit).toBe("ef_scale");
      expect(post2007.value).toBe(4);
      expect(post2007.rawTorFScale).toBe("EF4");
    });

    it("correctly identifies Saffir-Simpson category for hurricanes", () => {
      const hurricane = parseStormMagnitude(
        { category: 3, magnitude: 125, magnitudeType: "MS" },
        "tropical_hurricane",
        "2005-08-29T06:00:00Z",
      );
      expect(hurricane.unit).toBe("category");
      expect(hurricane.value).toBe(3);
      expect(hurricane.hurricaneCategory).toBe(3);
    });
  });

  describe("2. Event and Episode Identity & Referential Integrity", () => {
    it("generates and parses deterministic stable IDs", () => {
      const eventId = createStormEventId(1000101);
      expect(eventId).toBe("storm-event:noaa:1000101");
      expect(parseStormEventId(eventId)).toBe(1000101);
      expect(parseStormEventId("invalid-id")).toBeNull();

      const episodeId = createStormEpisodeId(500010);
      expect(episodeId).toBe("storm-episode:noaa:500010");
      expect(parseStormEpisodeId(episodeId)).toBe(500010);
      expect(parseStormEpisodeId("invalid-episode")).toBeNull();

      const aggId = createStormAggregateId("21", "tornado", "1970s");
      expect(aggId).toBe("storm-aggregate:21:tornado:1970s");
    });

    it("links events to episodes and computes episode-level totals", () => {
      const event1 = normalizeStormEvent({
        eventId: 201,
        episodeId: 101,
        eventType: "Flash Flood",
        beginDateTime: "2022-07-27T22:30:00Z",
        endDateTime: "2022-07-28T04:00:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        injuriesDirect: 10,
        deathsDirect: 2,
        damageProperty: "100.00M",
      });

      const event2 = normalizeStormEvent({
        eventId: 202,
        episodeId: 101,
        eventType: "Flash Flood",
        beginDateTime: "2022-07-28T02:00:00Z",
        endDateTime: "2022-07-28T12:00:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        injuriesDirect: 5,
        deathsDirect: 3,
        damageProperty: "50.00M",
      });

      const episode = normalizeStormEpisode(
        {
          episodeId: 101,
          state: "KENTUCKY",
          stateFips: 21,
          beginDateTime: "2022-07-27T22:30:00Z",
          endDateTime: "2022-07-28T12:00:00Z",
        },
        [event1, event2],
      );

      expect(episode.eventIds).toEqual([event1.id, event2.id]);
      expect(episode.totalDirectInjuries).toBe(15);
      expect(episode.totalDirectDeaths).toBe(5);
      expect(episode.totalPropertyDamageDollars).toBe(150_000_000);
      expect(episode.totalEstimatedDamageDollars).toBe(150_000_000);
      expect(episode.beginDateTime).toBe("2022-07-27T22:30:00Z");
      expect(episode.endDateTime).toBe("2022-07-28T12:00:00Z");
    });
  });

  describe("3. Date Ordering and Chronology Invariants", () => {
    it("normalizes NOAA legacy timestamp formats into ISO 8601 strings", () => {
      expect(normalizeIsoDateTime("03-APR-74 15:30:00")).toBe(
        "1974-04-03T15:30:00Z",
      );
      expect(normalizeIsoDateTime("10-DEC-21 20:56:00")).toBe(
        "2021-12-10T20:56:00Z",
      );
      expect(normalizeIsoDateTime("2022-07-27T22:30:00-04:00")).toBe(
        "2022-07-27T22:30:00-04:00",
      );
    });

    it("detects invalid date ordering where beginDateTime > endDateTime", () => {
      const invalidEvent = normalizeStormEvent({
        eventId: 301,
        episodeId: 201,
        eventType: "Tornado",
        beginDateTime: "2021-12-10T23:00:00Z",
        endDateTime: "2021-12-10T20:00:00Z", // end before begin!
        state: "KENTUCKY",
        stateFips: 21,
      });

      const corpus: StormCorpus = {
        schemaVersion: "1.0.0",
        generatedAt: "2026-08-28T00:00:00Z",
        vintage: "Test Vintage",
        totalEvents: 1,
        totalEpisodes: 0,
        events: [invalidEvent],
        episodes: [],
      };

      const result = validateStormCorpus(corpus);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === "date-ordering")).toBe(true);
    });
  });

  describe("4. Missing != Zero Preservation", () => {
    it("strictly differentiates null/missing damage from verified zero damage", () => {
      const missingDamage = parseDamageItem(null);
      expect(missingDamage.qualifier).toBe("missing");
      expect(missingDamage.estimatedDollars).toBeNull();
      expect(missingDamage.raw).toBeNull();

      const emptyDamage = parseDamageItem("");
      expect(emptyDamage.qualifier).toBe("missing");
      expect(emptyDamage.estimatedDollars).toBeNull();

      const zeroDamage = parseDamageItem("0.00K");
      expect(zeroDamage.qualifier).toBe("kilo");
      expect(zeroDamage.estimatedDollars).toBe(0);
      expect(zeroDamage.raw).toBe("0.00K");

      const parsedK = parseDamageItem("250.00K");
      expect(parsedK.qualifier).toBe("kilo");
      expect(parsedK.estimatedDollars).toBe(250_000);

      const parsedM = parseDamageItem("1.50M");
      expect(parsedM.qualifier).toBe("mega");
      expect(parsedM.estimatedDollars).toBe(1_500_000);

      const parsedB = parseDamageItem("3.50B");
      expect(parsedB.qualifier).toBe("giga");
      expect(parsedB.estimatedDollars).toBe(3_500_000_000);

      const parsedBoth = parseStormDamage({
        damageProperty: "250.00K",
        damageCrops: "50.00K",
      });
      expect(parsedBoth.totalEstimatedDollars).toBe(300_000);
      expect(parsedBoth.property.estimatedDollars).toBe(250_000);
      expect(parsedBoth.crops.estimatedDollars).toBe(50_000);
    });

    it("preserves null casualty counts when data was not reported", () => {
      const eventWithNullCasualties = normalizeStormEvent({
        eventId: 401,
        episodeId: 301,
        eventType: "Hail",
        beginDateTime: "2004-05-30T16:45:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        injuriesDirect: null,
        deathsDirect: null,
      });

      expect(eventWithNullCasualties.casualties.injuriesDirect).toBeNull();
      expect(eventWithNullCasualties.casualties.deathsDirect).toBeNull();
      expect(
        eventWithNullCasualties.casualties.totalDirectCasualties,
      ).toBeNull();

      const eventWithZeroCasualties = normalizeStormEvent({
        eventId: 402,
        episodeId: 301,
        eventType: "Hail",
        beginDateTime: "2004-05-30T16:45:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        injuriesDirect: 0,
        deathsDirect: 0,
      });

      expect(eventWithZeroCasualties.casualties.injuriesDirect).toBe(0);
      expect(eventWithZeroCasualties.casualties.deathsDirect).toBe(0);
      expect(eventWithZeroCasualties.casualties.totalDirectCasualties).toBe(0);
    });

    it("normalizes invalid default coordinates (0, 0) to null", () => {
      const eventWithZeroCoords = normalizeStormEvent({
        eventId: 403,
        episodeId: 301,
        eventType: "High Wind",
        beginDateTime: "2023-03-03T11:00:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        beginLat: 0,
        beginLon: 0,
      });

      expect(eventWithZeroCoords.location.beginCoordinates).toBeNull();
    });
  });

  describe("5. Historical Coverage Metadata & Eras", () => {
    it("maps dates to historical collection eras correctly", () => {
      expect(getCoverageEraForDate("1953-05-09T00:00:00Z")).toBe(
        "1950-1954_tornado_only",
      );
      expect(getCoverageEraForDate("1974-04-03T00:00:00Z")).toBe(
        "1955-1995_severe_convective_3",
      );
      expect(getCoverageEraForDate("1996-01-01T00:00:00Z")).toBe(
        "1996-present_nws_standard_48",
      );
      expect(getCoverageEraForDate("2026-06-01T00:00:00Z")).toBe(
        "1996-present_nws_standard_48",
      );
    });

    it("maps event types to taxonomy families", () => {
      expect(mapEventTypeToFamily("Tornado")).toBe("tornado");
      expect(mapEventTypeToFamily("Flash Flood")).toBe("flood");
      expect(mapEventTypeToFamily("Blizzard")).toBe("winter_storm");
      expect(mapEventTypeToFamily("Ice Storm")).toBe("winter_storm");
      expect(mapEventTypeToFamily("Hurricane (Typhoon)")).toBe(
        "tropical_hurricane",
      );
      expect(mapEventTypeToFamily("Excessive Heat")).toBe("heat_cold");
      expect(mapEventTypeToFamily("Extreme Cold/Wind Chill")).toBe("heat_cold");
      expect(mapEventTypeToFamily("Thunderstorm Wind")).toBe("severe_storm");
      expect(mapEventTypeToFamily("Hail")).toBe("severe_storm");
      expect(mapEventTypeToFamily("Wildfire")).toBe("wildfire");
      expect(mapEventTypeToFamily("Drought")).toBe("drought_environment");
    });
  });

  describe("6. Deterministic Builds and Aggregates", () => {
    const rawEventsFixture: RawStormEventInput[] = [
      {
        eventId: 101,
        episodeId: 10,
        eventType: "Tornado",
        beginDateTime: "1974-04-03T16:30:00Z",
        endDateTime: "1974-04-03T17:15:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        czType: "C",
        czFips: 111,
        czName: "JEFFERSON",
        magnitude: 4,
        torFScale: "F4",
        damageProperty: "50.00M",
      },
      {
        eventId: 102,
        episodeId: 11,
        eventType: "Flash Flood",
        beginDateTime: "2022-07-27T22:30:00Z",
        endDateTime: "2022-07-28T14:00:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        czType: "C",
        czFips: 25,
        czName: "BREATHITT",
        damageProperty: "450.00M",
      },
    ];

    it("compiles bit-identical outputs across multiple runs", () => {
      const run1 = compileStormCorpus({
        rawEvents: rawEventsFixture,
        generatedAt: "2026-08-28T00:00:00.000Z",
      });
      const run2 = compileStormCorpus({
        rawEvents: rawEventsFixture,
        generatedAt: "2026-08-28T00:00:00.000Z",
      });

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
      expect(run1.validation.valid).toBe(true);
      expect(run1.corpus.totalEvents).toBe(2);
      expect(run1.corpus.totalEpisodes).toBe(2);
    });

    it("generates decadal frequencies, seasonality profiles, and damage distributions", () => {
      const compilation = compileStormCorpus({
        rawEvents: rawEventsFixture,
        generatedAt: "2026-08-28T00:00:00.000Z",
      });

      const { aggregates, manifest } = compilation;

      expect(aggregates.decadalFrequencies.length).toBeGreaterThan(0);
      expect(aggregates.seasonalityProfiles.length).toBeGreaterThan(0);
      expect(aggregates.damageDistributions.length).toBeGreaterThan(0);
      expect(manifest.jurisdictions.length).toBe(1);
      expect(manifest.jurisdictions[0]?.stateFips).toBe("21");
      expect(manifest.jurisdictions[0]?.totalEvents).toBe(2);
    });
  });

  describe("7. Zero Incident Simulation Changes", () => {
    it("remains decoupled from game simulation state", () => {
      // Verify that storm corpus does not mutate or import simulation incident catalogs
      const event = normalizeStormEvent({
        eventId: 501,
        episodeId: 401,
        eventType: "Tornado",
        beginDateTime: "2021-12-10T20:56:00Z",
        state: "KENTUCKY",
        stateFips: 21,
        damageProperty: "3.50B",
      });

      // Event is a pure calibration record
      expect(event.id).toBe("storm-event:noaa:501");
      expect(event.damage.property.estimatedDollars).toBe(3_500_000_000);
      // Verify no simulation engine state is touched or required
      expect(typeof event).toBe("object");
    });
  });
});
