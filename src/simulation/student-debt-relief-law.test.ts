import { describe, expect, it } from "vitest";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { US_CONGRESS_PACK_ID } from "./congress-rule-pack";
import { addDays } from "./dates";
import { createOrganization } from "./life";
import { openHouseholdLoan, householdLoansOf } from "./household-loans";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { resourcePositionAt } from "./resource-queries";
import { createResourceFlow, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  applyStudentDebtRelief,
  STUDENT_DEBT_RELIEF_QUESTION,
} from "./student-debt-relief-law";
import {
  openFederalTreasury,
  settleFederalTreasuryMonth,
  FEDERAL_OUTLAYS,
} from "./public-budgets/federal-treasury";
import { advanceWorld, assertWorldIntegrity } from "./world";
import type { World } from "./types";

function borrower(
  seed: string,
  annualIncomeCents = 5_200_000,
  principals = [2_250_000],
) {
  const states = lifePlaceStateIdentities();
  // Geography selection alone varies with the named test seed. No actor choice is rolled.
  const index =
    [...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0) % states.length;
  const state = states[index]!;
  const place = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
  }).find((p) => p.scope !== "state")!;
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge: 35,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
  });
  const personId = created.playerPersonId;
  const position = resourcePositionAt(
    created.world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )!;
  let world: World = {
    ...created.world,
    history: {
      ...created.world.history,
      resourcePositions: created.world.history.resourcePositions.map((p) =>
        p.id === position.positionId
          ? { ...p, openingBalance: money(10_000_000, "USD") }
          : p,
      ),
    },
  };
  world = ensureNationalElectionJurisdiction(world);
  world = createOrganization(world, {
    stableKey: "controlled-employer",
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "Controlled employer for borrower eligibility.",
    },
    initialProfile: {
      name: "Controlled borrower employer",
      classification: "enterprise:consumer-finance",
      locationJurisdictionId:
        created.world.people[personId]!.homeJurisdictionId,
    },
  });
  const employerId = world.history.organizations.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "test-recorded-wages",
    source: {
      kind: "organization",
      organizationId: employerId,
    },
    recipient: { kind: "person", personId },
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: money(Math.round(annualIncomeCents / 12), "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "compensation:wages",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: created.world.people[personId]!.homeJurisdictionId,
    provenance: {
      kind: "authored",
      note: "Controlled income for loan eligibility.",
    },
  });
  for (const [index, principal] of principals.entries())
    world = openHouseholdLoan(world, {
      stableKey: `test-federal-student-loan:${index}`,
      borrower: { kind: "person", personId },
      lenderOrganizationId: null,
      lenderKind: "federal-government",
      kind: "student",
      principal: money(principal, "USD"),
      marketAnnualRateBasisPoints: 453,
      rateCap: null,
      repayment: { kind: "installment", termMonths: 120 },
      lateFee: null,
      missedPaymentsToDefault: 9,
      missedPaymentsToCollections: 12,
      jurisdictionId: created.world.people[personId]!.homeJurisdictionId,
      housingTenureId: null,
      provenance: {
        kind: "authored",
        note: "Controlled federal student balance at the researched median.",
      },
    });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === STUDENT_DEBT_RELIEF_QUESTION,
  )!;
  const pair = prepareLawPair(world, {
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    propositionId: proposition.id,
    sponsorPersonId: null,
    policyTerms: [
      {
        questionKey: STUDENT_DEBT_RELIEF_QUESTION,
        values: {
          capPerBorrowerCents: 1_000_000,
          incomeLimitAnnualCents: 12_500_000,
        },
        reason: "Controlled filed cap and income limit.",
        principleRecordIds: [],
      },
    ],
  });
  return { ...pair, personId, place: place.displayName, seed };
}

const cash = (world: World, personId: string) =>
  resourcePositionAt(
    world,
    { kind: "person", personId: personId as World["personOrder"][number] },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;
const registry = createCampaignElectionTransitionRegistry();

describe("federal student debt relief", () => {
  it("cancels a balance, lowers 12 months of payments, and charges the same federal cost", () => {
    const start = borrower("student-relief-watched-2026");
    expect(start.treated.history.debtReliefs?.at(-1)?.amount.minorUnits).toBe(
      1_000_000,
    );
    expect(cash(start.treated, start.personId)).toBe(
      cash(start.control, start.personId),
    );
    const control = advanceWorld(start.control, 365, registry);
    const treated = advanceWorld(start.treated, 365, registry);
    const saving =
      cash(treated, start.personId) - cash(control, start.personId);
    expect(saving).toBeGreaterThan(0);
    const a = householdLoansOf(control, {
      kind: "person",
      personId: start.personId,
    })[0]!;
    const b = householdLoansOf(treated, {
      kind: "person",
      personId: start.personId,
    })[0]!;
    expect(b.monthlyPayment!.minorUnits).toBeLessThan(
      a.monthlyPayment!.minorUnits,
    );
    const treasury = openFederalTreasury(start.control.currentDate);
    const before = settleFederalTreasuryMonth(
      start.control,
      treasury,
      start.control.currentDate,
    );
    const after = settleFederalTreasuryMonth(
      start.treated,
      treasury,
      start.treated.currentDate,
    );
    const cost =
      after.months[0]!.outlays[FEDERAL_OUTLAYS.indexOf("education")]! -
      before.months[0]!.outlays[FEDERAL_OUTLAYS.indexOf("education")]!;
    expect(cost).toBe(10_000);
    console.info(
      JSON.stringify({
        law: STUDENT_DEBT_RELIEF_QUESTION,
        place: start.place,
        seed: start.seed,
        cancelledDollars: 10_000,
        householdSavingDollars: saving / 100,
        monthlyPaymentBefore: a.monthlyPayment!.minorUnits / 100,
        monthlyPaymentAfter: b.monthlyPayment!.minorUnits / 100,
        federalCostDollars: cost,
      }),
    );
    assertWorldIntegrity(treated);
    expect(
      applyStudentDebtRelief(deserializeWorld(serializeWorld(treated))).history
        .debtReliefs,
    ).toEqual(treated.history.debtReliefs);
    expect(treated.currentDate).toBe(addDays(start.treated.currentDate, 365));
  });
  it("applies one borrower cap across multiple loans and survives repeated passes", () => {
    const start = borrower(
      "student-relief-multiple",
      5_200_000,
      [500_000, 2_250_000],
    );
    const reliefs = start.treated.history.debtReliefs!;
    expect(reliefs.map((row) => row.amount.minorUnits)).toEqual([
      500_000, 500_000,
    ]);
    expect(applyStudentDebtRelief(start.treated)).toBe(start.treated);
    const year = advanceWorld(start.treated, 365, registry);
    assertWorldIntegrity(year);
    expect(year.history.debtReliefs).toEqual(reliefs);
  });
  it("does not cancel a borrower's balance above the filed income limit", () => {
    const start = borrower("student-relief-income", 15_000_000);
    expect(start.treated.history.debtReliefs ?? []).toHaveLength(0);
  });
});
