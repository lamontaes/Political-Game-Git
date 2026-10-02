import { describe, expect, it } from "vitest";
import {
  city,
  FIXTURE,
  pay as fundAccount,
} from "../../../tests/fixtures/public-program-fixture";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createExplicitGeographyLife } from "../../presentation/new-game-geography";
import { addDays, makeIsoDate } from "../dates";
import {
  commitPublicProgram,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "../governing/public-program";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  ensureStateJurisdictionForKey,
} from "../nationwide-world/state-executives";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";
import { withOpenedBudgets } from "./index";

// Explicit acceptance inputs, not real enrollment, matching terms,
// admission acts, certificates, or production spending defaults.
const PROGRAM = "fixture:traditional-medicaid";
function fixture(seed: string, amount: number) {
  const g = city(seed, 10_000);
  const stateKey = lifePlaceByJurisdictionId(
    g.jurisdictionId,
  )!.stateJurisdictionKey!;
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  let world = ensureStateJurisdictionForKey(g.world, stateKey);
  world = ensureStateExecutiveIncumbent(world, g.manager, stateKey.slice(3));
  const executiveId = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === stateKey.slice(3),
  )!.personId;
  world = ensureTaxPublicAccount(world, jurisdictionId);
  const accountId = publicTaxAccountForJurisdiction(
    world,
    jurisdictionId,
  )!.organizationId;
  world = fundAccount(
    world,
    `${seed}:state-receipt`,
    g.payer,
    accountId,
    10_000,
  );
  const adopted = recordProgramAppropriation(world, {
    edition: seed,
    programKey: PROGRAM,
    jurisdictionId,
    accountOrganizationId: accountId,
    amount: money(amount, "USD"),
    availableFrom: g.world.currentDate,
    availableThrough: addDays(g.world.currentDate, 30),
    basis: FIXTURE,
  });
  const empty: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const government = withOpenedBudgets(
    adopted.world,
    empty,
    adopted.world.currentDate,
  ).governments.find((row) => row.key === stateKey && row.level === "state")!;
  expect(government).toBeDefined();
  // Exclude the fixture account-funding receipt; read subsequent installments.
  const store: PublicBudgetStore = {
    ...empty,
    governments: [government],
    cursor: {
      flows: adopted.world.history.resourceFlows.length,
      outcomes: adopted.world.history.resourceTransferOutcomes.length,
    },
  };
  return {
    ...g,
    executiveId,
    world: adopted.world,
    appropriationId: adopted.id,
    government,
    store,
  };
}
function pay(f: ReturnType<typeof fixture>, amount: number) {
  const committed = commitPublicProgram(f.world, {
    appropriationId: f.appropriationId,
    alternative: {
      key: "saved-payment",
      title: "Explicit Medicaid payment fixture",
      installments: [
        { afterDays: 0, amount: money(amount, "USD"), purpose: "operating" },
      ],
      deliveryLeadDays: null,
    },
    personId: f.executiveId,
    office: { kind: "state-executive" },
    recipientOrganizationId: f.operator,
  });
  if (!committed.ok) throw new Error(committed.reason);
  return settleProgramInstallment(committed.world, committed.recordId, 0);
}
function settle(
  world: World,
  government: PublicBudgetGovernment,
  store: PublicBudgetStore,
) {
  const read = readMonthFlows(world, store);
  const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
  return {
    read,
    month,
    government: settleGovernmentMonth(world, government, month, read.flows)
      .government,
  };
}
describe("A24 recorded Medicaid spending uses the existing program spending row", () => {
  it.each([125, 325, 675])(
    "records exactly %i paid minor units without a frozen annual aid loss",
    (amount) => {
      const f = fixture(`a24-paid-${amount}`, amount);
      const paid = pay(f, amount);
      expect(paid.installment.status).toBe("posted");
      const result = settle(paid.world, f.government, f.store);
      const row = result.government.months.at(-1)!;
      expect(row.spending).toEqual(
        BUDGET_PROGRAMS.map((program) =>
          program === "welfareAndMedicaid" ? amount / 100 : 0,
        ),
      );
      expect(row.revenue).toEqual(BUDGET_SOURCES.map(() => 0));
      const outcome = paid.world.history.resourceTransferOutcomes.at(-1)!;
      expect(outcome.transferredAmount.minorUnits).toBe(amount);
      expect(row.cashSettlement?.sourceRecordIds).toContain(outcome.id);
      expect(row.cashSettlement?.sourceRecordIds).toContain(
        outcome.resourceFlowId,
      );
      expect(
        result.government.years.some((year) => year.statehoodCertification),
      ).toBe(false);
    },
  );
  it("does not turn an appropriation or cash capacity into paid program spending or certification", () => {
    const f = fixture("a24-authority-is-not-payment", 125);
    const row = settle(f.world, f.government, f.store).government.months.at(
      -1,
    )!;
    expect(row.spending).toEqual(BUDGET_PROGRAMS.map(() => 0));
    expect(row.revenue).toEqual(BUDGET_SOURCES.map(() => 0));
    expect(row.cashSettlement?.sourceRecordIds).toEqual([]);
    expect(
      f.world.history.publicProgramRecords?.some(
        (record) =>
          record.kind === "appropriation" && record.id === f.appropriationId,
      ),
    ).toBe(true);
  });
  it("preserves old certificate bytes through Continue without inventing an aid payment", () => {
    const f = fixture("a24-legacy-certificate", 325);
    const legacy = {
      decidedOn: f.world.currentDate,
      certified: true,
      changeStartsOn: f.world.currentDate,
      reason: "Explicit legacy-save fixture, not current authority.",
    };
    const government = {
      ...f.government,
      years: f.government.years.map((year) => ({
        ...year,
        statehoodCertification: legacy,
      })),
    };
    const saved = {
      ...f.world,
      publicBudgets: { ...f.store, governments: [government] },
    };
    const bytes = serializeWorld(saved);
    const loaded = deserializeWorld(bytes);
    expect(serializeWorld(loaded)).toBe(bytes);
    const settled = settle(
      loaded,
      loaded.publicBudgets!.governments[0]!,
      loaded.publicBudgets!,
    );
    expect(settled.government.years[0]!.statehoodCertification).toEqual(legacy);
    expect(settled.government.months.at(-1)!.revenue).toEqual(
      BUDGET_SOURCES.map(() => 0),
    );
    expect(settled.government.months.at(-1)!.spending).toEqual(
      BUDGET_PROGRAMS.map(() => 0),
    );
  });
  it("does not charge another government or repeat a saved payment after Continue", () => {
    const f = fixture("a24-replay-identity", 675);
    const paid = pay(f, 675);
    const result = settle(paid.world, f.government, f.store);
    expect(
      settleGovernmentMonth(
        paid.world,
        result.government,
        result.month,
        result.read.flows,
      ).government,
    ).toBe(result.government);
    const other = {
      ...f.government,
      key: "US-DC",
      jurisdictionId: stateJurisdictionForKey("US-DC")!.id,
      lawJurisdictionId: stateJurisdictionForKey("US-DC")!.id,
    };
    const otherStore = { ...f.store, governments: [other] };
    expect(
      settleGovernmentMonth(
        paid.world,
        other,
        result.month,
        readMonthFlows(paid.world, otherStore).flows,
      ).government,
    ).toBe(other);
    const saved = {
      ...paid.world,
      publicBudgets: {
        ...f.store,
        governments: [result.government],
        cursor: result.read.cursor,
      },
    };
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(
      readMonthFlows(loaded, loaded.publicBudgets!).flows.recorded?.size,
    ).toBe(0);
    expect(
      loaded.publicBudgets!.governments[0]!.months.at(-1)!.spending,
    ).toEqual(result.government.months.at(-1)!.spending);
  });
  it("opens a new game in a random recorded place before A24 READY", () => {
    const seed = "a24-recorded-program-spending-2026-10-02";
    const place = drawRandomPlace(seed);
    console.info("A24 random-place opening", {
      seed,
      placeKey: place.key,
      placeName: place.displayName,
    });
    const opened = createExplicitGeographyLife({ placeKey: place.key, seed });
    expect(opened.game.place.key).toBe(place.key);
    expect(opened.game.world.people[opened.game.playerPersonId]).toBeDefined();
  });
});
