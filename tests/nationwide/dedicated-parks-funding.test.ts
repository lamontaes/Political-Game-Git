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
import { OUTCOME_LINKS } from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOMES_TRANSITION_KEY,
  placeOutcomeAt,
  placeOutcomesHandler,
} from "../../src/simulation/outcome-web/place-outcomes";
import {
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetStore,
} from "../../src/simulation/public-budgets";
import { firstOfNextMonth } from "../../src/simulation/public-budgets/fiscal";
import { lawSpendingForMonth } from "../../src/simulation/public-budgets/month";
import { parksSpendingPerResident } from "../../src/simulation/public-budgets/parks-dedication";
import { SPENDING_QUESTION_EFFECTS } from "../../src/simulation/public-budgets/rules";
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
 * A state that changes its law on dedicating a share of revenue to parks
 * moves its parks budget line at once and the share of its residents near a
 * park or recreation facility a year later, by very little: the research
 * found access about zero against spending. The state is drawn from all 56
 * places, a life is opened in one of its towns, and the state's legislature
 * reverses the answer it began with on the opening day. The world's own
 * monthly place-outcome pass then runs for 14 months, beside the same world
 * with no such law.
 */

const QUESTION_KEY =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
const MEASURE = "parks.access-to-exercise";
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

const PARKS_LINK = OUTCOME_LINKS.find(
  (link) => link.key === "parks-spending-to-exercise-access",
)!;
const PLACES = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).sort();
/**
 * One case: a state drawn from `pool` by `seed`, its starting answer reversed.
 */
function scenario(seed: string, pool: readonly string[]) {
  const STATE_KEY =
    pool[Number.parseInt(stableHash(seed).slice(0, 8), 16) % pool.length]!;
  const ANSWER = began[STATE_KEY]!.answer === "yes" ? "no" : "yes";
  const TOWN = searchLifePlaces("", 5000, {
    stateJurisdictionKey: STATE_KEY,
  }).find((place) => place.scope !== "state")!;

  function openedWorld(): { world: World; player: EntityId } {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
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
      stableKey: "event:test:parks-dedication:enacted",
      type: "legislation.measure-enacted",
      occurredAt: opened,
      recordedAt: opened,
      jurisdictionId: state.id,
      involvedEntityIds: [player],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["legislation", "legislation.enacted"],
      summary: "The parks funding act became law.",
      context: {
        location: {
          jurisdictionId: state.id,
          label: state.name,
          setting: null,
        },
        socialContext: "The measure completed every required step.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const measure: LegislativeMeasureRecord = {
      id: "measure_parks_dedication" as EntityId,
      stableKey: "test:parks-dedication",
      sequence: 1,
      jurisdictionId: state.id,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Parks Funding Act",
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
      id: "enactment_parks_dedication" as EntityId,
      stableKey: "test:parks-dedication:enactment",
      sequence: 1_000_001,
      measureId: measure.id,
      resolvedAt: opened,
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: opened,
      outcomeEventId: recorded.history.events.find(
        (event) => event.stableKey === "event:test:parks-dedication:enacted",
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

  const accessIn = (world: World, on: IsoDate) =>
    placeOutcomeAt(world, MEASURE, stateJurisdictionForKey(STATE_KEY)!.id, on)!;

  const effect = SPENDING_QUESTION_EFFECTS.find(
    (row) => row.questionKey === QUESTION_KEY,
  )!;
  const PARKS = BUDGET_PROGRAMS.indexOf("parks");
  const PERCENT_ADDED =
    ((ANSWER === "yes" ? effect.toYes! : effect.toNo!) /
      parksSpendingPerResident(STATE_KEY)) *
    100;

  describe(`dedicated parks funding in ${TOWN.displayName} (${STATE_KEY}, seed ${seed})`, () => {
    it(`puts the parks dollars on ${STATE_KEY}'s budget line the month after its legislature answers ${ANSWER}`, () => {
      const { world: opened, player } = openedWorld();
      const withIt = withLaw(opened, player);
      const store: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      const budgeted = (world: World): World => ({
        ...world,
        publicBudgets: withOpenedBudgets(world, store, world.currentDate),
      });
      const government = publicBudgetFor(
        budgeted(withIt),
        stateJurisdictionForKey(STATE_KEY)!.id,
      )!;
      const month = firstOfNextMonth(opened.currentDate);
      expect(lawSpendingForMonth(opened, government, month)[PARKS]).toBe(0);
      expect(lawSpendingForMonth(withIt, government, month)[PARKS]).toBeCloseTo(
        ((ANSWER === "yes" ? effect.toYes! : effect.toNo!) *
          government.population) /
          12,
        6,
      );
    }, 600_000);

    it(`moves ${STATE_KEY}'s park access a year after its legislature answers ${ANSWER}, by the research's range`, () => {
      expect(lifePlaceByKey(TOWN.key)).toBeDefined();
      const { world: opened, player } = openedWorld();
      const without = runMonths(opened, 14);
      const withIt = runMonths(withLaw(opened, player), 14);
      const start = makeIsoDate(`${opened.currentDate.slice(0, 7)}-01`);
      const month = (offset: number) =>
        makeIsoDate(`${addDays(start, 31 * offset).slice(0, 7)}-01`);
      // Nothing moves before the lag runs out.
      expect(accessIn(withIt, month(11)).value).toBe(
        accessIn(without, month(11)).value,
      );
      // Then access sits a hair above or below the same world without the law:
      // the size is drawn within the research's range, which crosses zero.
      const after = accessIn(withIt, month(13));
      const control = accessIn(without, month(13));
      const change = after.multiplier / control.multiplier - 1;
      expect(change).not.toBe(0);
      const [low, high] = PARKS_LINK.range!;
      expect(change).toBeGreaterThanOrEqual(
        Math.min(low * PERCENT_ADDED, high * PERCENT_ADDED) - 1e-9,
      );
      expect(change).toBeLessThanOrEqual(
        Math.max(low * PERCENT_ADDED, high * PERCENT_ADDED) + 1e-9,
      );
      expect(after.causes.map((cause) => cause.key)).toContain(
        "parks-spending-to-exercise-access",
      );
    }, 600_000);
  });
}

// Any place from all 56 (the draw may land on a territory, whose base is
// estimated), and a place that began with a dedication and repeals it.
scenario("dedicated-parks-funding", PLACES);
scenario(
  "dedicated-parks-funding-repeal",
  PLACES.filter((key) => began[key]?.answer === "yes"),
);
