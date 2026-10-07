import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import * as lawEffects from "../../src/simulation/enacted-law-effects";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import {
  createWorkCompensation,
  money,
  recordResourceFlowTerms,
} from "../../src/simulation/resources";
import { SeededRng } from "../../src/simulation/rng";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import {
  TOWN_PAY_VERSION,
  nextPaydayDate,
  payPeriodEndingOn,
  payTownPaydays,
} from "../../src/simulation/living-world/town-pay";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";

function sampledPlaces() {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [key, count] = pair.split(":") as [string, string];
    const state = key.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(count))
      largest.set(state, [key, Number(count)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  expect(largest.size).toBe(56);
  const pool = [...largest.values()].map(([key]) => key);
  // This selects real fixture places; it never decides a simulated outcome.
  const rng = new SeededRng("K1-payroll-five-places");
  return Array.from(
    { length: 5 },
    () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
  );
}

afterEach(() => vi.restoreAllMocks());

describe.each(sampledPlaces())(
  "payroll activity ordering in %s",
  (placeKey) => {
    it("uses the saved flow identity, reads dispatched terms before payment, and does not replay a completed period", () => {
      const seed = `K1-payroll:${placeKey}`;
      let world = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey,
          startAge: 30,
          questionnaire: "skipped",
        }),
      ).game!.world;
      const since = world.currentDate;
      const work = world.history.workRelationships.find(
        (row) =>
          row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
          row.compensation === "paid" &&
          row.organizationId,
      )!;
      expect(work).toBeDefined();
      world = createWorkCompensation(world, {
        stableKey: `${TOWN_PAY_VERSION}:job-pay:${work.id}`,
        workRelationshipId: work.id,
        startsAt: since,
        amount: money(100_000, "USD"),
        cadenceKind: "schedule:town-weekly",
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Ordering fixture contract, not an empirical wage.",
        },
      });
      const flow = world.history.resourceFlows.at(-1)!;
      let date = nextPaydayDate(addDays(since, 7));
      while (!payPeriodEndingOn("weekly", date, 0)) date = nextPaydayDate(date);
      const period = payPeriodEndingOn("weekly", date, 0)!;
      world = withWorldIntegrityDeferred(() => {
        let next = world;
        for (const due of world.history.futureDueItems) {
          const status = world.history.futureDueItemStates
            .filter((row) => row.dueItemId === due.id)
            .at(-1);
          if (status?.status === "scheduled" && due.dueAt < date)
            next = cancelFutureDueItem(next, {
              stableKey: `fixture:hook-payday:${due.id}`,
              dueItemId: due.id,
              effectiveAt: since,
              reasonKey: "fixture:controlled-payday-context",
              context:
                "Focused period writer test; ordinary clock advancement not claimed.",
            });
        }
        return {
          ...next,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
        };
      });
      // A controlled dispatcher response proves call order and rereading. Actual
      // legal-row resolution is the pay-kind proof, not this hook fixture.
      const dispatch = vi
        .spyOn(lawEffects, "applyLawConsequences")
        .mockImplementation((next, context) => {
          expect(context).toEqual({
            onDate: period.startsAt,
            activity: "payroll",
            activityId: flow.id,
            subjectIds: [work.personId],
          });
          expect(
            next.history.resourceTransferOutcomes.some(
              (row) => row.resourceFlowId === flow.id,
            ),
          ).toBe(false);
          const terms = resourceFlowTermsAt(next, flow.id)!;
          return recordResourceFlowTerms(next, {
            stableKey: `fixture:dispatched-terms:${flow.id}`,
            resourceFlowId: flow.id,
            effectiveAt: period.startsAt,
            status: "active",
            amount: money(200_000, "USD"),
            cadenceKind: terms.cadenceKind,
            reason: "Authored response tests pre-payment rereading only.",
            supersedesTermsId: terms.id,
            provenance: {
              kind: "authored",
              note: "Controlled dispatcher response, not proof of a law firing.",
            },
          });
        });
      const paid = withWorldIntegrityDeferred(() =>
        payTownPaydays(world, since, null),
      );
      expect(dispatch).toHaveBeenCalledOnce();
      const outcomes = paid.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow.id,
      );
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]!.attemptedAmount.minorUnits).toBe(200_000);
      expect(outcomes[0]!.transferredAmount.minorUnits).toBe(200_000);
      const reopened = deserializeWorld(serializeWorld(paid));
      expect(
        withWorldIntegrityDeferred(() => payTownPaydays(reopened, since, null)),
      ).toBe(reopened);
      expect(dispatch).toHaveBeenCalledOnce();
      const person = paid.people[work.personId]!;
      console.info(
        JSON.stringify({
          placeKey,
          seed,
          person: `${person.givenName} ${person.familyName}`,
          personId: person.id,
          activityId: flow.id,
          period,
          grossMinor: outcomes[0]!.transferredAmount.minorUnits,
        }),
      );
    }, 120_000);
  },
);
