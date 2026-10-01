import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../../src/simulation/future-transitions";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../../src/simulation/life-places";
import { placeReferencePopulation } from "../../src/simulation/nationwide-world/place-population";
import { workRoleAt } from "../../src/simulation/life-queries";
import { personName } from "../../src/simulation/people";
import { SeededRng } from "../../src/simulation/rng";
import { money, recordResourceFlowTerms } from "../../src/simulation/resources";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { writeWithWorldIntegrityOnce } from "../../src/simulation/world";
import {
  applyLawPayConsequence,
  payPeriodEndingOn,
  payTownPaydays,
  startTownJobPay,
  type TownPayPeriod,
} from "../../src/simulation/living-world/town-pay";
import { TOWN_MINIMUM_WAGES } from "../../src/simulation/living-world/town-pay.generated";
import { TEAM_2_PAY_REGISTRATION } from "../../src/simulation/law-consequences/pay";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "../../src/simulation/minimum-wage";
import type { LawConsequenceRow } from "../../src/simulation/law-consequence-types";
import type { IsoDate, World } from "../../src/simulation/types";

const ROW: LawConsequenceRow = {
  id: "state-hourly-floor",
  kind: "pay",
  when: "effective",
  who: { selector: "active-work-payflows", predicates: [] },
  what: "raise-hourly-floor",
  amount: {
    op: "term",
    key: "labor.minimumWage.hourlyCents",
    unit: "minor/hour",
  },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/money/minimum-wage-2026.json"],
    population: "Actual covered town jobs",
    scope: "Job's governing jurisdiction",
    why: "A legal hourly floor sets the employer's prospective compensation obligation.",
    uncertainty: "Recorded contracted hours; not observed hours worked.",
  },
};
const excludedStates = new Set<string>();
function place(seed: string): LifePlace {
  const rng = new SeededRng(seed);
  const states = [...lifePlaceStateIdentities()];
  while (states.length) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    if (
      excludedStates.has(state.jurisdictionKey) ||
      !(TOWN_MINIMUM_WAGES[state.jurisdictionKey]! > 0)
    )
      continue;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((p) => {
      const population = placeReferencePopulation(p.sourceGeoid ?? "")?.value;
      return (
        population !== undefined && population >= 1000 && population < 20000
      );
    });
    if (places.length) {
      excludedStates.add(state.jurisdictionKey);
      return rng.pick(places);
    }
  }
  throw new Error("No distinct supported wage place.");
}
/** Controlled later-date context, with retained scheduled history; not ordinary time passage. */
function atDate(world: World, date: IsoDate): World {
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const due of world.history.futureDueItems) {
      if (
        due.dueAt < date &&
        futureDueItemStateAt(next, due.id, {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        })?.status === "scheduled"
      )
        next = cancelFutureDueItem(next, {
          stableKey: `pay-fixture:${date}:${due.id}:cancel`,
          dueItemId: due.id,
          effectiveAt: next.currentDate,
          reasonKey: "civic:fixture-isolation",
          context: "Controlled payroll fixture; not ordinary time passage.",
        });
    }
    return {
      ...next,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
    };
  });
}

describe("one pay handler writes real terms and completed pay", () => {
  it.each([0, 1, 2, 3, 4])(
    "starting legal term, named payment, mod row and canonical reload (case %i)",
    (caseNumber) => {
      const seed = `team2-pay-kind:${caseNumber}`;
      const town = place(seed);
      let world = openObserverWorld(observerSetup(seed, town.key)).world;
      const opened = world.currentDate;
      world = writeWithWorldIntegrityOnce(world, () =>
        startTownJobPay(world, null, opened),
      );
      const flow = world.history.resourceFlows.find(
        (f) =>
          f.stableKey.startsWith("town-pay-v2:job-pay:") &&
          f.recipient.kind === "person" &&
          f.basisReference.kind === "work" &&
          workRoleAt(world, f.basisReference.workRelationshipId)
            ?.locationJurisdictionId === town.context.jurisdiction.id,
      )!;
      expect(flow, town.displayName).toBeDefined();
      if (
        flow.recipient.kind !== "person" ||
        flow.basisReference.kind !== "work"
      )
        throw new Error("Actual job binding required.");
      const personId = flow.recipient.personId;
      const prior = resourceFlowTermsAt(world, flow.id)!;
      // Deliberate underpayment is an authored test condition, not a production wage estimate.
      world = recordResourceFlowTerms(world, {
        stableKey: "fixture:underpaid",
        resourceFlowId: flow.id,
        effectiveAt: opened,
        status: "active",
        amount: money(0, "USD"),
        cadenceKind: prior.cadenceKind,
        reason: "Authored underpaid contract to test legal-floor enforcement.",
        provenance: {
          kind: "authored",
          note: "Controlled underpayment fixture.",
        },
        supersedesTermsId: prior.id,
      });
      const context = {
        onDate: opened,
        activity: "effective" as const,
        activityId: flow.id,
        subjectIds: [personId],
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
      };
      const inputs = TEAM_2_PAY_REGISTRATION.resolve(world, ROW, context);
      const input = inputs.find((r) => r.sourceRecordIds.includes(flow.id))!;
      expect(input, town.displayName).toBeDefined();
      expect(input.law.origin).toBe("in-force-at-start");
      world = TEAM_2_PAY_REGISTRATION.apply(world, input);
      const terms = resourceFlowTermsAt(world, flow.id)!;
      expect(terms.amount.minorUnits).toBeGreaterThan(0);
      expect(terms.lawEffectStamps?.[0]?.governingLawKey).toBe(
        input.law.measureId,
      );
      expect(TEAM_2_PAY_REGISTRATION.apply(world, input)).toBe(world);
      expect(
        TEAM_2_PAY_REGISTRATION.apply(world, {
          ...input,
          row: { ...ROW, id: "mod-second-wage-row" },
        }),
      ).toBe(world);
      const cadence =
        /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
          terms.cadenceKind,
        )!;
      let period = null;
      for (let days = 1; days <= 62; days++) {
        const candidate = payPeriodEndingOn(
          cadence[1] as TownPayPeriod,
          addDays(opened, days),
          Number(cadence[2] ?? 0),
        );
        if (candidate && candidate.startsAt >= opened) {
          period = candidate;
          break;
        }
      }
      expect(period).not.toBeNull();
      world = atDate(world, period!.endsAt);
      world = writeWithWorldIntegrityOnce(world, () =>
        payTownPaydays(world, opened, null),
      );
      const payments = world.history.resourceTransferOutcomes.filter(
        (r) =>
          r.resourceFlowId === flow.id &&
          r.status === "completed" &&
          r.transferredAmount.minorUnits > 0,
      );
      expect(payments.length).toBeGreaterThan(0);
      const paid = payments.at(-1)!;
      expect(paid.transferredAmount.minorUnits).toBe(terms.amount.minorUnits);
      expect(
        paid.lawEffectStamps?.some(
          (s) =>
            s.governingLawKey === input.law.measureId &&
            s.effectKind === "work-compensation-payment" &&
            s.sourceRecordIds?.includes(terms.id),
        ),
      ).toBe(true);
      const continued = deserializeWorld(serializeWorld(world));
      expect(
        continued.history.resourceTransferOutcomes.find(
          (p) => p.id === paid.id,
        ),
      ).toEqual(paid);
      const replay = writeWithWorldIntegrityOnce(continued, () =>
        payTownPaydays(continued, opened, null),
      );
      expect(
        replay.history.resourceTransferOutcomes.filter(
          (r) => r.resourceFlowId === flow.id,
        ),
      ).toEqual(
        continued.history.resourceTransferOutcomes.filter(
          (r) => r.resourceFlowId === flow.id,
        ),
      );
      // A later lower floor never cuts an earned or contractual wage.
      const lower = {
        ...input,
        value: {
          type: "amount" as const,
          value: 0,
          unit: "minor/hour" as const,
          currency: "USD",
        },
      };
      expect(TEAM_2_PAY_REGISTRATION.apply(replay, lower)).toBe(replay);
      expect(() =>
        applyLawPayConsequence(replay, {
          rowId: ROW.id,
          questionKey: input.questionKey,
          jurisdictionId: input.jurisdictionId,
          law: input.law,
          personId,
          workId: flow.basisReference.workRelationshipId,
          payFlowId: flow.id,
          activityId: flow.id,
          effectiveAt: opened,
          amount: { value: 1000, unit: "minor/hour", currency: "EUR" as "USD" },
          sourceRecordIds: [flow.id],
          action: "raise-hourly-floor",
        }),
      ).toThrow("pay.amount.minor-per-hour-USD");
      console.log(
        JSON.stringify({
          seed,
          place: town.displayName,
          question: input.questionKey,
          person: personName(world.people[personId]!),
          personId,
          law: input.law.measureId,
          termsId: terms.id,
          paymentId: paid.id,
          grossMinor: paid.transferredAmount.minorUnits,
          currency: paid.transferredAmount.currency,
          paidAt: paid.occurredAt,
          proof:
            "controlled actual town payroll + canonical Save/Continue; not ordinary legislature",
        }),
      );
    },
  );
});
