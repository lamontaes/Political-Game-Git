import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import {
  debtStandingAt,
  householdLoanMonthHandler,
  HOUSEHOLD_LOAN_MONTH_KEY,
  openHouseholdLoan,
  type OpenHouseholdLoanInput,
} from "./household-loans";
import { resourcePositionAt } from "./resource-queries";
import { createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, assertWorldIntegrity } from "./world";
import type { EntityId, World } from "./types";

const REGISTRY = createFutureTransitionHandlerRegistry([
  [HOUSEHOLD_LOAN_MONTH_KEY, householdLoanMonthHandler],
]);
const USD = money(0, "USD").currency;

/** Authored zero-cash unit control in an actual locality selected across all 56 states/territories. */
function newLife(seed: string, openingMinor = 0) {
  const rng = new SeededRng(seed);
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const state = rng.pick(states);
  const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  expect(places.length).toBeGreaterThan(0);
  const place = rng.pick(places);
  const created = smallWorld({ place: place.key, seed });
  const personId = created.personId;
  const world = createResourcePosition(created.world, {
    stableKey: `test-cash:${seed}`,
    owner: { kind: "person", personId },
    openedAt: created.world.currentDate,
    openingBalance: money(openingMinor, "USD"),
    provenance: {
      kind: "authored",
      note: "Controlled unit borrower money; not observed finances.",
    },
  });
  process.stdout.write(
    JSON.stringify({
      audit: "A53 nullable escalation unit",
      seed,
      place: place.displayName,
      placeKey: place.key,
      state: state.jurisdictionKey,
    }) + "\n",
  );
  return { world, personId };
}

const cash = (world: World, personId: EntityId) =>
  resourcePositionAt(world, { kind: "person", personId }, USD)?.liquidBalance
    .minorUnits ?? null;

/** Test inputs only: the loan's rate and terms are what a caller supplies. */
function loan(
  world: World,
  personId: EntityId,
  overrides: Partial<OpenHouseholdLoanInput> = {},
): OpenHouseholdLoanInput {
  return {
    stableKey: `test-loan:${overrides.kind ?? "personal"}:${world.currentDate}`,
    borrower: { kind: "person", personId },
    lenderOrganizationId: null,
    lenderKind: "bank",
    kind: "personal",
    principal: money(10_000_000, "USD"),
    marketAnnualRateBasisPoints: 1_200,
    rateCap: null,
    repayment: { kind: "installment", termMonths: 12 },
    lateFee: null,
    missedPaymentsToDefault: 3,
    missedPaymentsToCollections: 6,
    jurisdictionId: Object.keys(world.jurisdictions)[0]! as EntityId,
    housingTenureId: null,
    provenance: { kind: "authored", note: "A loan written by the test." },
    ...overrides,
  };
}

/** Runs only the existing loan handler through its recorded monthly due items. */
function advanceMonths(world: World, months: number): World {
  let next = world;
  for (let month = 0; month < months; month += 1) {
    const due = next.history.futureDueItems.find(
      (row) =>
        row.transitionKey === HOUSEHOLD_LOAN_MONTH_KEY &&
        row.dueAt > next.currentDate,
    );
    expect(due).toBeDefined();
    next = advanceWorld(
      next,
      daysBetween(next.currentDate, due!.dueAt),
      REGISTRY,
    );
  }
  return next;
}

describe("recorded household-loan escalation thresholds", () => {
  it("keeps repeated missed payments late when escalation and fees are unrecorded, including Save/Continue", () => {
    const start = newLife("loan-unrecorded-escalation", 0);
    expect(cash(start.world, start.personId)).toBe(0);
    const opened = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId, {
        missedPaymentsToDefault: null,
        missedPaymentsToCollections: null,
        lateFee: null,
      }),
    );
    const obligationId = opened.history.resourceObligations.at(-1)!.id;
    const first = advanceMonths(opened, 1);
    const continued = deserializeWorld(serializeWorld(first));
    const after = advanceMonths(continued, 5);
    expect(debtStandingAt(after, obligationId)).toMatchObject({
      standing: "late",
      consecutiveMissedPayments: 6,
    });
    const terms = after.history.loanTerms!.find(
      (row) => row.resourceObligationId === obligationId,
    )!;
    expect(terms.missedPaymentsToDefault).toBeNull();
    expect(terms.missedPaymentsToCollections).toBeNull();
    expect(terms.lateFee).toBeNull();
    expect(
      (after.history.debtCharges ?? []).filter(
        (row) =>
          row.resourceObligationId === obligationId && row.kind === "late-fee",
      ),
    ).toHaveLength(0);
    const flowId = after.history.resourceObligations.find(
      (row) => row.id === obligationId,
    )!.resourceFlowId;
    const outcomes = after.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flowId,
    );
    expect(outcomes).toHaveLength(6);
    expect(
      outcomes.every(
        (row) =>
          row.status === "missed" && row.transferredAmount.minorUnits === 0,
      ),
    ).toBe(true);
    assertWorldIntegrity(after);
  });

  it("retains recorded numeric default and collections thresholds", () => {
    const start = newLife("loan-recorded-escalation", 0);
    expect(cash(start.world, start.personId)).toBe(0);
    const opened = openHouseholdLoan(
      start.world,
      loan(start.world, start.personId, {
        missedPaymentsToDefault: 3,
        missedPaymentsToCollections: 6,
        lateFee: null,
      }),
    );
    const obligationId = opened.history.resourceObligations.at(-1)!.id;
    const first = advanceMonths(opened, 1);
    expect(debtStandingAt(first, obligationId)!.standing).toBe("late");
    const third = advanceMonths(first, 2);
    expect(debtStandingAt(third, obligationId)!.standing).toBe("default");
    const sixth = advanceMonths(deserializeWorld(serializeWorld(third)), 3);
    expect(debtStandingAt(sixth, obligationId)).toMatchObject({
      standing: "collections",
      consecutiveMissedPayments: 6,
    });
    assertWorldIntegrity(sixth);
  });

  it.each([0, -1, 1.5])(
    "rejects an invalid recorded threshold %s after Save/Continue",
    (threshold) => {
      const start = newLife(`loan-invalid-escalation-${threshold}`, 0);
      const opened = openHouseholdLoan(
        start.world,
        loan(start.world, start.personId, {
          missedPaymentsToDefault: null,
          missedPaymentsToCollections: null,
          lateFee: null,
        }),
      );
      const continued = deserializeWorld(serializeWorld(opened));
      const obligationId = continued.history.resourceObligations.at(-1)!.id;
      const corrupted: World = {
        ...continued,
        history: {
          ...continued.history,
          loanTerms: continued.history.loanTerms!.map((row) =>
            row.resourceObligationId === obligationId
              ? { ...row, missedPaymentsToDefault: threshold }
              : row,
          ),
        },
      };
      expect(() => assertWorldIntegrity(corrupted)).toThrow();
    },
  );
});
