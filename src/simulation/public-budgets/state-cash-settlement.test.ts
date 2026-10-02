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
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
const seed = "a33-state-cash-admission-five-places";
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
    formedAt: date,
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
    openedAt: date,
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

describe("A33 state settlement requires saved cash and recorded flows", () => {
  it.each(places)(
    "refuses missing-account and forecast-only settlement in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      expect(identities).toHaveLength(56);
      expect(places).toHaveLength(5);
      const f = fixture(jurisdictionKey);
      const bytes = serializeWorld(f.world);
      const missing = readMonthFlows(f.world, budget(f.government));
      expect(missing.flows.cash?.has(jurisdictionKey)).toBe(false);
      expect(
        settleGovernmentMonth(f.world, f.government, month, missing.flows),
      ).toEqual({ government: f.government, adjustments: [] });
      expect(serializeWorld(f.world)).toBe(bytes);
      expect(f.world.history.organizations).toHaveLength(0);

      const saved = account(
        f.world,
        publicOrganizationKey(f.jurisdiction.id),
        f.jurisdiction.id,
      );
      const read = readMonthFlows(saved.world, budget(f.government));
      expect(read.flows.cash?.get(jurisdictionKey)?.organizationId).toBe(
        saved.organizationId,
      );
      const savedBytes = serializeWorld(saved.world);
      for (const flows of [
        { ...read.flows, recorded: undefined },
        { ...read.flows, cash: undefined },
        { ...read.flows, recorded: undefined, cash: undefined },
      ]) {
        expect(
          settleGovernmentMonth(saved.world, f.government, month, flows),
        ).toEqual({ government: f.government, adjustments: [] });
        expect(serializeWorld(saved.world)).toBe(savedBytes);
      }

      // A real account with no paid activity is zero, unlike missing evidence.
      const settled = settleGovernmentMonth(
        saved.world,
        f.government,
        month,
        read.flows,
      ).government;
      expect(settled.months).toHaveLength(1);
      expect(settled.months[0]!.revenue).toEqual(BUDGET_SOURCES.map(() => 0));
      expect(settled.months[0]!.spending).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(settled.months[0]!.cashSettlement?.sourceRecordIds).toEqual([]);
      expect(settled.balance + settled.reserve).toBe(100);
      expect(serializeWorld(saved.world)).toBe(savedBytes);
    },
  );

  it.each(places)(
    "projects only a saved receipt and conserves cash across Continue in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const f = fixture(jurisdictionKey);
      const saved = account(
        f.world,
        publicOrganizationKey(f.jurisdiction.id),
        f.jurisdiction.id,
      );
      const payer = account(
        saved.world,
        "a33:state-cash:fixture-payer",
        f.jurisdiction.id,
      );
      let world = createResourceFlow(payer.world, {
        stableKey: "a33:state-cash:receipt",
        source: { kind: "organization", organizationId: payer.organizationId },
        recipient: {
          kind: "organization",
          organizationId: saved.organizationId,
        },
        startsAt: date,
        amount: money(125, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:tax-withholding",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: f.jurisdiction.id,
        provenance: {
          kind: "authored",
          note: "Explicit receipt fixture, not an assessed tax or researched rate.",
        },
      });
      const flowId = world.history.resourceFlows.at(-1)!.id;
      world = recordResourceTransferOutcome(world, {
        stableKey: "a33:state-cash:receipt-paid",
        resourceFlowId: flowId,
        periodStartsAt: date,
        periodEndsAt: date,
        occurredAt: date,
        attemptedAmount: money(125, "USD"),
        transferredAmount: money(125, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit completed receipt fixture.",
        provenance: { kind: "authored", note: "Saved receipt proof." },
      });
      const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
      world = advanceWorld(world, 1);
      const before = serializeWorld(world);
      const read = readMonthFlows(world, budget(f.government));
      const settled = settleGovernmentMonth(
        world,
        f.government,
        month,
        read.flows,
      ).government;
      expect(serializeWorld(world)).toBe(before);
      expect(settled.months).toHaveLength(1);
      expect(settled.months[0]!.revenue).toEqual(
        BUDGET_SOURCES.map((source) =>
          source === "individualIncomeTax" ? 1.25 : 0,
        ),
      );
      expect(settled.months[0]!.spending).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(settled.balance + settled.reserve).toBe(101.25);
      expect(settled.months[0]!.cashSettlement).toMatchObject({
        organizationId: saved.organizationId,
        positionId: saved.positionId,
        sourceRecordIds: [flowId, outcomeId],
      });
      expect(
        settleGovernmentMonth(world, settled, month, read.flows).government,
      ).toBe(settled);

      const savedWorld = {
        ...world,
        publicBudgets: { ...budget(settled), cursor: read.cursor },
      };
      const bytes = serializeWorld(savedWorld);
      const loaded = deserializeWorld(bytes);
      expect(serializeWorld(loaded)).toBe(bytes);
      const repeated = readMonthFlows(loaded, loaded.publicBudgets!);
      expect(repeated.flows.recorded?.size).toBe(0);
      expect(
        settleGovernmentMonth(
          loaded,
          loaded.publicBudgets!.governments[0]!,
          month,
          repeated.flows,
        ).government,
      ).toBe(loaded.publicBudgets!.governments[0]!);
      expect(serializeWorld(loaded)).toBe(bytes);
      expect(loaded.history.resourceTransferOutcomes).toEqual(
        savedWorld.history.resourceTransferOutcomes,
      );
    },
  );
});
