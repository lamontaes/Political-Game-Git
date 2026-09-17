import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import type { World } from "../types";
import {
  commitPublicProgram,
  declareProgramCapacity,
  forecastProgramAlternative,
  programAppropriations,
  programInstallments,
  programOutturns,
  programPosition,
  recordProgramAppropriation,
  type PublicProgramAlternative,
} from "./public-program";
import {
  DRAFT_A,
  DRAFT_B,
  FIXTURE,
  NO_ACTION,
  PARKS,
  TRANSIT,
  cash,
  city,
  pay,
} from "../../../tests/fixtures/public-program-fixture";

function days(world: World, count: number): World {
  return advanceWorld(world, count, createCampaignElectionTransitionRegistry());
}

describe("GOVERNING 6: public programs keep appropriation, commitment, cash and service apart", () => {
  it("forecasts the three alternatives from declared capacity without inventing a curve", () => {
    const g = city("g3-forecast", 2_500_000_00);
    const appropriation = programAppropriations(g.world, TRANSIT)[0]!;
    const a = forecastProgramAlternative(g.world, appropriation, DRAFT_A);
    const b = forecastProgramAlternative(g.world, appropriation, DRAFT_B);
    const none = forecastProgramAlternative(g.world, appropriation, NO_ACTION);
    expect(a.total.minorUnits).toBe(600_000_00);
    expect(a.operatingMonths).toBe("3.0");
    expect(a.uncommittedAfter.minorUnits).toBe(1_400_000_00);
    expect(b.unitsRestored).toBe(2);
    expect(b.readyOn).toBe(addDays(g.world.currentDate, 90));
    expect(none.total.minorUnits).toBe(0);
    for (const forecast of [a, b, none])
      expect(forecast.lines.join(" ")).toMatch(/not forecast/);
    expect(a.lines.join(" ")).not.toMatch(/improve/i);
  });

  it("draft A posts each monthly payment when due and leaves the service's share unforecast", () => {
    const g = city("g3-a", 2_500_000_00);
    const committed = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(committed.ok).toBe(true);
    let world = committed.world;
    expect(programInstallments(world, TRANSIT)).toHaveLength(1);
    expect(cash(world, g.operator)).toBe(200_000_00);
    expect(programPosition(world, TRANSIT).pendingInstallments).toBe(2);
    world = days(world, 29);
    expect(programInstallments(world, TRANSIT)).toHaveLength(1);
    world = days(world, 1);
    expect(programInstallments(world, TRANSIT)).toHaveLength(2);
    world = days(world, 30);
    const position = programPosition(world, TRANSIT);
    expect(position.posted.minorUnits).toBe(600_000_00);
    expect(position.committed.minorUnits).toBe(600_000_00);
    expect(position.uncommitted.minorUnits).toBe(1_400_000_00);
    expect(position.operatingMonthsPosted).toBe("3.0");
    expect(position.unitsOperational).toBe(8);
    expect(cash(world, g.account)).toBe(1_900_000_00);
    expect(cash(world, g.operator)).toBe(600_000_00);
    const work = world.history.workItems.find((w) =>
      w.title.includes(DRAFT_A.title),
    )!;
    expect(
      world.history.workItemStates
        .filter((s) => s.workItemId === work.id)
        .at(-1)!.status,
    ).toBe("completed");
    // The same decision cannot be taken twice.
    const again = commitPublicProgram(world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(again.ok).toBe(false);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(programPosition(reopened, TRANSIT)).toEqual(position);
  }, 120_000);

  it("draft B pays once and returns buses only after the delivery lead", () => {
    const g = city("g3-b", 2_500_000_00);
    const committed = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_B,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(committed.ok).toBe(true);
    let world = days(committed.world, 89);
    expect(programOutturns(world, TRANSIT)).toHaveLength(0);
    expect(programPosition(world, TRANSIT).unitsOperational).toBe(8);
    world = days(world, 1);
    const outturn = programOutturns(world, TRANSIT);
    expect(outturn).toHaveLength(1);
    expect(outturn[0]!.restoredUnits).toBe(2);
    expect(programPosition(world, TRANSIT).unitsOperational).toBe(10);
  }, 120_000);

  it("no action commits nothing and moves no money", () => {
    const g = city("g3-none", 2_500_000_00);
    const before = cash(g.world, g.account);
    const committed = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: NO_ACTION,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: null,
    });
    expect(committed.ok).toBe(true);
    const world = days(committed.world, 60);
    expect(cash(world, g.account)).toBe(before);
    expect(programPosition(world, TRANSIT).committed.minorUnits).toBe(0);
    expect(programInstallments(world, TRANSIT)).toHaveLength(0);
  }, 120_000);

  it("a payment fails truthfully when the account's cash changes", () => {
    const g = city("g3-short", 700_000_00);
    const committed = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(committed.ok).toBe(true);
    // Other spending drains the account before the second payment.
    let world = pay(
      committed.world,
      "g3-short:other",
      g.account,
      g.payer,
      450_000_00,
    );
    world = days(world, 60);
    const settled = programInstallments(world, TRANSIT);
    expect(settled.map((r) => r.status)).toEqual([
      "posted",
      "failed",
      "failed",
    ]);
    expect(settled[1]!.reason).toMatch(/not cash/);
    expect(cash(world, g.account)).toBe(50_000_00);
    expect(programPosition(world, TRANSIT).failedInstallments).toBe(2);
  }, 120_000);

  it("refuses the wrong office, an unaffordable draft and a lapsed appropriation", () => {
    const g = city("g3-refuse", 2_500_000_00);
    const asMember = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.member,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(asMember.ok).toBe(false);
    if (!asMember.ok) expect(asMember.reason).toMatch(/manager|council seat/i);
    expect(asMember.world).toBe(g.world);
    // This city's record shows an appointed manager: a mayor's title alone is
    // not authority to commit the adopted budget.
    const asMayor = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.mayor,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(asMayor.ok).toBe(false);
    if (!asMayor.ok) expect(asMayor.reason).toMatch(/manager/i);
    const asGovernor = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.manager,
      office: { kind: "state-executive" },
      recipientOrganizationId: g.operator,
    });
    expect(asGovernor.ok).toBe(false);
    const huge: PublicProgramAlternative = {
      key: "too-much",
      title: "Too much",
      installments: [
        {
          afterDays: 0,
          amount: money(2_000_000_01, "USD"),
          purpose: "operating",
        },
      ],
      deliveryLeadDays: null,
    };
    const unaffordable = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: huge,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(unaffordable.ok).toBe(false);
    if (!unaffordable.ok) expect(unaffordable.reason).toMatch(/Not affordable/);
    const late = days(g.world, 400);
    const lapsed = commitPublicProgram(late, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(lapsed.ok).toBe(false);
  }, 120_000);

  it("an unrelated program uses the same typed records without a transit story", () => {
    const g = city("g3-parks", 2_500_000_00);
    let world = declareProgramCapacity(g.world, {
      edition: "g3",
      programKey: PARKS,
      jurisdictionId: g.jurisdictionId,
      serviceLabel: "Trail upkeep",
      unitLabel: "trail miles",
      unitsTotal: 40,
      unitsOperational: 31,
      monthlyOperatingNeed: money(25_000_00, "USD"),
      completedPermille: null,
      restorationCostPerUnit: null,
      basis: FIXTURE,
    }).world;
    world = recordProgramAppropriation(world, {
      edition: "fy",
      programKey: PARKS,
      jurisdictionId: g.jurisdictionId,
      accountOrganizationId: g.account,
      amount: money(100_000_00, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 364),
      basis: FIXTURE,
    }).world;
    const parks = programAppropriations(world, PARKS)[0]!;
    const repair: PublicProgramAlternative = {
      key: "repair",
      title: "Trail repair",
      installments: [
        {
          afterDays: 0,
          amount: money(60_000_00, "USD"),
          purpose: "maintenance",
        },
      ],
      deliveryLeadDays: 45,
    };
    expect(
      forecastProgramAlternative(world, parks, repair).lines.join(" "),
    ).toMatch(/unknown/);
    const committed = commitPublicProgram(world, {
      appropriationId: parks.id,
      alternative: repair,
      personId: g.manager,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(committed.ok).toBe(true);
    world = days(committed.world, 45);
    const outturn = programOutturns(world, PARKS);
    expect(outturn).toHaveLength(1);
    expect(outturn[0]!.restoredUnits).toBeNull();
    expect(programPosition(world, PARKS).unitsOperational).toBe(31);
    // The transit appropriation is untouched.
    expect(programPosition(world, TRANSIT).committed.minorUnits).toBe(0);
  }, 120_000);
});
