import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../dates";
import {
  STATEHOOD_ADMISSION_DAYS,
  STATEHOOD_QUESTION,
  statehoodAdmittedOn,
  statehoodPlace,
} from "../governing/statehood-admission";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import type { EntityId, World } from "../types";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { statehoodFederalAidLoss } from "./statehood-funds";

/*
 * Statehood changes no federal payment when the place is admitted. The new
 * state's own government decides, when it adopts a budget, whether it can
 * cover five years of what ending the higher Medicaid match costs, and only
 * a state that certifies loses that federal aid, from the fiscal year after.
 * The world here is partial, as in tuition-freeze.test.ts.
 */

const STATEHOOD = "proposition_statehood" as EntityId;
const PLACE_KEY = `US-${statehoodPlace()}`;
const FEDERAL_AID = BUDGET_SOURCES.indexOf("federalAid");

function worldWith(effectiveAt: string | null): World {
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: {
        [STATEHOOD]: { id: STATEHOOD, stableKey: STATEHOOD_QUESTION },
      },
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: effectiveAt
        ? [
            {
              id: "measure_statehood" as EntityId,
              jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
              propositionIds: [STATEHOOD],
              propositionAnswers: [{ propositionId: STATEHOOD, answer: "yes" }],
            },
          ]
        : [],
      legislativeEnactments: effectiveAt
        ? [
            {
              id: "enactment_statehood" as EntityId,
              sequence: 1000,
              measureId: "measure_statehood" as EntityId,
              resolvedAt: makeIsoDate(effectiveAt),
              outcome: "enacted",
              effectiveAt: makeIsoDate(effectiveAt),
            },
          ]
        : [],
    },
  } as unknown as World;
}

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

function settled(world: World, stateKey: string, last: string) {
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened = {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
  let current = publicBudgetFor(opened, stateJurisdictionForKey(stateKey)!.id)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= last) {
    current = settleGovernmentMonth(world, current, month, NO_FLOWS).government;
    month = firstOfNextMonth(month);
  }
  return current;
}

const revenueIn = (
  government: PublicBudgetGovernment,
  source: (typeof BUDGET_SOURCES)[number],
  month: string,
) =>
  government.months.find((row) => row.month === month)!.revenue[
    BUDGET_SOURCES.indexOf(source)
  ]!;

const certificationOf = (
  government: PublicBudgetGovernment,
  startsOn: string,
) =>
  government.years.find((year) => year.startsOn === startsOn)
    ?.statehoodCertification;

describe("statehood and the state's federal aid", () => {
  it("reads the loss from the measured Medicaid and children's insurance matches, 20 points of $3.42 billion and 14 of $68.3 million", () => {
    expect(statehoodFederalAidLoss()).toBe(684_000_000 + 9_562_000);
  });

  it("admits the place the bill's days after the law takes effect, not the day it does", () => {
    const world = worldWith("2026-03-01");
    const admitted = addDays(
      makeIsoDate("2026-03-01"),
      STATEHOOD_ADMISSION_DAYS,
    );
    expect(STATEHOOD_ADMISSION_DAYS).toBe(180);
    expect(statehoodAdmittedOn(world, makeIsoDate("2026-03-01"))).toBeNull();
    expect(statehoodAdmittedOn(world, addDays(admitted, -1))).toBeNull();
    expect(statehoodAdmittedOn(world, admitted)).toBe(admitted);
    expect(statehoodAdmittedOn(worldWith(null), admitted)).toBeNull();
  });

  it("changes nothing at admission, then a state that can cover five years certifies and its federal aid falls by the lost match from the fiscal year after", () => {
    // Admitted August 28, 2026; the first budget it adopts starts October 1,
    // 2026, while the balance it opened with is still on hand.
    const lawful = settled(worldWith("2026-03-01"), PLACE_KEY, "2029-09-01");
    const asBegun = settled(worldWith(null), PLACE_KEY, "2029-09-01");
    const decision = certificationOf(lawful, "2026-10-01")!;
    expect(decision.certified).toBe(true);
    expect(decision.changeStartsOn).toBe("2027-10-01");
    expect(decision.reason).toContain("certifies to the President");
    // Admission (August 2026) and the certification year change no money.
    for (const month of ["2026-08-01", "2026-09-01", "2027-09-01"])
      expect(revenueIn(lawful, "federalAid", month), month).toBe(
        revenueIn(asBegun, "federalAid", month),
      );
    const loss = statehoodFederalAidLoss() / 12;
    for (const month of ["2027-10-01", "2028-06-01", "2029-09-01"])
      expect(
        revenueIn(asBegun, "federalAid", month) -
          revenueIn(lawful, "federalAid", month),
        month,
      ).toBeCloseTo(loss, -1);
    // The budget adopted for the fiscal year expects the lower aid.
    const adopted = (government: PublicBudgetGovernment) =>
      government.years.find((year) => year.startsOn === "2027-10-01")!;
    expect(
      adopted(asBegun).expectedRevenue[FEDERAL_AID]! -
        adopted(lawful).expectedRevenue[FEDERAL_AID]!,
    ).toBeCloseTo(statehoodFederalAidLoss(), -2);
    // Every other source is untouched.
    for (const source of BUDGET_SOURCES) {
      if (source === "federalAid") continue;
      expect(revenueIn(lawful, source, "2028-06-01"), source).toBe(
        revenueIn(asBegun, source, "2028-06-01"),
      );
    }
  });

  it("a state whose books cannot cover five years declines, writes down why, and keeps the higher match", () => {
    // Admitted November 28, 2027, after the opening balance has been spent.
    const lawful = settled(worldWith("2027-06-01"), PLACE_KEY, "2029-09-01");
    const asBegun = settled(worldWith(null), PLACE_KEY, "2029-09-01");
    const declined = certificationOf(lawful, "2028-10-01")!;
    expect(declined.certified).toBe(false);
    expect(declined.changeStartsOn).toBeNull();
    expect(declined.reason).toContain("does not certify");
    // It asks again the next year, and the books still cannot cover it.
    expect(certificationOf(lawful, "2029-10-01")!.certified).toBe(false);
    for (const month of ["2028-10-01", "2029-09-01"])
      expect(revenueIn(lawful, "federalAid", month), month).toBe(
        revenueIn(asBegun, "federalAid", month),
      );
  });

  it("moves no other state's federal aid, drawn from all 56 places", () => {
    const keys = Object.keys(STATES)
      .map((usps) => `US-${usps}`)
      .filter((key) => key !== PLACE_KEY);
    const seed = "b14-statehood-funds";
    const stateKey = keys[new SeededRng(seed).nextUint32() % keys.length]!;
    const lawful = settled(worldWith("2026-03-01"), stateKey, "2028-09-01");
    const asBegun = settled(worldWith(null), stateKey, "2028-09-01");
    for (const month of ["2026-09-01", "2027-10-01", "2028-09-01"])
      expect(
        revenueIn(lawful, "federalAid", month),
        `${stateKey} ${month}`,
      ).toBe(revenueIn(asBegun, "federalAid", month));
    expect(lawful.years.some((year) => year.statehoodCertification)).toBe(
      false,
    );
  });
});
