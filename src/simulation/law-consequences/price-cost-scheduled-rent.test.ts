import { beforeAll, describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { composeWorldTimeHandlers } from "../campaigns";
import { daysBetween } from "../dates";
import { futureDueItemStateAt } from "../future-transitions";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaceByKey } from "../life-places";
import {
  ensureRentDaySchedule,
  hudRentRowFor,
  RENT_BASIS,
  RENT_DAY_TRANSITION_KEY,
  rentDayHandler,
  startTownLeases,
  townLeases,
} from "../living-world/town-rent";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { personName } from "../people";
import { resourceFlowTermsAt } from "../resource-queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import type { LawConsequenceRow } from "../law-consequence-types";
import type { FutureDueItem, World } from "../types";

const QUESTION = "us-policy-positions:housing-land-use.rent-stabilization";
const SEED = "team4-m10-scheduled-rent-entry-20261001";
const answers = startingLaw.questions[QUESTION].answers as Record<
  string,
  { answer: string }
>;
const available = PLACE_POPULATION_ROWS.split(";")
  .map((entry) => entry.split(":")[0]!)
  .filter((key) => {
    const place = lifePlaceByKey(key);
    const state = key.startsWith("11") ? "US-DC" : place?.stateJurisdictionKey;
    return (
      place &&
      state &&
      answers[state]?.answer === "yes" &&
      hudRentRowFor(place.context.jurisdiction.id)
    );
  });
const rng = new SeededRng(SEED);
const places: string[] = [];
while (places.length < 5 && available.length)
  places.push(...available.splice(rng.integer(0, available.length), 1));

// A fictional test clause, not a real rent cap or a production catalog admission.
// It exercises the registered writer with amounts already saved on a real lease.
const row: LawConsequenceRow = {
  id: "fixture-native-lease-price",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      { op: "record", key: "prior-flow-minor", unit: "minor" },
    ],
  },
  conditions: [
    { capability: "price-flow-basis", parameters: { basisKind: RENT_BASIS } },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["fixture:record-only-lease-clause"],
    population: "The actual named payer on a saved market lease",
    scope: "Controlled dispatcher proof, not a real legal ceiling",
    why: "The fictional clause retains the actual prior saved lease price.",
    uncertainty:
      "No numerical legal term or production consequence row is admitted.",
  },
};

// No synthetic handler registry, manually invoked rent handler, canceled due
// items or date reassignment. The admitted composer and real clock own the run.
describe.each(places.map((placeKey, index) => ({ placeKey, index })))(
  "scheduled rent day in selected place $index/$placeKey",
  ({ placeKey }) => {
    let initial: World;
    let due: FutureDueItem;
    let lease: ReturnType<typeof townLeases>[number];
    beforeAll(() => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey,
          startAge: 30,
          startingLife: "ordinary-life",
          household: "lives-alone",
          questionnaire: "skipped",
          seed: `${SEED}:${placeKey}`,
        }),
      ).game!;
      initial = startTownLeases(game.world, game.world.currentDate);
      lease = townLeases(initial).find(
        (entry) => entry.regime === "market" && !entry.ended,
      )!;
      expect(lease).toBeDefined();
      const proposition = Object.values(
        initial.policyCatalog.propositions,
      ).find((entry) => entry.stableKey === QUESTION)!;
      expect(lawInForce(initial, lease.town, proposition.id)?.answer).toBe(
        "yes",
      );
      initial = {
        ...initial,
        policyCatalog: {
          ...initial.policyCatalog,
          propositions: {
            ...initial.policyCatalog.propositions,
            [proposition.id]: { ...proposition, consequences: [row] },
          },
        },
      };
      initial = ensureRentDaySchedule(initial);
      due = initial.history.futureDueItems.find(
        (item) =>
          item.transitionKey === RENT_DAY_TRANSITION_KEY &&
          futureDueItemStateAt(initial, item.id, {
            asOfDate: initial.currentDate,
            historySequenceExclusive: initial.history.nextSequence,
          })?.status === "scheduled",
      )!;
      expect(due).toBeDefined();
      expect(due.dueAt > initial.currentDate).toBe(true);
      expect(
        deserializeWorld(serializeWorld(initial)).history.resourceFlows,
      ).toEqual(initial.history.resourceFlows);
    });

    it("advances to the real scheduled rent day and preserves save/replay records", () => {
      const registry = composeWorldTimeHandlers();
      expect(registry.get(RENT_DAY_TRANSITION_KEY)).toBe(rentDayHandler);
      const days = daysBetween(initial.currentDate, due.dueAt);
      expect(days).toBeGreaterThan(0);
      const savedBefore = deserializeWorld(serializeWorld(initial));
      const advanced = advanceWorld(initial, days, registry);
      expect(advanced.currentDate).toBe(due.dueAt);
      expect(
        futureDueItemStateAt(advanced, due.id, {
          asOfDate: advanced.currentDate,
          historySequenceExclusive: advanced.history.nextSequence,
        }),
      ).toMatchObject({
        status: "resolved",
        reasonKey: "rent-day:collected",
      });
      const outcomes = advanced.history.resourceTransferOutcomes.filter(
        (outcome) =>
          outcome.resourceFlowId === lease.flow.id &&
          outcome.periodStartsAt === due.dueAt,
      );
      expect(outcomes).toHaveLength(1);
      const outcome = outcomes[0]!;
      expect(outcome.occurredAt).toBe(due.dueAt);
      expect(outcome.attemptedAmount.currency).toBe(
        resourceFlowTermsAt(advanced, lease.flow.id)!.amount.currency,
      );
      // A blocked or partial payment is a recorded result, not invented cash.
      expect(["completed", "partial", "missed", "blocked"]).toContain(
        outcome.status,
      );
      for (const flow of initial.history.resourceFlows)
        expect(
          advanced.history.resourceFlows.find(
            (record) => record.id === flow.id,
          ),
        ).toEqual(flow);
      for (const obligation of initial.history.resourceObligations)
        expect(
          advanced.history.resourceObligations.find(
            (record) => record.id === obligation.id,
          ),
        ).toEqual(obligation);
      for (const oldOutcome of initial.history.resourceTransferOutcomes)
        expect(
          advanced.history.resourceTransferOutcomes.find(
            (record) => record.id === oldOutcome.id,
          ),
        ).toEqual(oldOutcome);
      const following = advanced.history.futureDueItems.find(
        (item) =>
          item.transitionKey === RENT_DAY_TRANSITION_KEY &&
          item.dueAt > due.dueAt &&
          futureDueItemStateAt(advanced, item.id, {
            asOfDate: advanced.currentDate,
            historySequenceExclusive: advanced.history.nextSequence,
          })?.status === "scheduled",
      );
      expect(following).toBeDefined();
      const reopened = deserializeWorld(serializeWorld(advanced));
      expect(reopened.history.resourceFlows).toEqual(
        advanced.history.resourceFlows,
      );
      expect(reopened.history.resourceObligations).toEqual(
        advanced.history.resourceObligations,
      );
      expect(reopened.history.resourceTransferOutcomes).toEqual(
        advanced.history.resourceTransferOutcomes,
      );
      const replayed = advanceWorld(
        savedBefore,
        days,
        composeWorldTimeHandlers(),
      );
      expect(serializeWorld(replayed)).toBe(serializeWorld(advanced));
      console.log(
        `M10 scheduled rent place=${placeKey} seed=${SEED}:${placeKey}: ${personName(advanced.people[lease.leaseholderId]!)} payer=${lease.leaseholderId} lease=${lease.flow.id} due=${due.id}/${due.dueAt} outcome=${outcome.id} status=${outcome.status} attempted=${outcome.attemptedAmount.minorUnits} paid=${outcome.transferredAmount.minorUnits} ${outcome.attemptedAmount.currency} cents; actual composer/clock, next due=${following!.dueAt}. One scheduled rent day, not anniversary, natural year or production numeric-cap proof.`,
      );
    });
  },
);
