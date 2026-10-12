import { BUDGET_LAW_KEYS } from "./budget-policy";
import {
  allGovernmentUnits,
  governmentUnit,
  countyGovernmentUnit,
  governmentUnitJurisdictionId,
} from "../../simulation/government-units";
import { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import {
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
  type PublicBudgetStore,
  type PublicBudgetGovernment,
} from "../../simulation/public-budgets/store";
import * as native from "../../simulation/public-budgets/month";
import {
  ensureStateJurisdictionForKey,
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "../../simulation/nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForIdentity,
} from "../../simulation/tax-policy";
import { publicGovernmentIdentityForRecord } from "../../simulation/public-government-identity";
import {
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "../../simulation/resources";
import * as own from "./budget-month";
import { budgetMonthFacts } from "./test-support/budget-month-facts";
import { budgetFlowFacts } from "./test-support/budget-flow-facts";
import { readMonthFlows } from "./budget-flows";
import { SPENDING_QUESTION_EFFECTS } from "./budget-month-policy";
import { savedLaw } from "./test-support/saved-law";
import type { World } from "../../simulation/types";
const months = Array.from({ length: 13 }, (_, i) =>
  makeIsoDate(
    `${2026 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`,
  ),
);
const frontiers = Array.from({ length: 38 }, (_, i) =>
  makeIsoDate(
    `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`,
  ),
);
const provenance = {
  kind: "authored" as const,
  note: "Labeled saved public-account and paid tax/expense control, not ordinary NPC fiscal activity.",
};
const unitsByJurisdiction = new Map(
  allGovernmentUnits()
    .filter((unit) =>
      ["county", "municipality", "township"].includes(unit.unitType),
    )
    .map((unit) => [governmentUnitJurisdictionId(unit), unit]),
);
function account(world: World, gov: PublicBudgetGovernment): World {
  if (!world.jurisdictions[gov.jurisdictionId]) {
    const geoid = gov.key.startsWith("county:")
      ? gov.key.slice("county:".length)
      : null;
    const unit =
      unitsByJurisdiction.get(gov.jurisdictionId) ??
      (geoid
        ? (countyGovernmentUnit(geoid) ?? governmentUnit("municipio:" + geoid))
        : null);
    if (!unit) return world; // Explicit unsupported source identity; no synthetic jurisdiction.
    world = ensureLocalGovernmentOrganization(world, unit);
  }
  return ensurePublicGovernmentAccount(
    world,
    publicGovernmentIdentityForRecord(gov),
    { amountMinorUnits: 100000000, sourceNote: provenance.note },
  );
}
function paid(world: World, gov: PublicBudgetGovernment): World {
  const owner = publicTaxAccountForIdentity(
    world,
    publicGovernmentIdentityForRecord(gov),
  );
  if (!owner) return world;
  for (const basisKind of [
    "custom:tax-withholding",
    "custom:public-expense",
  ] as const) {
    const incoming = basisKind === "custom:tax-withholding";
    world = createResourceFlow(world, {
      stableKey: "rules2:month:" + gov.key + ":" + basisKind,
      source: incoming
        ? { kind: "person", personId: world.personOrder[0]! }
        : { kind: "organization", organizationId: owner.organizationId },
      recipient: incoming
        ? { kind: "organization", organizationId: owner.organizationId }
        : { kind: "person", personId: world.personOrder[0]! },
      startsAt: world.currentDate,
      amount: money(12345, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: gov.jurisdictionId,
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "rules2:month:paid:" + gov.key + ":" + basisKind,
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "partial",
      attemptedAmount: money(12345, "USD"),
      transferredAmount: money(6000, "USD"),
      reasonKind: "capacity:insufficient-funds",
      note: provenance.note,
      provenance,
    });
  }
  return world;
}
describe("complete monthly budget public parents and private helpers over raw saved facts in all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          offices: ["governor"],
          seed: "rules2:economy:budget-month:" + usps,
        });
        let world = ensureNationalElectionJurisdiction(
          ensureStateJurisdictionForKey(fixture.world, "US-" + usps),
        );
        world = ensureStateExecutiveIncumbent(world, fixture.personId, usps);
        if (stateExecutiveOffice(usps))
          expect(
            currentStateExecutiveHolders(world).some(
              (holder) => holder.stateUsps === usps,
            ),
          ).toBe(true);
        const empty: PublicBudgetStore = {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        };
        const store = withOpenedBudgets(world, empty, world.currentDate);
        const selected = store.governments
          .filter((row) => row.stateKey === "US-" + usps)
          .filter(
            (row, i, list) =>
              list.findIndex((g) => g.level === row.level) === i,
          );
        expect(selected.some((row) => row.level === "state")).toBe(true);
        for (const gov of selected) {
          world = account(world, gov);
          world = paid(world, gov);
        }
        world = ensurePublicGovernmentAccount(
          world,
          {
            kind: "jurisdiction",
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          },
          { amountMinorUnits: 100000000, sourceNote: provenance.note },
        );
        world = { ...world, publicBudgets: store };
        const dates = [...frontiers, world.currentDate];
        const ids = selected.map((row) => row.lawJurisdictionId);
        const facts = budgetMonthFacts(world, ids, dates);
        const flowFacts = budgetFlowFacts(world, store);
        const flows = readMonthFlows(flowFacts, store).flows;
        expect(flows).toEqual(native.readMonthFlows(world, store).flows);
        for (const gov of selected) {
          for (const date of [
            world.currentDate,
            makeIsoDate("2026-07-01"),
            makeIsoDate("2027-01-01"),
          ]) {
            for (const source of BUDGET_SOURCES)
              for (const include of [true, false])
                expect(
                  own.taxLawFactor(facts, gov, source, date, date, include),
                ).toEqual(
                  native.taxLawFactor(world, gov, source, date, date, include),
                );
            expect(own.lawSpendingForMonth(facts, gov, date)).toEqual(
              native.lawSpendingForMonth(world, gov, date),
            );
            for (const effect of SPENDING_QUESTION_EFFECTS)
              expect(
                own.lawSpendingPerResident(
                  facts,
                  gov.lawJurisdictionId,
                  effect,
                  date,
                ),
              ).toEqual(
                nativeFiscal(world, gov.lawJurisdictionId, effect, date),
              );
          }
          expect(own.decideShortfallOrder(facts, gov)).toEqual(
            native.decideShortfallOrder(world, gov),
          );
          for (const change of [-1000000, 0, 1000000])
            for (const balanced of [true, false])
              for (const drawable of [0, 2000000])
                expect(
                  own.decideLawMoneyReaction(
                    facts,
                    gov,
                    change,
                    balanced,
                    drawable,
                  ),
                ).toEqual(
                  native.decideLawMoneyReaction(
                    world,
                    gov,
                    change,
                    balanced,
                    drawable,
                  ),
                );
          let current = gov;
          for (const month of months) {
            const state = selected.find((row) => row.level === "state") ?? null;
            const expected = native.settleGovernmentMonth(
              world,
              current,
              month,
              flows,
              state,
            );
            expect(
              own.settleGovernmentMonth(facts, current, month, flows, state),
            ).toEqual(expected);
            expect(
              own.settleGovernmentMonth(
                facts,
                expected.government,
                month,
                flows,
                state,
              ),
            ).toEqual(
              native.settleGovernmentMonth(
                world,
                expected.government,
                month,
                flows,
                state,
              ),
            );
            current = expected.government;
          }
          if (flows.cash?.has(gov.key)) {
            expect(current.months.length).toBe(months.length);
            expect(current.years.length).toBeGreaterThan(1);
          } else {
            expect(current).toEqual(gov);
          }
          expect(
            own.proposeNextYearBudget(
              facts,
              current,
              selected.find((row) => row.level === "state") ?? null,
            ),
          ).toEqual(
            native.proposeNextYearBudget(
              world,
              current,
              selected.find((row) => row.level === "state") ?? null,
            ),
          );
          const prior = current.years.at(-1)!;
          expect(
            own.lawMoneyChange(
              facts,
              current,
              prior,
              prior.expectedRevenue,
              prior.startsOn,
            ),
          ).toEqual(
            native.lawMoneyChange(
              world,
              current,
              prior,
              prior.expectedRevenue,
              prior.startsOn,
            ),
          );
        }
        const federal = store.federalGovernment!;
        expect(
          own.settleGovernmentMonth(facts, federal, months[0]!, flows),
        ).toEqual(
          native.settleGovernmentMonth(world, federal, months[0]!, flows),
        );
        const state = selected.find((row) => row.level === "state")!;
        const balanced = savedLaw(
          world,
          BUDGET_LAW_KEYS.balanced,
          state.lawJurisdictionId,
          null,
        );
        const balancedFacts = budgetMonthFacts(balanced, ids, dates);
        const prior = state.years.at(-1)!;
        const quarter = months.find(
          (month) =>
            month >= prior.startsOn &&
            month < prior.endsOn &&
            (Number(month.slice(0, 4)) * 12 +
              Number(month.slice(5, 7)) -
              (Number(prior.startsOn.slice(0, 4)) * 12 +
                Number(prior.startsOn.slice(5, 7))) +
              1) %
              3 ===
              0,
        )!;
        const cash = flows.cash!.get(state.key)!;
        // Authored receipt/budget edge, not saved NPC spending or real negative cash.
        for (const balanceMinorUnits of [0, -500000000]) {
          const control = {
            ...flows,
            cash: new Map([[state.key, { ...cash, balanceMinorUnits }]]),
            recorded: new Map([
              [
                state.key,
                {
                  revenueMinorUnits: state.years[0]!.expectedRevenue.map(
                    () => 0,
                  ),
                  spendingMinorUnits: state.years[0]!.appropriations.map(
                    (_, at) => (at === 0 ? 50000000 : 0),
                  ),
                  sourceRecordIds: [],
                  lawEffectStamps: [],
                },
              ],
            ]),
          };
          const controlled = { ...state, reserve: 100 };
          expect(
            own.settleGovernmentMonth(
              balancedFacts,
              controlled,
              quarter,
              control,
            ),
          ).toEqual(
            native.settleGovernmentMonth(
              balanced,
              controlled,
              quarter,
              control,
            ),
          );
          const end = makeIsoDate(prior.endsOn.slice(0, 7) + "-01");
          expect(
            own.settleGovernmentMonth(balancedFacts, controlled, end, control),
          ).toEqual(
            native.settleGovernmentMonth(balanced, controlled, end, control),
          );
        }

        const enacted = savedLaw(
          world,
          SPENDING_QUESTION_EFFECTS[0]!.questionKey,
          state.lawJurisdictionId,
          null,
        );
        const enactedFacts = budgetMonthFacts(enacted, ids, dates);
        expect(
          own.lawSpendingForMonth(enactedFacts, state, world.currentDate),
        ).toEqual(
          native.lawSpendingForMonth(enacted, state, world.currentDate),
        );
        for (const missing of [
          {
            withheld: new Map(),
            represented: new Map(),
            levies: new Map(),
            payments: new Map(),
          },
          { ...flows, recorded: undefined },
        ])
          expect(
            own.settleGovernmentMonth(facts, state, months[0]!, missing),
          ).toEqual(
            native.settleGovernmentMonth(world, state, months[0]!, missing),
          );
      },
      60000,
    );
});
import { lawSpendingPerResident as nativeFiscal } from "../../simulation/public-budgets/fiscal";
