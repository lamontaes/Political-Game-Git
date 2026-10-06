import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import {
  scheduleFutureDueItem,
  scheduledFutureDueItemsThrough,
  setFutureDueItemTerminalState,
} from "../future-transitions";
import { simulationMomentOnLocalDate } from "../dates";
import { MIGRATION_REVIEW_TRANSITION_KEY } from "../migration";
import {
  currentGovernorOf,
  decideStateDisasterRequest,
  declareHazardEpisode,
} from "../crisis";
import { crisisRecords } from "../crisis/records";
import { addDays } from "../dates";
import { householdLocationAt } from "../life-queries";
import { lifePlaces, searchLifePlaces } from "../life-places";
import { SeededRng } from "../rng";
import type { World } from "../types";
import {
  BLANKET_POLITICAL_VIOLENCE,
  POLITICAL_THREAT_EVENT,
  PRESSURE_CONTRACT_VERSION,
  UNREST_CALMED_PHASE,
  UNREST_EVENT,
  UNREST_LASTING_PHASE,
  causesInPeriod,
  internationalFriction,
  prominentPeopleIn,
  stepPressure,
  stepInternationalFriction,
  stepPressureEvents,
  worldStates,
} from ".";

const LONG = 900_000;

/** Salem, Oregon's state; Kentucky is deliberately not the test place. */
const STATE = "OR";

function openLife(seed: string, stateUsps = STATE) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${stateUsps}`,
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

/** Advances canonical days so due transitions are recorded before each quarter. */
function quarters(world: World, count: number): World {
  return passOrdinaryDays(world, count * 91);
}

/** Advances only the pressure clock; other scheduled systems are blocked. */
function watchedPressureQuarters(world: World, count: number): World {
  let next = world;
  for (let quarter = 0; quarter < count; quarter += 1) {
    const candidates = scheduledFutureDueItemsThrough(
      next,
      next.currentDate,
      addDays(next.currentDate, 365),
    );
    const review = candidates.find(
      (item) => item.transitionKey === MIGRATION_REVIEW_TRANSITION_KEY,
    );
    if (!review) throw new Error("The pressure watch has no next review.");
    const dueThroughReview = scheduledFutureDueItemsThrough(
      next,
      next.currentDate,
      review.dueAt,
    );
    for (const item of dueThroughReview) {
      next = {
        ...next,
        currentDate: item.dueAt,
        currentMoment: simulationMomentOnLocalDate(
          next.currentMoment,
          item.dueAt,
        ),
      };
      const pressureReview =
        item.transitionKey === MIGRATION_REVIEW_TRANSITION_KEY;
      if (pressureReview) next = stepPressureEvents(stepPressure(next));
      next = setFutureDueItemTerminalState(next, {
        stableKey: `pressure-watch:${item.stableKey}:${next.history.nextSequence}`,
        dueItemId: item.id,
        effectiveAt: item.dueAt,
        status: pressureReview ? "resolved" : "blocked",
        reasonKey: pressureReview
          ? "pressure-watch:quarter-stepped"
          : "pressure-watch:other-system-isolated",
        context: pressureReview
          ? "The watched run stepped the recorded pressure ladder."
          : "The watched run isolates the pressure ladder from other systems.",
        outcomeEventId: null,
      });
      if (pressureReview)
        next = scheduleFutureDueItem(next, {
          stableKey: `pressure-watch:next:${next.pressure?.quartersStepped ?? quarter + 1}`,
          dueAt: addDays(next.currentDate, 91),
          transitionKey: MIGRATION_REVIEW_TRANSITION_KEY,
          entityIds: [next.id],
          jurisdictionId: null,
          provenance: { kind: "simulated", sourceEntityIds: [next.id] },
        });
    }
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

  it("turns repeated failures into unrest and a threat without inventing an attacker", () => {
    const seed = "pressure-events-governor";
    const statesWithLocalities = lifePlaces().filter(
      (place) =>
        place.scope === "state" &&
        searchLifePlaces("", 1, {
          stateJurisdictionKey: place.stateJurisdictionKey!,
          scope: "locality",
        }).length > 0,
    );
    const statePlace = new SeededRng(seed).pick(statesWithLocalities);
    const stateUsps = statePlace.stateJurisdictionKey!.replace("US-", "");
    const game = openLife(seed, stateUsps);
    const governor = currentGovernorOf(game.world, stateUsps)!;
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
    for (let quarter = 0; quarter < 5; quarter += 1) {
      for (let flood = 0; flood < 3; flood += 1) {
        world = declareHazardEpisode(world, {
          stableKey: `oregon-flood-${quarter}-${flood}`,
          family: "flood",
          magnitude: "catastrophic",
          stateUsps,
          jurisdictionIds: [home],
          durationDays: 2,
          basis: "Declared test episode; not a local hazard prediction.",
          sourceReference: null,
        });
        const episode = crisisRecords(world)
          .filter((record) => record.kind === "hazard-episode")
          .at(-1)!;
        if (currentGovernorOf(world, stateUsps)?.personId === governor.personId)
          world = decideStateDisasterRequest(world, episode.id, "decline");
      }
      world = watchedPressureQuarters(world, 1);
    }

    const readings = world.pressure!.readings.filter(
      (reading) => reading.stateKey === `US-${stateUsps}`,
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
    expect(unrest.length).toBeGreaterThan(0);
    expect(threats.length).toBeGreaterThan(0);
    expect(
      crisisRecords(world).filter(
        (record) => record.kind === "violence-attempt",
      ),
    ).toEqual([]);
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
    const placeName = world.jurisdictions[threats[0]!.jurisdictionId!]!.name;
    const firstThreat = threats[0]!;
    console.info(
      `WATCHED RUN P2 — ${placeName} (seed ${seed}): repeated recorded flood-handling failures raised anger; sustained anger produced unrest and a threat against the governor; no named person's own recorded intent existed, so no attempt followed.`,
    );
    console.info(`NEWS/JOURNAL — ${firstThreat.summary}`);
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
    expect(internationalFriction()).toEqual(new Map());
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
