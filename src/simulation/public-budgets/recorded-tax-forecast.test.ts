import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import { createOrganization } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { publicOrganizationKey } from "../tax-policy";
import type { EntityId, World } from "../types";
import { advanceWorld, createWorld } from "../world";
import { withOpenedBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
  type BudgetMonthRow,
} from "./store";

const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
const seed = "a33-recorded-tax-forecast-five-places";
const identities = lifePlaceStateIdentities();
// Select fixture identities from all 56; never select money or an actor's result.
const places = [...identities]
  .sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

function budget(government: PublicBudgetGovernment): PublicBudgetStore {
  return {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [government],
    adjustments: [],
    unknown: [],
  };
}

function fixture(stateKey: string) {
  const jurisdiction = stateJurisdictionForKey(stateKey);
  if (!jurisdiction)
    throw new Error(`Missing fixture jurisdiction: ${stateKey}`);
  const world = createWorld({
    seed: `${seed}:${stateKey}`,
    currentDate: date,
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION, jurisdiction],
    people: [],
    lineage: "production",
  });
  const empty: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened = withOpenedBudgets(world, empty, month);
  const government = opened.governments.find((row) => row.key === stateKey);
  if (!government) throw new Error(`Missing opened state budget: ${stateKey}`);
  return { world, government, jurisdiction };
}

function account(world: World, stableKey: string, jurisdictionId: EntityId) {
  let next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: "Explicit saved cash fixture, not tax authority or forecast revenue.",
    },
    initialProfile: {
      name: stableKey,
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: `${stableKey}:USD`,
    owner: { kind: "organization", organizationId },
    openedAt: next.currentDate,
    openingBalance: money(10_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit fixture opening cash.",
    },
  });
  return {
    world: next,
    organizationId,
    positionId: next.history.resourcePositions.at(-1)!.id,
  };
}

describe("A33 tax forecasts reuse recorded cash, not law factors", () => {
  it.each(places)(
    "annualizes only saved receipts at fiscal rollover in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const f = fixture(jurisdictionKey);
      const year = f.government.years.at(-1)!;
      const receiptDate = year.endsOn;
      const receiptMonth = makeIsoDate(`${receiptDate.slice(0, 7)}-01`);
      const endWorld = createWorld({
        seed: `${seed}:${jurisdictionKey}`,
        currentDate: receiptDate,
        jurisdictions: [NATIONAL_ELECTION_JURISDICTION, f.jurisdiction],
        people: [],
        lineage: "production",
      });
      const saved = account(
        endWorld,
        publicOrganizationKey(f.jurisdiction.id),
        f.jurisdiction.id,
      );
      const payer = account(
        saved.world,
        "a33:forecast:payer",
        f.jurisdiction.id,
      );
      let world = createResourceFlow(payer.world, {
        stableKey: "a33:forecast:receipt",
        source: { kind: "organization", organizationId: payer.organizationId },
        recipient: {
          kind: "organization",
          organizationId: saved.organizationId,
        },
        startsAt: receiptDate,
        amount: money(125, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:tax-withholding",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: f.jurisdiction.id,
        provenance: {
          kind: "authored",
          note: "Explicit paid receipt, not tax authority or assessment proof.",
        },
      });
      const flowId = world.history.resourceFlows.at(-1)!.id;
      world = recordResourceTransferOutcome(world, {
        stableKey: "a33:forecast:receipt-paid",
        resourceFlowId: flowId,
        periodStartsAt: receiptDate,
        periodEndsAt: receiptDate,
        occurredAt: receiptDate,
        attemptedAmount: money(125, "USD"),
        transferredAmount: money(125, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit receipt fixture.",
        provenance: { kind: "authored", note: "Saved receipt proof." },
      });
      const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
      world = advanceWorld(world, 1);
      const before = serializeWorld(world);
      const read = readMonthFlows(world, budget(f.government));
      const settled = settleGovernmentMonth(
        world,
        f.government,
        receiptMonth,
        read.flows,
      ).government;
      expect(settled.years).toHaveLength(f.government.years.length + 1);
      const expected = BUDGET_SOURCES.map((source) =>
        source === "individualIncomeTax" ? 15 : 0,
      );
      expect(settled.years.at(-1)!.expectedRevenue).toEqual(expected);
      expect(settled.months.at(-1)!.revenue).toEqual(
        expected.map((value) => value / 12),
      );
      expect(settled.months.at(-1)!.cashSettlement?.sourceRecordIds).toEqual([
        flowId,
        outcomeId,
      ]);
      expect(serializeWorld(world)).toBe(before);
      expect(world.history.taxAssessments ?? []).toHaveLength(0);
      expect(world.history.statutoryTaxLiabilities ?? []).toHaveLength(0);

      // An old forecast-only row is not evidence that cash was collected.
      const legacy: BudgetMonthRow = {
        ...settled.months.at(-1)!,
        month: year.startsOn,
        revenue: BUDGET_SOURCES.map(() => 900_000),
        cashSettlement: undefined,
      };
      const inherited = { ...f.government, months: [legacy] };
      const withLegacy = settleGovernmentMonth(
        world,
        inherited,
        receiptMonth,
        read.flows,
      ).government;
      expect(withLegacy.years.at(-1)!.expectedRevenue).toEqual(expected);
      expect(serializeWorld(world)).toBe(before);

      const emptyRead = readMonthFlows(saved.world, budget(f.government));
      const noReceipts = settleGovernmentMonth(
        saved.world,
        f.government,
        receiptMonth,
        emptyRead.flows,
      ).government;
      expect(noReceipts.years.at(-1)!.expectedRevenue).toEqual(
        BUDGET_SOURCES.map(() => 0),
      );

      const savedWorld = {
        ...world,
        publicBudgets: { ...budget(settled), cursor: read.cursor },
      };
      const bytes = serializeWorld(savedWorld);
      const loaded = deserializeWorld(bytes);
      const repeated = readMonthFlows(loaded, loaded.publicBudgets!);
      expect(
        settleGovernmentMonth(
          loaded,
          loaded.publicBudgets!.governments[0]!,
          receiptMonth,
          repeated.flows,
        ).government,
      ).toBe(loaded.publicBudgets!.governments[0]!);
      expect(serializeWorld(loaded)).toBe(bytes);
      expect(loaded.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
    },
  );
});
