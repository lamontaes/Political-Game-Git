import { describe, expect, it } from "vitest";

import { enactedTaxFixture } from "../../../tests/fixtures/tax-policy-fixture";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { declareHazardEpisode } from "../crisis/disaster";
import { incidentStateAt } from "../incidents";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  migrationReviewHandler,
  statePushOnTown,
} from "../migration";
import { addDays } from "../dates";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { World } from "../types";
import {
  ESTIMATED_AVERAGE_BASE_OUTFLOW_PCT_PER_YEAR,
  RECORDED_PRESSURE_FADE_PER_QUARTER,
  BLANKET_HAZARD_PRESSURE,
  PRESSURE_SEAMS,
  assertPressureIntegrity,
  STATE_FLOWS_EVENT,
  UNREST_CALMED_PHASE,
  type PressureReading,
  causesInPeriod,
  latestReadings,
  stateFlows,
  stateWeights,
  stepPressure,
  unrestIncidentDefinition,
  worldStates,
} from ".";
import { stepPressureLadder } from "./ladder";

const LONG = 120_000;

/** Tucson, Arizona; Kentucky is deliberately not the test place. */
const ARIZONA_TOWN = "0477000";

function openLife() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "pressure-layer",
      startAge: 35,
      placeKey: ARIZONA_TOWN,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    home: game.world.people[game.playerPersonId]!.homeJurisdictionId,
  };
}

/**
 * Steps a quarter at a time without running the rest of the clock. Only the
 * date moves, so the whole-world check does not apply; the pressure store's
 * own check does.
 */
function quarters(world: World, count: number): World {
  let next = world;
  for (let n = 0; n < count; n += 1)
    next = stepPressure({
      ...next,
      currentDate: addDays(next.currentDate, 91),
    });
  return next;
}

describe("the pressure layer", { timeout: LONG }, () => {
  const opened = openLife();

  it("reads every state the world holds, and nothing is pushed with no cause", () => {
    const states = worldStates(opened.world);
    expect(states.length).toBeGreaterThan(1);
    const world = quarters(opened.world, 4);
    assertPressureIntegrity(world);
    // With no cause anywhere, nothing is kept: no reading, no flows (every
    // state would send the same share), and nothing for the press.
    expect(world.pressure).toMatchObject({
      quartersStepped: 4,
      readings: [],
      flows: [],
    });
    expect(latestReadings(world).size).toBe(0);
    expect(stateFlows(world)).toEqual([]);
    expect(
      world.history.events.some((event) => event.type === STATE_FLOWS_EVENT),
    ).toBe(false);
  });

  it("a declared disaster pushes people out of its state, and it fades", () => {
    const struck = declareHazardEpisode(opened.world, {
      stableKey: "pressure-test-flood",
      family: "flood",
      magnitude: "major",
      stateUsps: "AZ",
      jurisdictionIds: [opened.home],
      durationDays: 4,
      basis: "Declared test episode; not a local hazard prediction.",
      sourceReference: null,
    });
    const first = quarters(struck, 1);
    const arizona = latestReadings(first).get("US-AZ")!;
    expect(arizona.levels.leave).toBe(BLANKET_HAZARD_PRESSURE.major);
    expect(arizona.levels.fear).toBe(BLANKET_HAZARD_PRESSURE.major);
    expect(arizona.contributions.map((entry) => entry.causeKey)).toEqual([
      "hazard:flood:major",
      "hazard:flood:major",
    ]);
    // A household leaving the player's town is less likely to pick Arizona.
    const arizonaId = worldStates(first).find(
      (state) => state.stateKey === "US-AZ",
    )!.jurisdiction.id;
    expect(stateWeights(first, [arizonaId], "pull")[0]).toBeLessThan(1);
    expect(stateWeights(first, [arizonaId], "push")[0]).toBeGreaterThan(1);
    // A free household in the flooded state's town is more likely to leave.
    expect(statePushOnTown(first, opened.home)).toBeCloseTo(
      1 + BLANKET_HAZARD_PRESSURE.major,
    );
    expect(statePushOnTown(opened.world, opened.home)).toBe(1);
    // Oregon had nothing, so it has no reading and reads as no pressure.
    expect(latestReadings(first).has("US-OR")).toBe(false);

    const second = quarters(first, 1);
    expect(latestReadings(second).get("US-AZ")!.levels.leave).toBeCloseTo(
      BLANKET_HAZARD_PRESSURE.major * (1 - RECORDED_PRESSURE_FADE_PER_QUARTER),
    );

    // The year closes: Arizona sends more of its people out than any other
    // state, it is the least chosen destination, and the press can print it.
    const year = quarters(second, 2);
    assertPressureIntegrity(year);
    const flows = stateFlows(year);
    expect(flows).toHaveLength(worldStates(year).length);
    const fromArizona = flows.find((flow) => flow.fromStateKey === "US-AZ")!;
    const fromOregon = flows.find((flow) => flow.fromStateKey === "US-OR")!;
    expect(fromOregon.outflowSharePct).toBe(
      ESTIMATED_AVERAGE_BASE_OUTFLOW_PCT_PER_YEAR,
    );
    expect(fromArizona.outflowSharePct).toBeGreaterThan(
      fromOregon.outflowSharePct,
    );
    expect(
      fromOregon.destinations.some((entry) => entry.stateKey === "US-AZ"),
    ).toBe(false);
    const event = year.history.events.find(
      (row) => row.type === STATE_FLOWS_EVENT,
    )!;
    expect(event.visibility).toBe("public");
    expect(event.summary).toContain("Arizona");
    expect(event.tags).toContain("from:US-AZ");
    // Every other state pulls alike, so no destination is named.
    expect(event.summary).not.toContain("The most went to");
  });

  it("counts a disaster declared later on a review day, and only once", () => {
    // The review steps at the start of its day; the flood comes after it.
    const reviewed = stepPressure(opened.world);
    expect(reviewed.pressure?.lastPeriodEnd).toBe(opened.world.currentDate);
    const struck = declareHazardEpisode(reviewed, {
      stableKey: "pressure-test-review-day-flood",
      family: "flood",
      magnitude: "major",
      stateUsps: "AZ",
      jurisdictionIds: [opened.home],
      durationDays: 4,
      basis: "Declared test episode; not a local hazard prediction.",
      sourceReference: null,
    });
    const next = quarters(struck, 1);
    expect(latestReadings(next).get("US-AZ")?.levels.leave).toBe(
      BLANKET_HAZARD_PRESSURE.major,
    );
    // The following quarter's period starts on that day too, and skips it.
    const later = quarters(next, 1);
    const arizona = latestReadings(later).get("US-AZ")!;
    expect(arizona.contributions).toEqual([]);
    expect(arizona.levels.leave).toBeCloseTo(
      BLANKET_HAZARD_PRESSURE.major * (1 - RECORDED_PRESSURE_FADE_PER_QUARTER),
    );
  });

  it("the first quarterly review of a current opening takes the first reading, once", () => {
    expect(opened.world.pressure).toBeUndefined();
    // The review the opening scheduled, run by its own handler. Playing the
    // 92 days up to it ran the whole clock and took over five minutes; the
    // clock's running of due items is covered by its own tests.
    const due = opened.world.history.futureDueItems.find(
      (item) => item.transitionKey === MIGRATION_REVIEW_TRANSITION_KEY,
    )!;
    const world = migrationReviewHandler(opened.world, due).world;
    expect(world.pressure?.quartersStepped).toBe(1);
    // Stepping again on the same day writes nothing; a save keeps the readings.
    const stepped = stepPressure(world);
    expect(stepPressure(stepped)).toBe(stepped);
    expect(deserializeWorld(serializeWorld(world)).pressure).toEqual(
      world.pressure,
    );
  });
});

describe("an enacted state tax", () => {
  it("pushes people out when it rises", () => {
    const fixture = enactedTaxFixture();
    const policy = fixture.world.history.taxPolicies![0]!;
    const causes = causesInPeriod(
      { ...fixture.world, currentDate: policy.effectiveAt },
      policy.effectiveAt,
      policy.effectiveAt,
    );
    const contributions = [...causes.values()].flat();
    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({
      kind: "leave",
      sourceId: policy.id,
    });
    expect(contributions[0]!.amount).toBeGreaterThan(0);
  });
});

describe("the seam list", () => {
  it("names the rule the code follows for every cause and effect", () => {
    const keys = PRESSURE_SEAMS.map((seam) => seam.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const seam of PRESSURE_SEAMS)
      expect(seam.rule.trim().length, seam.key).toBeGreaterThan(20);
    for (const required of [
      "cause-starting-taxes",
      "cause-climate",
      "cause-opinion-of-laws",
      "unrest",
      "civil-war-and-revolution",
      "generational-memory",
    ])
      expect(keys).toContain(required);
  });
});

/**
 * A133: missing anger is not calm. Unrest calms only on anger read at or
 * under the line; with no anger read for the quarter it stays open. The
 * place is drawn by seed from all 56.
 */
const A133_SEED = "a133-missing-anger-1";
const a133Place = observerPlace(A133_SEED);

describe(`unrest with no anger read (A133), in ${a133Place.displayName} (${a133Place.key}, seed ${A133_SEED})`, () => {
  it(
    "stays open with no anger read, and calms on a low reading or a quarter that read nothing left",
    { timeout: 60_000 },
    () => {
      console.log(
        `A133 place: ${a133Place.displayName} (${a133Place.key}, ${a133Place.stateJurisdictionKey}), seed ${A133_SEED}`,
      );
      const opened = openObserverWorld(
        observerSetup(A133_SEED, a133Place.key),
      ).world;
      const stepped = stepPressure(opened);
      const state = worldStates(stepped).find(
        (row) => row.stateKey === a133Place.stateJurisdictionKey,
      )!;
      expect(state).toBeDefined();
      const reading = (world: World, anger: number): PressureReading => ({
        key: `a133:${world.currentDate}:${state.stateKey}`,
        ordinal: world.pressure!.quartersStepped,
        stateKey: state.stateKey,
        jurisdictionId: state.jurisdiction.id,
        periodStart: addDays(world.currentDate, -91),
        periodEnd: world.currentDate,
        levels: { leave: 0, arrive: 0, anger, fear: 0, hope: 0 },
        contributions: [],
      });
      const stateOf = (world: World) => {
        const unrest = world.history.incidents.find(
          (incident) =>
            incident.definitionId === unrestIncidentDefinition().id &&
            incident.scope.jurisdictionId === state.jurisdiction.id,
        )!;
        return incidentStateAt(world, unrest.id, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        })!;
      };

      // Anger well over the line opens unrest.
      const angry = stepPressureLadder(stepped, [reading(stepped, 1)]);
      expect(stateOf(angry).status).toBe("active");

      // A ladder step on a day the layer has not read: no anger is on
      // record for it, so the unrest stays open and no stage is written on
      // a reading nobody took.
      const later: World = {
        ...angry,
        pressure: {
          ...angry.pressure!,
          lastPeriodEnd: addDays(angry.currentDate, -91),
        },
      };
      const unread = stepPressureLadder(later, []);
      expect(stateOf(unread).status).toBe("active");
      expect(stateOf(unread).id).toBe(stateOf(angry).id);
      expect(unread.history.incidentStates).toHaveLength(
        later.history.incidentStates.length,
      );

      // A low reading calms it, and records what it read.
      const low = stepPressureLadder(later, [reading(later, 0.1)]);
      expect(stateOf(low).status).toBe("resolved");
      expect(stateOf(low).phaseKey).toBe(UNREST_CALMED_PHASE);
      expect(stateOf(low).context).toContain("Anger read 0.1000");

      // A quarter the layer stepped with nothing left to carry stores no
      // reading for the state: its anger was read as 0, so it calms too.
      expect(angry.pressure!.lastPeriodEnd).toBe(angry.currentDate);
      expect(latestReadings(angry).has(state.stateKey)).toBe(false);
      const calmed = stepPressureLadder(angry, []);
      expect(stateOf(calmed).status).toBe("resolved");
      expect(stateOf(calmed).context).toContain("Anger read 0.0000");
    },
  );
});
