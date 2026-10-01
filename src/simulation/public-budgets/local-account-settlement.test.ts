import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld, advanceWorld } from "../world";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../government-units";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import { createOrganization } from "../life";
import { publicGovernmentOrganizationKey } from "../public-government-identity";
import { publicOrganizationKey } from "../tax-policy";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { openGovernmentBudget } from "./opening";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
const selectionSeed = "m8-canonical-local-five-places";
// Draw test identities only from real catalog options; no person/money outcome is drawn.
const selection = new SeededRng(selectionSeed);
const eligible = allGovernmentUnits().filter((unit) => {
  if (
    !unit.functionalActive ||
    !["county", "municipality"].includes(unit.unitType)
  )
    return false;
  const place = lifePlaceByKey(
    unit.unitType === "county"
      ? `county:${unit.countyGeoid}`
      : (unit.placeGeoid ?? ""),
  );
  return place?.context.jurisdiction.id === governmentUnitJurisdictionId(unit);
});
const selected = [
  "county",
  "municipality",
  "county",
  "municipality",
  "county",
].map((kind) => {
  const options = eligible.filter((unit) => unit.unitType === kind);
  return options[selection.integer(0, options.length - 1)]!;
});

function budget(government: PublicBudgetGovernment): PublicBudgetStore {
  return {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [government],
    adjustments: [],
    unknown: [],
  };
}

function fixture(unit: (typeof selected)[number]) {
  const place = lifePlaceByKey(
    unit.unitType === "county"
      ? `county:${unit.countyGeoid}`
      : unit.placeGeoid!,
  )!;
  const jurisdiction = place.context.jurisdiction;
  const state = stateJurisdictionForKey(`US-${unit.stateUsps}`)!;
  const world = createWorld({
    seed: `${selectionSeed}:${unit.id}`,
    currentDate: date,
    jurisdictions: [state, jurisdiction],
    people: [],
    lineage: "production",
  });
  const government = openGovernmentBudget(
    world,
    {
      key:
        unit.unitType === "county"
          ? `county:${unit.countyGeoid}`
          : `place:${unit.placeGeoid}`,
      jurisdictionId: jurisdiction.id,
      lawJurisdictionId: jurisdiction.id,
      level: unit.unitType === "county" ? "county" : "city",
      name: unit.name,
      stateKey: `US-${unit.stateUsps}`,
      geoid: unit.unitType === "county" ? unit.countyGeoid : unit.placeGeoid,
    },
    date,
  );
  if (typeof government === "string")
    throw new Error(`${unit.id}: ${government}`);
  return {
    world,
    government,
    jurisdiction,
    state,
    stableKey: publicGovernmentOrganizationKey({
      kind: "local-government",
      governmentKey: unit.id,
      jurisdictionId: jurisdiction.id,
    }),
  };
}

function account(world: World, stableKey: string, jurisdictionId: EntityId) {
  let next = createOrganization(world, {
    stableKey,
    formedAt: date,
    provenance: {
      kind: "authored",
      note: "Explicit M8 account fixture; no tax/spending authority inferred.",
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
      note: "Explicit fixture cash, not a modeled opening amount.",
    },
  });
  return {
    world: next,
    organizationId,
    positionId: next.history.resourcePositions.at(-1)!.id,
  };
}

describe("M8 canonical local-account settlement", () => {
  it.each(selected)(
    "records exact saved cash/receipt IDs for $name ($stateUsps) and repeats after reload",
    (unit) => {
      const f = fixture(unit);
      const local = account(f.world, f.stableKey, f.jurisdiction.id);
      const payer = account(
        local.world,
        "m8:explicit-fixture-payer",
        f.state.id,
      );
      let world = createResourceFlow(payer.world, {
        stableKey: "m8:receipt",
        source: { kind: "organization", organizationId: payer.organizationId },
        recipient: {
          kind: "organization",
          organizationId: local.organizationId,
        },
        startsAt: date,
        amount: money(550, "USD"),
        cadenceKind: "custom:fixture-receipt",
        basisKind: "custom:fixture-receipt",
        basisReference: { kind: "general" },
        restrictionKind: "purpose:public-general-receipts",
        jurisdictionId: f.jurisdiction.id,
        provenance: {
          kind: "authored",
          note: "Explicit generic receipt; no tax liability or court-payment claim.",
        },
      });
      const flowId = world.history.resourceFlows.at(-1)!.id;
      world = recordResourceTransferOutcome(world, {
        stableKey: "m8:paid-receipt",
        resourceFlowId: flowId,
        periodStartsAt: date,
        periodEndsAt: date,
        occurredAt: date,
        attemptedAmount: money(550, "USD"),
        transferredAmount: money(550, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit M8 receipt fixture.",
        provenance: {
          kind: "authored",
          note: "Explicit saved payment fixture.",
        },
      });
      const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
      world = advanceWorld(world, 1);
      const read = readMonthFlows(world, budget(f.government));
      expect(read.flows.cash?.get(f.government.key)).toEqual({
        organizationId: local.organizationId,
        positionId: local.positionId,
        balanceMinorUnits: 10_550,
      });
      expect(
        read.flows.recorded?.get(f.government.key)?.sourceRecordIds,
      ).toEqual([flowId, outcomeId]);
      const settled = settleGovernmentMonth(
        world,
        f.government,
        month,
        read.flows,
      ).government;
      expect(settled.months).toHaveLength(1);
      // M5's reserve earmarks the same account's cash; it is not another asset.
      expect(settled.balance + settled.reserve).toBe(105.5);
      expect(settled.months[0]!.cashSettlement).toMatchObject({
        organizationId: local.organizationId,
        positionId: local.positionId,
        sourceRecordIds: [flowId, outcomeId],
      });
      const saved = {
        ...world,
        publicBudgets: { ...budget(settled), cursor: read.cursor },
      };
      const bytes = serializeWorld(saved);
      const reloaded = deserializeWorld(bytes);
      expect(serializeWorld(reloaded)).toBe(bytes);
      const repeated = readMonthFlows(reloaded, reloaded.publicBudgets!);
      expect(repeated.flows.recorded?.size).toBe(0);
      expect(
        settleGovernmentMonth(
          reloaded,
          reloaded.publicBudgets!.governments[0]!,
          month,
          repeated.flows,
        ).government,
      ).toEqual(settled);
    },
  );

  it.each(selected)(
    "rejects a local account whose profile names another jurisdiction in $name ($stateUsps)",
    (unit) => {
      const f = fixture(unit);
      const invalid = account(f.world, f.stableKey, f.state.id);
      const bytes = serializeWorld(invalid.world);
      const result = readMonthFlows(invalid.world, budget(f.government));
      expect(result.flows.cash?.has(f.government.key)).toBe(false);
      expect(serializeWorld(invalid.world)).toBe(bytes);
    },
  );

  it.each(selected)(
    "does not settle a current local budget without an actual account in $name ($stateUsps)",
    (unit) => {
      const f = fixture(unit);
      const bytes = serializeWorld(f.world);
      const result = readMonthFlows(f.world, budget(f.government));
      expect(result.flows.cash?.has(f.government.key)).toBe(false);
      expect(
        settleGovernmentMonth(f.world, f.government, month, result.flows),
      ).toEqual({ government: f.government, adjustments: [] });
      expect(serializeWorld(f.world)).toBe(bytes);
      expect(f.world.history.organizations).toHaveLength(0);
    },
  );

  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "keeps the existing jurisdiction-account reader for %s",
    (stateKey) => {
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      const world = createWorld({
        seed: `m8-control:${stateKey}`,
        currentDate: date,
        jurisdictions: [jurisdiction],
        people: [],
      });
      const saved = account(
        world,
        publicOrganizationKey(jurisdiction.id),
        jurisdiction.id,
      );
      const government = {
        key: stateKey,
        jurisdictionId: jurisdiction.id,
        lawJurisdictionId: jurisdiction.id,
        level: "state",
      } as PublicBudgetGovernment;
      expect(
        readMonthFlows(saved.world, budget(government)).flows.cash?.get(
          stateKey,
        ),
      ).toEqual({
        organizationId: saved.organizationId,
        positionId: saved.positionId,
        balanceMinorUnits: 10_000,
      });
    },
  );

  it.each(selected)(
    "rejects a forecast-only local settlement in $name ($stateUsps)",
    (unit) => {
      const f = fixture(unit);
      const saved = account(f.world, f.stableKey, f.jurisdiction.id);
      const read = readMonthFlows(saved.world, budget(f.government));
      const forecastOnly = { ...read.flows, recorded: undefined };
      const bytes = serializeWorld(saved.world);
      expect(
        settleGovernmentMonth(saved.world, f.government, month, forecastOnly),
      ).toEqual({ government: f.government, adjustments: [] });
      expect(serializeWorld(saved.world)).toBe(bytes);
    },
  );

  it("preserves two distinct local/legacy accounts without guessing a consolidation", () => {
    const f = fixture(selected[0]!);
    const named = account(f.world, f.stableKey, f.jurisdiction.id);
    const legacy = account(
      named.world,
      publicOrganizationKey(f.jurisdiction.id),
      f.jurisdiction.id,
    );
    const bytes = serializeWorld(legacy.world);
    const result = readMonthFlows(legacy.world, budget(f.government));
    expect(result.flows.cash?.has(f.government.key)).toBe(false);
    expect(
      settleGovernmentMonth(legacy.world, f.government, month, result.flows),
    ).toEqual({ government: f.government, adjustments: [] });
    expect(serializeWorld(legacy.world)).toBe(bytes);
  });
});
