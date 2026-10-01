import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import {
  currentGovernorOf,
  decideStateDisasterRequest,
  declareHazardEpisode,
} from "../crisis";
import { crisisRecords } from "../crisis/records";
import { addDays } from "../dates";
import { householdLocationAt } from "../life-queries";
import { searchLifePlaces } from "../life-places";
import type { World } from "../types";
import {
  BLANKET_POLITICAL_VIOLENCE,
  POLITICAL_THREAT_EVENT,
  PRESSURE_CONTRACT_VERSION,
  THREAT_ATTEMPTED_PHASE,
  UNREST_CALMED_PHASE,
  UNREST_EVENT,
  UNREST_LASTING_PHASE,
  causesInPeriod,
  internationalFriction,
  prominentPeopleIn,
  stepPressure,
  stepInternationalFriction,
  stepPressureEvents,
  threatAttemptLine,
  threatStrain,
  worldStates,
} from ".";

const LONG = 900_000;

/** Salem, Oregon's state; Kentucky is deliberately not the test place. */
const STATE = "OR";

function openLife(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${STATE}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return game;
}

/** The onset events of the ladder's incidents that carry `tag`. */
function eventsOf(world: World, tag: string) {
  return world.history.events.filter(
    (event) => event.type === "incident.occurred" && event.tags.includes(tag),
  );
}

/** Steps quarters by date alone, as the pressure layer's own test does. */
function quarters(world: World, count: number): World {
  let next = world;
  for (let n = 0; n < count; n += 1) {
    const stepped = stepPressure({
      ...next,
      currentDate: addDays(next.currentDate, 91),
    });
    next = stepPressureEvents(stepped);
  }
  return next;
}

describe("what pressure sets off", { timeout: LONG }, () => {
  it("sets off nothing when nothing feeds anger", () => {
    const game = openLife("pressure-events-quiet");
    const world = quarters(game.world, 8);
    expect(eventsOf(world, UNREST_EVENT)).toEqual([]);
    expect(eventsOf(world, POLITICAL_THREAT_EVENT)).toEqual([]);
    expect(
      crisisRecords(world).filter(
        (record) =>
          record.kind === "violence-attempt" ||
          record.kind === "international-crisis",
      ),
    ).toEqual([]);
  });

  it("names prominent people in office and out of it, only in their state", () => {
    const game = openLife("pressure-events-prominent");
    const people = prominentPeopleIn(game.world, `US-${STATE}`);
    const governor = currentGovernorOf(game.world, STATE);
    if (governor) expect(people).toContain(governor.personId);
    expect(people.length).toBeGreaterThan(0);
    expect(new Set(people).size).toBe(people.length);
  });

  it("turns a governor's repeated failures into unrest, then a threat, then an attempt", () => {
    const game = openLife("pressure-events-governor");
    const governor = currentGovernorOf(game.world, STATE)!;
    let world: World = {
      ...game.world,
      control: { kind: "person", personId: governor.personId },
    };
    const home = householdLocationAt(
      world,
      world.history.households[0]!.id,
    )!.jurisdictionId;
    // Each quarter the governor, played, declines federal help after three
    // catastrophic floods, which the game judges a failure each time. The
    // floods come the day after the quarter's pressure step: a cause recorded
    // later on the step's own day is not counted yet (reported to the
    // pressure layer's owner).
    for (let quarter = 0; quarter < 10; quarter += 1) {
      world = passOrdinaryDays(world, 1);
      for (let flood = 0; flood < 3; flood += 1) {
        world = declareHazardEpisode(world, {
          stableKey: `oregon-flood-${quarter}-${flood}`,
          family: "flood",
          magnitude: "catastrophic",
          stateUsps: STATE,
          jurisdictionIds: [home],
          durationDays: 2,
          basis: "Declared test episode; not a local hazard prediction.",
          sourceReference: null,
        });
        const episode = crisisRecords(world)
          .filter((record) => record.kind === "hazard-episode")
          .at(-1)!;
        if (currentGovernorOf(world, STATE)?.personId === governor.personId)
          world = decideStateDisasterRequest(world, episode.id, "decline");
      }
      world = passOrdinaryDays(world, 90);
    }

    const readings = world.pressure!.readings.filter(
      (reading) => reading.stateKey === `US-${STATE}`,
    );
    expect(
      readings.some((reading) =>
        reading.contributions.some((row) =>
          row.causeKey.startsWith("failed-handling:"),
        ),
      ),
    ).toBe(true);

    // Every step happened in order, and each rests on what came before.
    const unrest = eventsOf(world, UNREST_EVENT);
    const threats = eventsOf(world, POLITICAL_THREAT_EVENT);
    const attempts = crisisRecords(world).filter(
      (record) => record.kind === "violence-attempt",
    );
    expect(unrest.length).toBeGreaterThan(0);
    expect(threats.length).toBeGreaterThan(0);
    expect(attempts.length).toBeGreaterThan(0);
    const incidentOf = (eventId: string) =>
      world.history.incidents.find((row) => row.onsetEventId === eventId)!;
    const statesOf = (eventId: string) =>
      world.history.incidentStates.filter(
        (row) => row.incidentId === incidentOf(eventId).id,
      );
    for (const threat of threats) {
      // A threat comes only while unrest in its state has lasted.
      const lasting = unrest.flatMap((event) =>
        statesOf(event.id).filter(
          (row) =>
            row.phaseKey === UNREST_LASTING_PHASE &&
            event.jurisdictionId === threat.jurisdictionId &&
            row.sequence < threat.sequence,
        ),
      );
      expect(lasting.length).toBeGreaterThan(0);
      // Its target is named on the record, not drawn at the moment of harm.
      expect(
        threat.participants.some((row) => row.role === "impact:threatened"),
      ).toBe(true);
    }
    for (const attempt of attempts) {
      if (attempt.kind !== "violence-attempt") continue;
      const threat = threats.find((event) =>
        attempt.threatEvidenceIds.includes(event.id),
      )!;
      expect(threat).toBeDefined();
      expect(threat.involvedEntityIds).toContain(attempt.targetPersonId);
      expect(threat.occurredAt < attempt.effectiveAt).toBe(true);
      // The attempt came when the threat's strain crossed its own line, and
      // the threat is resolved by it.
      const threatRecord = incidentOf(threat.id);
      expect(
        threatStrain(world.pressure!.readings, threatRecord),
      ).toBeGreaterThanOrEqual(threatAttemptLine());
      expect(statesOf(threat.id).at(-1)).toMatchObject({
        status: "resolved",
        phaseKey: THREAT_ATTEMPTED_PHASE,
      });
    }
    // No state that never crossed the anger line saw anything.
    const crossed = new Set(
      world.pressure!.readings.flatMap((reading) =>
        reading.levels.anger > BLANKET_POLITICAL_VIOLENCE.angerLine
          ? [reading.jurisdictionId]
          : [],
      ),
    );
    for (const event of [...unrest, ...threats])
      expect(crossed.has(event.jurisdictionId!)).toBe(true);
  });

  it("calms unrest once anger falls back, with no roll deciding it", () => {
    const game = openLife("pressure-events-calm");
    const state = worldStates(game.world).find(
      (row) => row.stateKey === `US-${STATE}`,
    )!;
    let world: World = holdAnger(
      seedAnger(game.world, [state.stateKey], 1),
      [state.stateKey],
      1,
    );
    const onset = eventsOf(world, UNREST_EVENT);
    expect(onset).toHaveLength(1);
    // Anger at the line: the unrest calms at the next re-check.
    world = holdAnger(world, [state.stateKey], 0.2);
    const incident = world.history.incidents.find(
      (row) => row.onsetEventId === onset[0]!.id,
    )!;
    const last = world.history.incidentStates
      .filter((row) => row.incidentId === incident.id)
      .at(-1)!;
    expect(last).toMatchObject({
      status: "resolved",
      phaseKey: UNREST_CALMED_PHASE,
    });
    expect(incident.occurrence.rng).toBeNull();
  });

  it("feeds an attack back into anger and fear where the target lived", () => {
    const game = openLife("pressure-events-feedback");
    const governor = currentGovernorOf(game.world, STATE)!;
    const anger = 1;
    // Fixture: the store is given one quarter's high anger in the state, in
    // place of the causes that would have built it. The events that follow
    // are the ordinary writers'.
    const state = worldStates(game.world).find(
      (row) => row.stateKey === `US-${STATE}`,
    )!;
    let world: World = seedAnger(game.world, [state.stateKey], anger);
    for (let n = 0; n < 12; n += 1)
      world = holdAnger(world, [state.stateKey], anger);
    const attempt = crisisRecords(world).find(
      (record) => record.kind === "violence-attempt",
    );
    expect(attempt).toBeDefined();
    const causes = causesInPeriod(
      world,
      attempt!.effectiveAt,
      attempt!.effectiveAt,
    ).get(`US-${STATE}`);
    expect(causes?.some((row) => row.causeKey.startsWith("attack:"))).toBe(
      true,
    );
    expect(governor.personId).toBeTruthy();
  });

  it("does not turn domestic anger into a canned foreign dispute", () => {
    const game = openLife("pressure-events-international-retired");
    const states = worldStates(game.world).map((row) => row.stateKey);
    const angry = seedAnger(game.world, states, 3);
    expect(internationalFriction(angry, [])).toEqual(new Map());
    expect(stepInternationalFriction(angry)).toBe(angry);
    expect(
      crisisRecords(angry).filter(
        (record) => record.kind === "international-crisis",
      ),
    ).toEqual([]);
  });
});

/** Fixture: a pressure store whose latest quarter carries `anger` in `states`. */
function seedAnger(
  world: World,
  states: readonly string[],
  anger: number,
): World {
  const all = worldStates(world);
  const store = world.pressure ?? {
    contractVersion: PRESSURE_CONTRACT_VERSION,
    quartersStepped: 0,
    lastPeriodEnd: null,
    readings: [],
    flows: [],
  };
  const ordinal = store.quartersStepped + 1;
  const date = world.currentDate;
  return {
    ...world,
    pressure: {
      ...store,
      quartersStepped: ordinal,
      lastPeriodEnd: date,
      readings: [
        ...store.readings,
        ...all
          .filter((row) => states.includes(row.stateKey))
          .map((row) => ({
            key: `${ordinal}:${row.stateKey}`,
            ordinal,
            stateKey: row.stateKey,
            jurisdictionId: row.jurisdiction.id,
            periodStart: addDays(date, -90),
            periodEnd: date,
            levels: { leave: 0, arrive: 0, anger, fear: 0, hope: 0 },
            contributions: [],
          })),
      ],
    },
  };
}

/**
 * Fixture: anger held in `states` for the quarter now closing, then a real
 * quarter of the clock, whose migration review steps the pressure layer and
 * what it sets off.
 */
function holdAnger(
  world: World,
  states: readonly string[],
  anger: number,
): World {
  return passOrdinaryDays(seedAnger(world, states, anger), 91);
}
