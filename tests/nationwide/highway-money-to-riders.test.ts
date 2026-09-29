import { describe, expect, it } from "vitest";

import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceByKey,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOMES_TRANSITION_KEY,
  placeOutcomeAt,
  placeOutcomesHandler,
} from "../../src/simulation/outcome-web/place-outcomes";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A state that changes whether its highway money may go to transit changes
 * its transit service two years later, and its riders a year after that. The
 * state is drawn from every place with transit data, a life is opened in one
 * of its towns, and the state's legislature reverses the answer it began with
 * on the opening day. The world's own monthly place-outcome pass then runs for
 * 38 months, beside the same world with no such law.
 */

const SEED = "highway-money-to-riders";
const QUESTION_KEY =
  "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit";
const MEASURE = "transit.service-access";
const RIDES = "transit.ridership";
const POLICY = createProductionPolicyCatalog();
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === QUESTION_KEY,
)!;
const began = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer: "yes" | "no" }> }
  >
)[QUESTION_KEY]!.answers;

const PLACES = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).sort();
const STATE_KEY =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;
const ANSWER = began[STATE_KEY]!.answer === "yes" ? "no" : "yes";
const TOWN = searchLifePlaces("", 5000, {
  stateJurisdictionKey: STATE_KEY,
}).find((place) => place.scope !== "state")!;

function openedWorld(): { world: World; player: EntityId } {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: TOWN.key,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: { ...game.world, policyCatalog: POLICY },
    player: game.playerPersonId,
  };
}

/** The state's legislature reverses its starting answer on the opening day. */
function withLaw(world: World, player: EntityId): World {
  const opened = world.currentDate;
  const state = stateJurisdictionForKey(STATE_KEY)!;
  const recorded = recordWorldEvent(world, {
    stableKey: "event:test:highway-money:enacted",
    type: "legislation.measure-enacted",
    occurredAt: opened,
    recordedAt: opened,
    jurisdictionId: state.id,
    involvedEntityIds: [player],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: "The transportation funding act became law.",
    context: {
      location: { jurisdictionId: state.id, label: state.name, setting: null },
      socialContext: "The measure completed every required step.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const measure: LegislativeMeasureRecord = {
    id: "measure_highway_money" as EntityId,
    stableKey: "test:highway-money",
    sequence: 1,
    jurisdictionId: state.id,
    rulePackId: "test",
    designation: "Act 1",
    shortTitle: "Transportation Funding Act",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: opened,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [QUESTION],
    propositionAnswers: [{ propositionId: QUESTION, answer: ANSWER }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_highway_money" as EntityId,
    stableKey: "test:highway-money:enactment",
    sequence: 1_000_001,
    measureId: measure.id,
    resolvedAt: opened,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: opened,
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === "event:test:highway-money:enacted",
    )!.id,
  };
  return {
    ...recorded,
    history: {
      ...recorded.history,
      legislativeMeasures: [
        ...(recorded.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(recorded.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

/** The world's monthly place-outcome pass, on the first of each month. */
function runMonths(start: World, months: number): World {
  let world = start;
  let due = makeIsoDate(`${start.currentDate.slice(0, 7)}-01`);
  // The law's records are written directly, as the paycheck test writes
  // its federal raise, so the integrity check waits until the passes finish.
  withWorldIntegrityDeferred(() => {
    for (let index = 0; index < months; index += 1) {
      due = makeIsoDate(`${addDays(due, 32).slice(0, 7)}-01`);
      world = placeOutcomesHandler(world, {
        dueAt: due,
        transitionKey: PLACE_OUTCOMES_TRANSITION_KEY,
      } as FutureDueItem).world;
    }
  });
  return world;
}

const serviceIn = (world: World, on: IsoDate) =>
  placeOutcomeAt(world, MEASURE, stateJurisdictionForKey(STATE_KEY)!.id, on)!;
const ridesIn = (world: World, on: IsoDate) =>
  placeOutcomeAt(world, RIDES, stateJurisdictionForKey(STATE_KEY)!.id, on)!;

describe(`highway money for transit reaches riders in ${TOWN.displayName} (seed ${SEED})`, () => {
  it(`moves ${STATE_KEY}'s transit rides three years after its legislature answers ${ANSWER}`, () => {
    expect(lifePlaceByKey(TOWN.key)).toBeDefined();
    const { world: opened, player } = openedWorld();
    const without = runMonths(opened, 38);
    const withIt = runMonths(withLaw(opened, player), 38);
    const start = makeIsoDate(`${opened.currentDate.slice(0, 7)}-01`);
    const month = (offset: number) =>
      makeIsoDate(`${addDays(start, 31 * offset).slice(0, 7)}-01`);
    // Service moves after two years; rides wait a year more.
    const service =
      serviceIn(withIt, month(25)).value / serviceIn(without, month(25)).value;
    expect(Math.abs(service - 1)).toBeGreaterThan(0.009);
    expect(ridesIn(withIt, month(36)).value).toBe(
      ridesIn(without, month(36)).value,
    );
    // Then rides move the same way as service, by 0.3 to 1.0 times as much.
    const after = ridesIn(withIt, month(37));
    const rides = after.value / ridesIn(without, month(37)).value;
    expect(Math.sign(rides - 1)).toBe(Math.sign(service - 1));
    const servicePct = Math.abs(service - 1) * 100;
    expect(Math.abs(rides - 1)).toBeGreaterThan(0.0029 * servicePct);
    expect(Math.abs(rides - 1)).toBeLessThan(0.0101 * servicePct);
    expect(after.causes.map((cause) => cause.key)).toContain(
      "transit-service-to-ridership",
    );
  }, 600_000);
});
