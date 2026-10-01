import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { advanceWorld, createWorld } from "../world";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import { createOrganization } from "../life";
import { publicOrganizationKey } from "../tax-policy";
import { publicGovernmentOrganizationKey } from "../public-government-identity";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../government-units";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { readMonthFlows } from "./month";
import {
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";
import type { EntityId, World } from "../types";

function government(
  key: string,
  jurisdictionId: EntityId,
  level: "state" | "county" | "city",
): PublicBudgetGovernment {
  // readMonthFlows only reads the government's identity; no modeled budget levels.
  return {
    key,
    jurisdictionId,
    lawJurisdictionId: jurisdictionId,
    level,
  } as PublicBudgetGovernment;
}
function store(
  governments: PublicBudgetGovernment[],
  flows = 0,
  outcomes = 0,
): PublicBudgetStore {
  return {
    version: PUBLIC_BUDGETS_VERSION,
    governments,
    cursor: { flows, outcomes },
    adjustments: [],
    unknown: [],
  };
}
function account(world: World, stableKey: string, jurisdictionId: EntityId) {
  let next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Payment bridge fixture account." },
    initialProfile: {
      name: stableKey,
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const id = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: `${stableKey}:cash`,
    owner: { kind: "organization", organizationId: id },
    openedAt: next.currentDate,
    openingBalance: money(10000, "USD"),
    provenance: { kind: "authored", note: "Explicit fixture cash." },
  });
  return { world: next, id };
}
function payment(
  world: World,
  source: EntityId,
  recipient: EntityId,
  jurisdictionId: EntityId,
  withholding = false,
) {
  const next = createResourceFlow(world, {
    stableKey: "bridge:flow",
    source: { kind: "organization", organizationId: source },
    recipient: { kind: "organization", organizationId: recipient },
    startsAt: world.currentDate,
    amount: money(1000, "USD"),
    cadenceKind: "custom:fixture-payment",
    basisKind: withholding
      ? "custom:tax-withholding"
      : "custom:fixture-payment",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:public-general-receipts",
    jurisdictionId,
    provenance: { kind: "authored", note: "Explicit bridge fixture flow." },
  });
  return next;
}
function transfer(world: World, amount: number, key: string) {
  return recordResourceTransferOutcome(world, {
    stableKey: key,
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    attemptedAmount: money(1000, "USD"),
    transferredAmount: money(amount, "USD"),
    status:
      amount === 1000 ? "completed" : amount === 0 ? "blocked" : "partial",
    reasonKind: amount === 1000 ? null : "capacity:insufficient-funds",
    note: "Explicit fixture transfer.",
    provenance: { kind: "authored", note: "Explicit actual cash transfer." },
  });
}
function fixture(stateKey: string) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  let world = createWorld({
    seed: `m6-bridge:${stateKey}`,
    currentDate: makeIsoDate("2026-09-30"),
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION, jurisdiction],
    people: [],
  });
  const publicAccount = account(
    world,
    publicOrganizationKey(jurisdiction.id),
    jurisdiction.id,
  );
  const other = account(publicAccount.world, "bridge:other", jurisdiction.id);
  world = other.world;
  return {
    world,
    jurisdictionId: jurisdiction.id,
    publicId: publicAccount.id,
    otherId: other.id,
    budget: store([government(stateKey, jurisdiction.id, "state")]),
  };
}

describe("M6 actual payment bridge", () => {
  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "counts saved partial receipts, later old-flow payments and no replay in %s",
    (stateKey) => {
      const f = fixture(stateKey);
      let world = payment(
        f.world,
        f.otherId,
        f.publicId,
        f.jurisdictionId,
        true,
      );
      world = transfer(world, 325, "bridge:first");
      const first = readMonthFlows(world, f.budget);
      expect(first.flows.withheld.get(stateKey)).toBe(3.25);
      world = advanceWorld(deserializeWorld(serializeWorld(world)), 1);
      world = transfer(world, 675, "bridge:later");
      const second = readMonthFlows(world, {
        ...f.budget,
        cursor: first.cursor,
      });
      expect(second.flows.withheld.get(stateKey)).toBe(6.75);
      expect(
        readMonthFlows(world, { ...f.budget, cursor: second.cursor }).flows
          .withheld.size,
      ).toBe(0);
      expect(
        first.flows.withheld.get(stateKey)! +
          second.flows.withheld.get(stateKey)!,
      ).toBe(10);
    },
  );
  it("preserves completed new-flow dollars and classifies partial public outlays without counting blocked attempts", () => {
    const f = fixture(`US-${Object.keys(STATES)[0]!}`);
    let world = payment(f.world, f.publicId, f.otherId, f.jurisdictionId);
    world = transfer(world, 1000, "bridge:completed");
    const completed = readMonthFlows(world, f.budget);
    expect(
      completed.flows.payments.get(f.budget.governments[0]!.key)?.[
        BUDGET_PROGRAMS.indexOf("otherPrograms")
      ],
    ).toBe(10);
    world = transfer(advanceWorld(world, 1), 225, "bridge:partial");
    world = transfer(advanceWorld(world, 1), 0, "bridge:blocked");
    const later = readMonthFlows(world, {
      ...f.budget,
      cursor: completed.cursor,
    });
    expect(
      later.flows.payments.get(f.budget.governments[0]!.key)?.[
        BUDGET_PROGRAMS.indexOf("otherPrograms")
      ],
    ).toBe(2.25);
  });
  it.each(["county", "municipality"] as const)(
    "joins a canonical %s account without treating it as the overlapping state account",
    (kind) => {
      const unit = allGovernmentUnits().find(
        (row) =>
          row.functionalActive &&
          row.unitType === kind &&
          (kind === "county" ? row.countyGeoid : row.placeGeoid),
      )!;
      const jurisdictionId = governmentUnitJurisdictionId(unit);
      const stateKey = `US-${unit.stateUsps}`;
      const state = stateJurisdictionForKey(stateKey)!;
      const localJurisdiction = {
        ...state,
        id: jurisdictionId,
        slug: "fixture-local",
        name: unit.name,
        provenance: { ...state.provenance, jurisdiction: jurisdictionId },
        parentJurisdictionId: state.id,
      };
      let world = createWorld({
        seed: `m6-local:${unit.id}`,
        currentDate: makeIsoDate("2026-09-30"),
        jurisdictions: [
          NATIONAL_ELECTION_JURISDICTION,
          state,
          localJurisdiction,
        ],
        people: [],
      });
      const local = account(
        world,
        publicGovernmentOrganizationKey({
          kind: "local-government",
          governmentKey: unit.id,
          jurisdictionId,
        }),
        jurisdictionId,
      );
      const other = account(local.world, "bridge:other", jurisdictionId);
      world = transfer(
        payment(other.world, other.id, local.id, jurisdictionId, true),
        550,
        "bridge:local",
      );
      const key =
        kind === "county"
          ? `county:${unit.countyGeoid}`
          : `place:${unit.placeGeoid}`;
      const result = readMonthFlows(
        world,
        store([
          government(stateKey, state.id, "state"),
          government(
            key,
            jurisdictionId,
            kind === "county" ? "county" : "city",
          ),
        ]),
      );
      expect(result.flows.withheld.get(key)).toBe(5.5);
      expect(result.flows.withheld.has(stateKey)).toBe(false);
    },
  );
});
