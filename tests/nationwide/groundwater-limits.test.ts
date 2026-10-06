import { describe, expect, it } from "vitest";

import startingLaw from "../../data/research/laws/starting-law-2026/index";
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
 * A state that starts or stops metering and limiting large groundwater
 * withdrawals changes how much groundwater its farms pump a year later. The
 * state is drawn from every place with irrigation pumping data, a life is
 * opened in one of its towns, and the state's legislature reverses the answer
 * it began with on the opening day. The world's own monthly place-outcome
 * pass then runs for 14 months, beside the same world with no such law.
 */

const SEED = "groundwater-limits";
const QUESTION_KEY =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
const MEASURE = "water.irrigation-groundwater";
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
    stableKey: "event:test:groundwater:enacted",
    type: "legislation.measure-enacted",
    occurredAt: opened,
    recordedAt: opened,
    jurisdictionId: state.id,
    involvedEntityIds: [player],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: "The groundwater management act became law.",
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
    id: "measure_groundwater" as EntityId,
    stableKey: "test:groundwater",
    sequence: 1,
    jurisdictionId: state.id,
    rulePackId: "test",
    designation: "Act 1",
    shortTitle: "Groundwater Management Act",
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
    id: "enactment_groundwater" as EntityId,
    stableKey: "test:groundwater:enactment",
    sequence: 1_000_001,
    measureId: measure.id,
    resolvedAt: opened,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: opened,
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === "event:test:groundwater:enacted",
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

const pumpedIn = (world: World, on: IsoDate) =>
  placeOutcomeAt(world, MEASURE, stateJurisdictionForKey(STATE_KEY)!.id, on)!;

describe(`groundwater limits in ${TOWN.displayName} (seed ${SEED})`, () => {
  it(`moves ${STATE_KEY}'s irrigation pumping a year after its legislature answers ${ANSWER}`, () => {
    expect(lifePlaceByKey(TOWN.key)).toBeDefined();
    const { world: opened, player } = openedWorld();
    const without = runMonths(opened, 14);
    const withIt = runMonths(withLaw(opened, player), 14);
    const start = makeIsoDate(`${opened.currentDate.slice(0, 7)}-01`);
    const month = (offset: number) =>
      makeIsoDate(`${addDays(start, 31 * offset).slice(0, 7)}-01`);
    // Nothing moves before the lag runs out.
    expect(pumpedIn(withIt, month(11)).value).toBe(
      pumpedIn(without, month(11)).value,
    );
    // Then the state's farms pump the drawn share less (or more) than the same
    // world without the law, within the research's range.
    const after = pumpedIn(withIt, month(13));
    const control = pumpedIn(without, month(13));
    const ratio = after.value / control.value;
    if (ANSWER === "yes") {
      expect(ratio).toBeGreaterThan(0.599);
      expect(ratio).toBeLessThan(0.791);
    } else {
      expect(ratio).toBeGreaterThan(1.209);
      expect(ratio).toBeLessThan(1.401);
    }
    expect(after.causes.map((cause) => cause.key)).toContain(
      "groundwater-limits-to-irrigation-pumping",
    );
  }, 600_000);
});
