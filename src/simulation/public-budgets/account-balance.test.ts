import { describe, expect, it } from "vitest";
import { daysBetween, makeIsoDate } from "../dates";
import { createWorld, advanceWorld } from "../world";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import { createOrganization } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { resourcePositionAt } from "../resource-queries";
import { publicOrganizationKey } from "../tax-policy";
import { serializeWorld, deserializeWorld } from "../serialization";
import { withOpenedBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import { PUBLIC_BUDGETS_VERSION, type PublicBudgetStore } from "./store";

const date = makeIsoDate("2026-03-01");
const month = makeIsoDate("2026-02-01");

describe("M5 saved government cash replaces a separate budget stock", () => {
  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "records one migration and conserves actual account cash through Save/Continue in %s",
    (stateKey) => {
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      let world = createWorld({
        seed: `m5-balance:${stateKey}`,
        currentDate: date,
        jurisdictions: [NATIONAL_ELECTION_JURISDICTION, jurisdiction],
        people: [],
        lineage: "production",
      });
      world = createOrganization(world, {
        stableKey: publicOrganizationKey(jurisdiction.id),
        formedAt: date,
        provenance: {
          kind: "authored",
          note: "Existing public account fixture.",
        },
        initialProfile: {
          name: `${stateKey} public account`,
          classification: "sector:government",
          locationJurisdictionId: jurisdiction.id,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      world = createResourcePosition(world, {
        stableKey: "m5:actual-cash",
        owner: { kind: "organization", organizationId },
        openedAt: date,
        openingBalance: money(100000, "USD"),
        provenance: {
          kind: "authored",
          note: "Explicit fixture opening, no forecast receipts or expenses.",
        },
      });
      const empty: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      const store = withOpenedBudgets(world, empty, month);
      const government = store.governments.find((row) => row.key === stateKey)!;
      expect(government).toBeDefined();
      const before = serializeWorld(world);
      const read = readMonthFlows(world, store);
      const settled = settleGovernmentMonth(
        world,
        government,
        month,
        read.flows,
      ).government;
      expect(serializeWorld(world)).toBe(before);
      expect(settled.balance + settled.reserve).toBe(1000);
      expect(settled.publicAccountMigration).toMatchObject({
        organizationId,
        positionId: world.history.resourcePositions.at(-1)!.id,
        previousBudgetBalance: government.balance,
        previousBudgetReserve: government.reserve,
        accountBalanceMinorUnits: 100000,
      });
      // Only cash stock changes here: existing revenue/spending forecasts survive.
      const legacy = settleGovernmentMonth(world, government, month, {
        ...read.flows,
        cash: undefined,
      }).government;
      expect(settled.months.at(-1)!.revenue).toEqual(
        legacy.months.at(-1)!.revenue,
      );
      expect(settled.months.at(-1)!.spending).toEqual(
        legacy.months.at(-1)!.spending,
      );
      const migration = settled.publicAccountMigration;
      world = deserializeWorld(
        serializeWorld({
          ...world,
          publicBudgets: {
            ...store,
            governments: [settled],
            cursor: read.cursor,
          },
        }),
      );
      world = advanceWorld(world, 1);
      world = createOrganization(world, {
        stableKey: "m5:payer",
        formedAt: world.currentDate,
        provenance: { kind: "authored", note: "Explicit fixture payer." },
        initialProfile: {
          name: "Fixture payer",
          classification: "sector:government",
          locationJurisdictionId: jurisdiction.id,
        },
      });
      const payer = world.history.organizations.at(-1)!.id;
      world = createResourceFlow(world, {
        stableKey: "m5:receipt",
        source: { kind: "organization", organizationId: payer },
        recipient: { kind: "organization", organizationId },
        startsAt: world.currentDate,
        amount: money(125, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:tax-withholding",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: jurisdiction.id,
        provenance: {
          kind: "authored",
          note: "Explicit actual receipt fixture.",
        },
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: "m5:receipt:paid",
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        attemptedAmount: money(125, "USD"),
        transferredAmount: money(125, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit actual received cash.",
        provenance: { kind: "authored", note: "Fixture receipt." },
      });
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, makeIsoDate("2026-04-01")),
      );
      const nextFlows = readMonthFlows(world, world.publicBudgets!);
      const next = settleGovernmentMonth(
        world,
        world.publicBudgets!.governments[0]!,
        makeIsoDate("2026-03-01"),
        nextFlows.flows,
      ).government;
      const cash = resourcePositionAt(
        world,
        { kind: "organization", organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      expect(next.balance + next.reserve).toBe(cash / 100);
      expect(cash).toBe(100125);
      expect(next.publicAccountMigration).toEqual(migration);
      expect(next.months.at(-1)!.balance + next.months.at(-1)!.reserve).toBe(
        cash / 100,
      );
    },
  );
});
