import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { buildProductionWorld } from "../../presentation/production-world";
import { createOrganization } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { advanceWorld } from "../world";
import { addDays, makeIsoDate } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { resourcePositionAt } from "../resource-queries";
import {
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
} from "../nationwide-world/state-executives";
import { stateJurisdictionForKey } from "../life-places";
import {
  commitPublicProgram,
  recordProgramAppropriation,
} from "../governing/public-program";
import { withOpenedBudgets } from ".";
import {
  budgetProgramFor,
  readMonthFlows,
  settleGovernmentMonth,
} from "./month";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";
import type { EntityId, World } from "../types";

const BASIS = {
  kind: "authored-fixture" as const,
  note: "Controlled obligation classification: explicit one-dollar installments, not modeled pension or debt amounts.",
};

function organization(
  world: World,
  key: string,
  jurisdictionId: EntityId,
  openingCash: number,
) {
  let next = createOrganization(world, {
    stableKey: key,
    formedAt: world.currentDate,
    initialProfile: {
      name: key,
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
    provenance: { kind: "authored", note: BASIS.note },
  });
  const id = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: `${key}:cash`,
    owner: { kind: "organization", organizationId: id },
    openedAt: world.currentDate,
    openingBalance: money(openingCash, "USD"),
    provenance: { kind: "authored", note: BASIS.note },
  });
  return { world: next, id };
}

describe("canonical paid obligation classification", () => {
  it("preserves every saved canonical program category and existing descriptive aliases", () => {
    for (const key of BUDGET_PROGRAMS) {
      expect(budgetProgramFor(key)).toBe(key);
      expect(budgetProgramFor(key.toUpperCase())).toBe(key);
      expect(budgetProgramFor(`${key.toLowerCase()}:recorded-obligation`)).toBe(
        key,
      );
    }
    expect(budgetProgramFor("transit:bus-service")).toBe("transit");
    expect(budgetProgramFor("schools:teacher-pay")).toBe("schools");
    expect(budgetProgramFor("unregistered obligation")).toBe("otherPrograms");
  });

  it("classifies only actual pension and interest installments in a random opening", () => {
    const seed = "overflow4-a17-shared-obligation-20261002";
    const place = drawRandomPlace(seed);
    const opening = buildProductionWorld({
      seed,
      place,
      age: 34,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "lives-alone",
      depth: "summarize-earlier-life",
    });
    let world = opening.world;
    const playerPersonId = opening.playerPersonId;
    const books = withOpenedBudgets(
      world,
      {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      },
      world.currentDate,
    );
    const government = books.governments.find(
      (row) =>
        row.level === "state" && row.stateKey === place.stateJurisdictionKey,
    )!;
    expect(government, `${place.displayName} / ${seed}`).toBeDefined();
    const jurisdictionId = government.lawJurisdictionId;
    world = ensureStateExecutiveIncumbent(
      world,
      playerPersonId,
      government.stateKey.slice(3),
    );
    const governor = currentStateExecutiveHolders(world).find(
      (row) =>
        stateJurisdictionForKey(`US-${row.stateUsps}`)?.id === jurisdictionId,
    )!;
    expect(governor).toBeDefined();
    world = ensureTaxPublicAccount(world, jurisdictionId);
    const publicAccount = publicTaxAccountForJurisdiction(
      world,
      jurisdictionId,
    )!;
    const recipient = organization(
      world,
      `${seed}:obligation-recipient`,
      jurisdictionId,
      0,
    );
    world = recipient.world;
    // Authority and commitment alone must not become an expense.
    const beforeCash = resourcePositionAt(
      world,
      { kind: "organization", organizationId: publicAccount.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    expect(beforeCash).toBe(0);
    const cursor = {
      flows: world.history.resourceFlows.length,
      outcomes: world.history.resourceTransferOutcomes.length,
    };
    for (const category of ["pensionContribution", "interest"] as const) {
      const programKey = `${category.toLowerCase()}:controlled-obligation`;
      const adopted = recordProgramAppropriation(world, {
        programKey,
        jurisdictionId,
        accountOrganizationId: publicAccount.organizationId,
        amount: money(100, "USD"),
        availableFrom: world.currentDate,
        availableThrough: addDays(world.currentDate, 1),
        basis: BASIS,
        edition: seed,
      });
      const committed = commitPublicProgram(adopted.world, {
        appropriationId: adopted.id,
        personId: governor.personId,
        office: { kind: "state-executive" },
        recipientOrganizationId: recipient.id,
        alternative: {
          key: "one-recorded-installment",
          title: "Controlled obligation installment",
          installments: [
            { afterDays: 1, amount: money(100, "USD"), purpose: "operating" },
          ],
          deliveryLeadDays: null,
        },
      });
      expect(committed.ok).toBe(true);
      world = committed.world;
    }
    const readStore = { ...books, cursor };
    expect(
      readMonthFlows(world, readStore).flows.recorded?.get(government.key),
    ).toBeUndefined();
    const payer = organization(
      world,
      `${seed}:explicit-fixture-payer`,
      jurisdictionId,
      200,
    );
    world = payer.world;
    world = createResourceFlow(world, {
      stableKey: `${seed}:actual-receipt`,
      source: { kind: "organization", organizationId: payer.id },
      recipient: {
        kind: "organization",
        organizationId: publicAccount.organizationId,
      },
      startsAt: world.currentDate,
      amount: money(200, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "custom:fixture-payment",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance: { kind: "authored", note: BASIS.note },
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: `${seed}:actual-receipt-paid`,
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      attemptedAmount: money(200, "USD"),
      transferredAmount: money(200, "USD"),
      status: "completed",
      reasonKind: null,
      note: BASIS.note,
      provenance: { kind: "authored", note: BASIS.note },
    });
    world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
    const read = readMonthFlows(world, readStore);
    const paid = read.flows.recorded!.get(government.key)!;
    expect(
      paid.spendingMinorUnits[BUDGET_PROGRAMS.indexOf("pensionContribution")],
    ).toBe(100);
    expect(paid.spendingMinorUnits[BUDGET_PROGRAMS.indexOf("interest")]).toBe(
      100,
    );
    expect(
      paid.spendingMinorUnits[BUDGET_PROGRAMS.indexOf("otherPrograms")],
    ).toBe(0);
    expect(paid.spendingMinorUnits.reduce((a, b) => a + b, 0)).toBe(200);
    expect(read.flows.cash!.get(government.key)!.balanceMinorUnits).toBe(0);
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const settled = settleGovernmentMonth(world, government, month, read.flows);
    const row = settled.government.months.at(-1)!;
    expect(row.spending[BUDGET_PROGRAMS.indexOf("pensionContribution")]).toBe(
      1,
    );
    expect(row.spending[BUDGET_PROGRAMS.indexOf("interest")]).toBe(1);
    expect(row.spending.reduce((a, b) => a + b, 0)).toBe(2);
    expect(row.cashSettlement?.accountBalanceMinorUnits).toBe(0);
    expect(
      readMonthFlows(world, { ...readStore, cursor: read.cursor }).flows
        .recorded!.size,
    ).toBe(0);
    console.info(
      `A17 paid obligation opening: ${place.displayName}; seed=${seed}`,
    );
  });
});
