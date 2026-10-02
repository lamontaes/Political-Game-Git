import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { CANNABIS_TAX_EFFECT } from "./rules";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { SeededRng } from "../rng";
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
import { createWorld } from "../world";
import { withOpenedBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
const seed = "a17-cannabis-forecast-retirement-five-places";
const identities = lifePlaceStateIdentities();
// Select fixture identities from all 56; never select money or an actor's result.
const answers = startingLaw.questions[CANNABIS_TAX_EFFECT.questionKey].answers;
const rng = new SeededRng(seed);
const places = (["yes", "no"] as const).flatMap((answer) => {
  const pool = identities.filter(
    (place) =>
      answers[place.jurisdictionKey as keyof typeof answers]?.answer === answer,
  );
  return Array.from({ length: 5 }, () => ({
    ...pool.splice(rng.integer(0, pool.length), 1)[0]!,
    answer,
  }));
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

function withStartingLaw(
  world: World,
  jurisdictionId: EntityId,
  answer: "yes" | "no",
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === CANNABIS_TAX_EFFECT.questionKey,
  )!;
  expect(lawInForceAtStart(world, jurisdictionId, proposition.id, date)).toBe(
    answer,
  );
  return world;
}
// Authored cash fixtures prove the budget reader boundary, not lawful cannabis assessment.
describe("retired cannabis forecasts never become recorded public cash", () => {
  it.each(places)(
    "keeps no-activity receipts zero under the sourced starting law in $jurisdictionKey",
    ({ jurisdictionKey, answer }) => {
      const f = fixture(jurisdictionKey);
      const saved = account(
        f.world,
        publicOrganizationKey(f.jurisdiction.id),
        f.jurisdiction.id,
      );
      {
        const world = withStartingLaw(saved.world, f.jurisdiction.id, answer);
        const before = serializeWorld(world);
        const read = readMonthFlows(world, budget(f.government));
        const settled = settleGovernmentMonth(
          world,
          f.government,
          month,
          read.flows,
        ).government;
        expect(settled.months).toHaveLength(1);
        expect(settled.months[0]!.revenue).toEqual(BUDGET_SOURCES.map(() => 0));
        expect(settled.months[0]!.cashSettlement?.sourceRecordIds).toEqual([]);
        expect(settled.months[0]!.lawEffectStamps).toBeUndefined();
        expect(settled.months[0]).not.toHaveProperty("cannabisRevenue");
        expect(settled.months[0]).not.toHaveProperty("cannabisRevenueLoss");
        expect(serializeWorld(world)).toBe(before);
      }
    },
  );
  it.each(places)(
    "retains actual paid cash and reload/replay under the sourced starting law in $jurisdictionKey",
    ({ jurisdictionKey, answer }) => {
      const f = fixture(jurisdictionKey);
      const saved = account(
        f.world,
        publicOrganizationKey(f.jurisdiction.id),
        f.jurisdiction.id,
      );
      const payer = account(
        saved.world,
        "a17:recorded-cash:payer",
        f.jurisdiction.id,
      );
      let paid = createResourceFlow(payer.world, {
        stableKey: "a17:recorded-cash:flow",
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
          note: "Explicit existing paid-withholding fixture; not cannabis tax authority.",
        },
      });
      const flowId = paid.history.resourceFlows.at(-1)!.id;
      paid = recordResourceTransferOutcome(paid, {
        stableKey: "a17:recorded-cash:paid",
        resourceFlowId: flowId,
        periodStartsAt: date,
        periodEndsAt: date,
        occurredAt: date,
        attemptedAmount: money(125, "USD"),
        transferredAmount: money(125, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit saved cash fixture.",
        provenance: {
          kind: "authored",
          note: "Actual saved transfer outcome.",
        },
      });
      const outcomeId = paid.history.resourceTransferOutcomes.at(-1)!.id;
      {
        const world = withStartingLaw(paid, f.jurisdiction.id, answer);
        const before = serializeWorld(world);
        const read = readMonthFlows(world, budget(f.government));
        const settled = settleGovernmentMonth(
          world,
          f.government,
          month,
          read.flows,
        ).government;
        const row = settled.months.at(-1)!;
        expect(row.revenue).toEqual(
          BUDGET_SOURCES.map((source) =>
            source === "individualIncomeTax" ? 1.25 : 0,
          ),
        );
        expect(row.cashSettlement?.sourceRecordIds).toEqual([
          flowId,
          outcomeId,
        ]);
        expect(row).not.toHaveProperty("cannabisRevenue");
        expect(row).not.toHaveProperty("cannabisRevenueLoss");
        expect(serializeWorld(world)).toBe(before);
        const stored = {
          ...world,
          publicBudgets: { ...budget(settled), cursor: read.cursor },
        };
        const bytes = serializeWorld(stored);
        const loaded = deserializeWorld(bytes);
        const repeated = readMonthFlows(loaded, loaded.publicBudgets!);
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
          world.history.resourceTransferOutcomes,
        );
      }
    },
  );
});
