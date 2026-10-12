import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate, daysBetween } from "../../simulation/dates";
import * as native from "../../simulation/household-loans";
import * as resources from "../../simulation/resources";
import { advanceWorld, recordWorldEvent } from "../../simulation/world";
import { recordEventKnowledge } from "../../simulation/records";
import { recordLawExposure } from "../../simulation/law-exposure";
import { setFutureDueItemTerminalState } from "../../simulation/future-transitions";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { peopleInHouseholdAt } from "../../simulation/life-queries";
import { federalLawInForceAt } from "../../simulation/federal-outlay-laws";
import {
  readFinalEnactedLawCategories,
  readFinalEnactedLawTerm,
} from "../../simulation/governing/final-law-term-query";
import { CONSUMER_LOAN_CAP_QUESTION } from "../laws/consumer-cap";
import {
  settleHouseholdLoanPayments,
  assertHouseholdLoanIntegrity,
  loanReceiptKey,
  type LoanFacts,
  type LoanWriteRequest,
} from "./loan-months";
import type { World, EntityId, IsoDate } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Saved installment/revolving/legacy loan and cash controls; not ordinary NPC borrowing.",
};
function facts(world: World): LoanFacts {
  const dates = new Set<IsoDate>([world.currentDate]);
  for (const debt of world.history.resourceObligations) {
    let on = makeIsoDate(debt.establishedAt.slice(0, 7) + "-01");
    for (let i = 0; i < 481 && on <= world.currentDate; i++) {
      dates.add(on);
      const [year, m] = on.split("-").map(Number) as [number, number];
      on = makeIsoDate(
        m === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(m + 1).padStart(2, "0")}-01`,
      );
    }
  }
  const capSources: LoanFacts["capSources"] extends ReadonlyMap<
    IsoDate,
    infer V
  >
    ? Map<IsoDate, V>
    : never = new Map();
  const residents: LoanFacts["residents"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  for (const onDate of dates) {
    const law = federalLawInForceAt(world, CONSUMER_LOAN_CAP_QUESTION, onDate);
    capSources.set(onDate, {
      law,
      coverage: law
        ? readFinalEnactedLawCategories(world, law, {
            questionKey: CONSUMER_LOAN_CAP_QUESTION,
            termKey: "coverage",
            onDate,
          })
        : null,
      term: law
        ? readFinalEnactedLawTerm(world, law, {
            questionKey: CONSUMER_LOAN_CAP_QUESTION,
            termKey: "cap",
            unit: "basis-points",
            onDate,
          })
        : null,
    });
    for (const household of world.history.households)
      residents.set(
        loanReceiptKey(household.id, onDate, world.history.nextSequence),
        peopleInHouseholdAt(world, household.id, {
          asOfDate: onDate,
          historySequenceExclusive: world.history.nextSequence,
        }),
      );
  }
  return {
    id: world.id,
    onDate: world.currentDate,
    people: world.people,
    records: world.history,
    cash: { id: world.id, onDate: world.currentDate, records: world.history },
    capSources,
    residents,
    places: new Map(
      world.personOrder.map((id) => [
        world.people[id]!.homeJurisdictionId,
        lifePlaceByJurisdictionId(world.people[id]!.homeJurisdictionId),
      ]),
    ),
  };
}
/** Read-only projection of actual public-parent writer receipts. No private evaluation or replacement append writer: every requested field is checked before its canonical saved prefix is supplied. */
function appendReceipt(
  world: World,
  expected: World,
  request: Extract<LoanWriteRequest, { op: "append" }>,
): World {
  const [field, , draft] = request.args;
  const row = (expected.history[field] ?? []).find(
    (x) => x.stableKey === draft.stableKey,
  );
  expect(
    row,
    "public-parent saved append receipt " + draft.stableKey,
  ).toBeDefined();
  expect(row).toEqual({
    ...draft,
    id: row!.id,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  });
  const nextSequence = row!.sequence + 1;
  const projected = Object.fromEntries(
    Object.entries(expected.history).map(([key, value]) => [
      key,
      key === "nextSequence"
        ? nextSequence
        : Array.isArray(value)
          ? value.filter(
              (record) =>
                typeof record?.sequence !== "number" ||
                record.sequence < nextSequence,
            )
          : value,
    ]),
  ) as unknown as World["history"];
  return { ...world, history: projected };
}
function apply(
  world: World,
  expected: World,
  request: LoanWriteRequest,
): World {
  switch (request.op) {
    case "append":
      return appendReceipt(world, expected, request);
    case "recordResourceFlowTerms":
      return resources.recordResourceFlowTerms(world, ...request.args);
    case "recordResourceObligationState":
      return resources.recordResourceObligationState(world, ...request.args);
    case "recordResourceTransferOutcome":
      return resources.recordResourceTransferOutcome(world, ...request.args);
    case "recordWorldEvent":
      return recordWorldEvent(world, ...request.args);
    case "recordEventKnowledge":
      return recordEventKnowledge(world, ...request.args);
    case "recordLawExposure":
      return recordLawExposure(world, ...request.args);
  }
}
function compare(world: World, personId?: EntityId): World {
  const expected = native.settleHouseholdLoanPayments(world, personId);
  const process = settleHouseholdLoanPayments(facts(world), personId);
  let step = process.next();
  while (!step.done) {
    world = apply(world, expected, step.value);
    step = process.next(facts(world));
  }
  expect(world).toEqual(expected);
  expect(() =>
    assertHouseholdLoanIntegrity(facts(world), new Set()),
  ).not.toThrow();
  expect(() =>
    native.assertHouseholdLoanIntegrity(world, new Set()),
  ).not.toThrow();
  return world;
}
function cancelServicing(world: World): World {
  for (const item of world.history.futureDueItems.filter(
    (x) => x.transitionKey === native.HOUSEHOLD_LOAN_MONTH_KEY,
  ))
    world = setFutureDueItemTerminalState(world, {
      stableKey: "rules2:loan:cancel:" + item.id,
      dueItemId: item.id,
      effectiveAt: world.currentDate,
      status: "cancelled",
      reasonKey: "fixture:manual-public-runner",
      context: "Explicit manual public-owner equivalence runner.",
      outcomeEventId: null,
    });
  return world;
}
describe("loan month/helpers/integrity through unchanged native public owners and ordered receipt requests", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:loan-months:" + usps,
        });
        const base = fixture.world;
        const personId = base.personOrder[0]!;
        compare(base);
        for (const balance of [undefined, 0, 1000000])
          for (const revolving of [false, true]) {
            let world =
              balance === undefined
                ? base
                : resources.createResourcePosition(base, {
                    stableKey: "rules2:loan:cash",
                    owner: { kind: "person", personId },
                    openedAt: base.currentDate,
                    openingBalance: resources.money(balance, "USD"),
                    provenance,
                  });
            world = native.openHouseholdLoan(world, {
              stableKey: "rules2:loan:" + revolving,
              borrower: { kind: "person", personId },
              lenderOrganizationId: null,
              lenderKind: "bank",
              kind: revolving ? "credit-card" : "personal",
              principal: resources.money(12000, "USD"),
              marketAnnualRateBasisPoints: 1200,
              rateCap: null,
              repayment: revolving
                ? {
                    kind: "revolving",
                    principalShareBasisPoints: 1000,
                    minimumPaymentFloor: resources.money(2500, "USD"),
                  }
                : { kind: "installment", termMonths: 3 },
              lateFee: resources.money(300, "USD"),
              missedPaymentsToDefault: 2,
              missedPaymentsToCollections: 3,
              jurisdictionId: fixture.jurisdictionId,
              housingTenureId: null,
              provenance,
            });
            world = cancelServicing(world);
            compare(world, base.personOrder[1]!);
            for (const date of ["2026-02-02", "2026-03-02", "2026-04-02"]) {
              world = advanceWorld(
                world,
                daysBetween(world.currentDate, makeIsoDate(date)),
              );
              world = compare(world, personId);
              compare(world, personId);
            }
            const obligation = world.history.resourceObligations.at(-1)!;
            expect(native.debtStandingAt(world, obligation.id)?.standing).toBe(
              balance === undefined
                ? "current"
                : balance === 0
                  ? "collections"
                  : revolving
                    ? "current"
                    : "paid-off",
            );
          }
        for (const balance of [0, 6000, 100000]) {
          let world = resources.createResourcePosition(base, {
            stableKey: "rules2:legacy:cash",
            owner: { kind: "person", personId },
            openedAt: base.currentDate,
            openingBalance: resources.money(balance, "USD"),
            provenance,
          });
          world = resources.createResourceFlow(world, {
            stableKey: "rules2:legacy:mortgage",
            source: { kind: "person", personId },
            recipient: { kind: "person", personId: base.personOrder[1]! },
            startsAt: world.currentDate,
            amount: resources.money(5000, "USD"),
            cadenceKind: "schedule:monthly",
            basisKind: "housing:mortgage",
            basisReference: { kind: "general" },
            restrictionKind: null,
            jurisdictionId: fixture.jurisdictionId,
            provenance,
          });
          world = resources.createResourceObligation(world, {
            stableKey: "rules2:legacy:debt",
            resourceFlowId: world.history.resourceFlows.at(-1)!.id,
            establishedAt: world.currentDate,
            basisKind: "debt:mortgage",
            principal: resources.money(12345, "USD"),
            careResponsibilityId: null,
            housingTenureId: null,
            provenance,
          });
          world = advanceWorld(
            world,
            daysBetween(world.currentDate, makeIsoDate("2026-04-02")),
          );
          world = compare(world, personId);
          compare(world, personId);
        }
      },
      30000,
    );
});
