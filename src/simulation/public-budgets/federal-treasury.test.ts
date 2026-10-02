import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { makeIsoDate } from "../dates";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "../federal-top-income-tax-law";
import { GROW_DEFENSE_SPENDING_QUESTION } from "../federal-defense-spending";
import { CUT_FARM_SUBSIDIES_QUESTION } from "../federal-farm-subsidy-law";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../federal-outlay-laws";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  FEDERAL_LAW_EFFECTS,
  FEDERAL_INTEREST_RATE,
  FEDERAL_OUTLAYS,
  FEDERAL_RECEIPTS,
  federalDebtHeldByPublic,
  federalTotalDebt,
  openFederalTreasury,
  settleFederalTreasuryMonth,
  type FederalTreasury,
} from "./federal-treasury";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { stableHash } from "../ids";
import { isTerritory } from "../statutory-tax-rules";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourcePosition,
  createWorkCompensation,
  recordResourceTransferOutcome,
  money,
} from "../resources";
import { resourcePositionAt } from "../resource-queries";
import { assessPaychecksTaxes, FEDERAL_INCOME_TAX_KEY } from "../statutory-tax";
import { deserializeWorld, serializeWorld } from "../serialization";
import { ensureTaxPublicAccount, publicOrganizationKey } from "../tax-policy";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import {
  withOpenedBudgets,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import { personName } from "../people";

/**
 * The federal books: each month collects and spends a twelfth of fiscal
 * 2025, borrows the gap, and pays interest on what it owes; a federal law on
 * the top income tax rate has no second forecast share. Actual paycheck
 * receipts below exercise the common government account/settlement path.
 * Read over hand-written laws: the treasury reads nothing but the catalog
 * and the laws.
 */

const TOP_RATE = "proposition_top_rate" as EntityId;
const AID = "proposition_foreign_aid" as EntityId;
const CUTS = "proposition_debt_limit_cuts" as EntityId;
const FARM = "proposition_farm_subsidies" as EntityId;
const DEFENSE = "proposition_defense" as EntityId;

let sequence = 0;
function enacted(
  answer: "yes" | "no",
  effectiveAt: string,
  proposition: EntityId = TOP_RATE,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_top_rate_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:top-rate:${sequence}`,
      sequence,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: "test",
      designation: `H.R. ${sequence}`,
      shortTitle: "A top rate act",
      summary: "A top rate act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-05"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [proposition],
      propositionAnswers: [{ propositionId: proposition, answer }],
    },
    enactment: {
      id: `enactment_top_rate_${sequence}` as EntityId,
      stableKey: `test:top-rate:${sequence}:enactment`,
      sequence: 5000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-03-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_top_rate_${sequence}` as EntityId,
    },
  };
}

function lawWorld(laws: readonly ReturnType<typeof enacted>[]): World {
  return {
    seed: "top-rate",
    currentDate: makeIsoDate("2029-06-01"),
    jurisdictions: {},
    policyCatalog: {
      propositions: {
        [TOP_RATE]: {
          id: TOP_RATE,
          stableKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        },
        [AID]: { id: AID, stableKey: INCREASE_FOREIGN_AID_QUESTION },
        [CUTS]: { id: CUTS, stableKey: DEBT_LIMIT_CUTS_QUESTION },
        [FARM]: { id: FARM, stableKey: CUT_FARM_SUBSIDIES_QUESTION },
        [DEFENSE]: { id: DEFENSE, stableKey: GROW_DEFENSE_SPENDING_QUESTION },
      },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

function settleThrough(world: World, months: readonly string[]) {
  let treasury: FederalTreasury = openFederalTreasury(
    makeIsoDate("2026-01-05"),
  );
  for (const month of months)
    treasury = settleFederalTreasuryMonth(
      world,
      treasury,
      makeIsoDate(month) as IsoDate,
    );
  return treasury;
}

const income = FEDERAL_RECEIPTS.indexOf("individualIncomeTax");
const interest = FEDERAL_OUTLAYS.indexOf("netInterest");

describe("the federal treasury", () => {
  it("opens from the real books and borrows each month's gap", () => {
    const opened = openFederalTreasury(makeIsoDate("2026-01-05"));
    // Debt to the Penny, December 31, 2025.
    expect(federalDebtHeldByPublic(opened)).toBe(30_846_716_536_213);
    expect(federalTotalDebt(opened)).toBe(38_514_009_184_232);
    expect(opened.debtLimit).toBe(41_100_000_000_000);
    expect(FEDERAL_INTEREST_RATE).toBeCloseTo(0.0331, 4);
    const treasury = settleThrough(lawWorld([]), ["2026-01-01", "2026-02-01"]);
    const [first, second] = treasury.months;
    const collected = first!.receipts.reduce((sum, value) => sum + value, 0);
    // A twelfth of fiscal 2025's $5,234.6 billion.
    expect(collected / 1e9).toBeCloseTo(5_234.616 / 12, 0);
    expect(first!.outlays[interest]).toBe(
      Math.round((30_846_716_536_213 * FEDERAL_INTEREST_RATE) / 12),
    );
    expect(first!.debtHeldByPublic).toBe(30_846_716_536_213 + first!.deficit);
    // The borrowing costs interest the next month.
    expect(second!.outlays[interest]).toBeGreaterThan(
      first!.outlays[interest]!,
    );
    expect(first!.laws).toEqual([]);
  });

  it("does not add a second top-rate treasury share before adoption or after repeal", () => {
    const raise = enacted("yes", "2026-04-01");
    const repeal = enacted("no", "2028-07-01");
    const months = ["2026-12-01", "2027-01-01", "2028-12-01", "2029-01-01"];
    const none = settleThrough(lawWorld([]), months).months;
    const withLaws = settleThrough(lawWorld([raise, repeal]), months).months;
    expect(
      FEDERAL_LAW_EFFECTS.some(
        (row) => row.questionKey === RAISE_TOP_FEDERAL_RATE_QUESTION,
      ),
    ).toBe(false);
    for (const [index, row] of withLaws.entries()) {
      expect(row.receipts[income]).toBe(none[index]!.receipts[income]);
      expect(row.laws).toEqual([]);
      expect(row.debtHeldByPublic).toBe(none[index]!.debtHeldByPublic);
    }
  });

  it("spends 6.72% more on international affairs under a foreign aid law, and $150 billion a year less under debt-limit cuts", () => {
    const month = ["2026-06-01"];
    const none = settleThrough(lawWorld([]), month).months[0]!;
    const withLaws = settleThrough(
      lawWorld([
        enacted("yes", "2026-04-01", AID),
        enacted("yes", "2026-04-01", CUTS),
      ]),
      month,
    ).months[0]!;
    const intl = FEDERAL_OUTLAYS.indexOf("internationalAffairs");
    const defense = FEDERAL_OUTLAYS.indexOf("nationalDefense");
    expect(withLaws.outlays[defense]).toBe(none.outlays[defense]);
    expect(withLaws.outlays[interest]).toBe(none.outlays[interest]);
    // Foreign aid then the cut: 1.0672 times 0.9707 of the line.
    expect(withLaws.outlays[intl]! / none.outlays[intl]!).toBeCloseTo(
      1.0672 * (1 - 0.02928),
      4,
    );
    const total = (row: typeof none) =>
      row.outlays.reduce((sum, value) => sum + value, 0);
    const aidDollars = (45_169_891_179.7 * 0.0672 * (1 - 0.02928)) / 12;
    expect((total(none) - total(withLaws) + aidDollars) / 1e9).toBeCloseTo(
      150 / 12,
      1,
    );
  });

  it("spends $3.9 billion a year less on farms under a subsidy cut, and more on defense each year of a build-up, up to five", () => {
    const farm = FEDERAL_OUTLAYS.indexOf("agriculture");
    const defense = FEDERAL_OUTLAYS.indexOf("nationalDefense");
    const months = ["2026-03-01", "2027-04-01", "2033-04-01"];
    const none = settleThrough(lawWorld([]), months).months;
    const build = enacted("yes", "2026-04-01", DEFENSE);
    const withLaws = settleThrough(
      lawWorld([enacted("yes", "2026-04-01", FARM), build]),
      months,
    ).months;
    // Before either law, nothing moves.
    expect(withLaws[0]!.outlays).toEqual(none[0]!.outlays);
    // 21.18% of $18.35 billion of payments: 7.88% of Agriculture.
    expect(
      ((none[1]!.outlays[farm]! - withLaws[1]!.outlays[farm]!) * 12) / 1e9,
    ).toBeCloseTo(0.2118 * 18.3524102, 1);
    // A year in, contracts ($445.8 billion, 48.6% of defense) are 6.94% up.
    const rise = (index: number) =>
      withLaws[index]!.outlays[defense]! / none[index]!.outlays[defense]! - 1;
    expect(rise(1)).toBeCloseTo((445.8e9 / 916_648_676_662.05) * 0.0694, 3);
    // Seven years in, the build-up stopped after five.
    expect(rise(2)).toBeCloseTo(
      (445.8e9 / 916_648_676_662.05) * (1.0694 ** 5 - 1),
      4,
    );
    expect(withLaws[1]!.laws.map((law) => law.line)).toEqual([
      "nationalDefense",
      "agriculture",
    ]);
    expect(withLaws[1]!.laws[0]!.measureId).toBe(build.measure.id);
  });
});

const CASH_SEED = "a29-one-federal-tax-receipt-all56";
const cashPlaces = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`${CASH_SEED}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${CASH_SEED}:${b.jurisdictionKey}`),
    ),
  )
  .filter((place) => !isTerritory(place.jurisdictionKey))
  .slice(0, 5);

describe("A29 recorded federal income payments are counted once", () => {
  it.each(cashPlaces)(
    "keeps one income allocation in shared cash settlement for $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const f = smallWorld({
        place: jurisdictionKey,
        date: "2026-01-05",
        people: 3,
        seed: `${CASH_SEED}:${jurisdictionKey}`,
      });
      let world = ensureTaxPublicAccount(
        ensureNationalElectionJurisdiction(f.world),
        NATIONAL_ELECTION_JURISDICTION.id,
      );
      const federalAccount = world.history.organizations.find(
        (row) =>
          row.stableKey ===
          publicOrganizationKey(NATIONAL_ELECTION_JURISDICTION.id),
      )!;
      const owner = {
        kind: "organization" as const,
        organizationId: federalAccount.id,
      };
      const opening = resourcePositionAt(
        world,
        owner,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const provenance = {
        kind: "authored" as const,
        note: "Controlled recorded paycheck, not a natural wage or researched taxpayer count.",
      };
      world = createOrganization(world, {
        stableKey: "a29:employer",
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: "Recorded employer",
          classification: "enterprise:retail",
          locationJurisdictionId: f.stateJurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      world = createWorkRelationship(world, {
        stableKey: "a29:work",
        personId: f.personId,
        organizationId,
        startedAt: world.currentDate,
        kind: "employment:employee",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: "Recorded worker",
          occupationClassification: null,
          locationJurisdictionId: f.stateJurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "moderate",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "limited",
            locationJurisdictionId: f.stateJurisdictionId,
          },
        },
      });
      const workRelationshipId = world.history.workRelationships.at(-1)!.id;
      world = createResourcePosition(world, {
        stableKey: "a29:employer-cash",
        owner: { kind: "organization", organizationId },
        openedAt: world.currentDate,
        openingBalance: money(10_000_000, "USD"),
        provenance,
      });
      world = createResourcePosition(world, {
        stableKey: "a29:worker-cash",
        owner: { kind: "person", personId: f.personId },
        openedAt: world.currentDate,
        openingBalance: money(0, "USD"),
        provenance,
      });
      world = createWorkCompensation(world, {
        stableKey: "a29:pay",
        workRelationshipId,
        startsAt: world.currentDate,
        amount: money(10_000_000, "USD"),
        cadenceKind: "schedule:weekly",
        restrictionKind: null,
        jurisdictionId: f.stateJurisdictionId,
        provenance,
      });
      const flow = world.history.resourceFlows.at(-1)!;
      world = recordResourceTransferOutcome(world, {
        stableKey: "a29:pay-completed",
        resourceFlowId: flow.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        status: "completed",
        attemptedAmount: money(10_000_000, "USD"),
        transferredAmount: money(10_000_000, "USD"),
        reasonKind: null,
        note: provenance.note,
        provenance,
      });
      const payId = world.history.resourceTransferOutcomes.at(-1)!.id;
      world = assessPaychecksTaxes(world, [payId]);
      const liabilities = world.history.statutoryTaxLiabilities!.filter(
        (row) =>
          row.sourceOutcomeId === payId &&
          row.taxKey === FEDERAL_INCOME_TAX_KEY,
      );
      expect(liabilities).toHaveLength(1);
      const liability = liabilities[0]!;
      expect(liability.liability!.minorUnits).toBeGreaterThan(0);
      const payments = world.history.statutoryTaxPayments!.filter(
        (row) => row.liabilityId === liability.id,
      );
      expect(payments).toHaveLength(1);
      expect(payments[0]!.amount).toEqual(liability.liability);
      const month = makeIsoDate("2026-01-01");
      const empty: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      const budgets = withOpenedBudgets(world, empty, month);
      const government = budgets.federalGovernment!;
      const read = readMonthFlows(world, budgets);
      const actual = read.flows.recorded!.get(government.key)!;
      expect(actual.revenueMinorUnits[income]).toBe(
        payments[0]!.amount.minorUnits,
      );
      expect(actual.sourceRecordIds).toContain(payments[0]!.resourceOutcomeId);
      // The balance includes actual payroll taxes too; income is its own allocation.
      const transfers = world.history.resourceTransferOutcomes.filter(
        (outcome) =>
          world.history.resourceFlows.find(
            (row) => row.id === outcome.resourceFlowId,
          )?.recipient.kind === "organization" &&
          (
            world.history.resourceFlows.find(
              (row) => row.id === outcome.resourceFlowId,
            )!.recipient as { organizationId: EntityId }
          ).organizationId === federalAccount.id,
      );
      expect(
        resourcePositionAt(world, owner, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(
        opening +
          transfers.reduce(
            (sum, row) => sum + row.transferredAmount.minorUnits,
            0,
          ),
      );
      const settled = settleGovernmentMonth(
        world,
        government,
        month,
        read.flows,
      ).government;
      expect(settled.months.at(-1)!.revenue[income]).toBe(
        payments[0]!.amount.minorUnits / 100,
      );
      expect(settled.months.at(-1)!.cashSettlement.sourceRecordIds).toContain(
        payments[0]!.resourceOutcomeId,
      );
      const restored = deserializeWorld(serializeWorld(world));
      const repeated = assessPaychecksTaxes(restored, [payId]);
      expect(repeated.history.statutoryTaxLiabilities).toEqual(
        world.history.statutoryTaxLiabilities,
      );
      expect(repeated.history.statutoryTaxPayments).toEqual(
        world.history.statutoryTaxPayments,
      );
      expect(repeated.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      const restoredRead = readMonthFlows(repeated, budgets);
      expect(
        restoredRead.flows.recorded!.get(government.key)!.revenueMinorUnits[
          income
        ],
      ).toBe(payments[0]!.amount.minorUnits);
      stdout.write(
        JSON.stringify({
          place: jurisdictionKey,
          person: personName(world.people[f.personId]!),
          personId: f.personId,
          payId,
          liabilityId: liability.id,
          paymentId: payments[0]!.id,
          transferId: payments[0]!.resourceOutcomeId,
          incomeMinor: payments[0]!.amount.minorUnits,
          accountId: federalAccount.id,
        }) + "\n",
      );
    },
  );
});
