import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { createScenarioWorld } from "../demo";
import { requireLifePlace } from "../life-places";
import { createOrganization } from "../life";
import { municipalGovernmentForLifePlace } from "../municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../municipal-public-work";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { advanceWorld } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import type { EntityId, World } from "../types";
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

/**
 * CRUNCH46 G3 acceptance input. Every number here is an authored test
 * fixture, not a real budget and not a production default.
 */
const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "CRUNCH46 G3 acceptance fixture; not a real budget.",
};
const TRANSIT = "transit:bus-service";
const PARKS = "parks:trail-upkeep";

const DRAFT_A: PublicProgramAlternative = {
  key: "draft-a",
  title: "Three monthly operating payments",
  installments: [0, 30, 60].map((afterDays) => ({
    afterDays,
    amount: money(200_000_00, "USD"),
    purpose: "operating" as const,
  })),
  deliveryLeadDays: null,
};
const DRAFT_B: PublicProgramAlternative = {
  key: "draft-b",
  title: "Bus maintenance",
  installments: [
    { afterDays: 0, amount: money(300_000_00, "USD"), purpose: "maintenance" },
  ],
  deliveryLeadDays: 90,
};
const NO_ACTION: PublicProgramAlternative = {
  key: "no-action",
  title: "No action",
  installments: [],
  deliveryLeadDays: null,
};

function days(world: World, count: number): World {
  return advanceWorld(world, count, createCampaignElectionTransitionRegistry());
}

function city(seed: string, cash: number) {
  const place = requireLifePlace("3209700");
  const government = municipalGovernmentForLifePlace(place)!;
  const jurisdictionId = place.context.jurisdiction.id;
  let world = createScenarioWorld(seed, place.context, { peopleCount: 8 });
  const [mayor, member] = world.personOrder as [EntityId, EntityId];
  world = { ...world, control: { kind: "person", personId: mayor } };
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId: mayor,
    startedAt: world.currentDate,
    role: "mayor",
    seatLabel: "Authored test mayor",
  });
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId: member,
    startedAt: world.currentDate,
    role: "member",
    seatLabel: "Authored test member",
  });
  world = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
  // Fixture receipts: a labelled payer with an authored balance pays the
  // account once. The account itself never gets opening money.
  world = createOrganization(world, {
    stableKey: `${seed}:fixture-payer`,
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE.note },
    initialProfile: {
      name: "Fixture receipts payer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const payer = world.history.organizations.at(-1)!.id;
  world = createOrganization(world, {
    stableKey: `${seed}:transit-operator`,
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE.note },
    initialProfile: {
      name: "Fixture transit operator",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const operator = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: `${seed}:fixture-payer:USD`,
    owner: { kind: "organization", organizationId: payer },
    openedAt: world.currentDate,
    openingBalance: money(10_000_000_00, "USD"),
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  world = createResourcePosition(world, {
    stableKey: `${seed}:transit-operator:USD`,
    owner: { kind: "organization", organizationId: operator },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  world = pay(world, `${seed}:receipts`, payer, account.organizationId, cash);
  world = declareProgramCapacity(world, {
    edition: "g3",
    programKey: TRANSIT,
    jurisdictionId,
    serviceLabel: "City bus service",
    unitLabel: "buses",
    unitsTotal: 10,
    unitsOperational: 8,
    monthlyOperatingNeed: money(200_000_00, "USD"),
    completedPermille: 600,
    restorationCostPerUnit: money(150_000_00, "USD"),
    basis: FIXTURE,
  }).world;
  world = recordProgramAppropriation(world, {
    edition: "fy",
    programKey: TRANSIT,
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 364),
    basis: FIXTURE,
  }).world;
  return {
    world,
    mayor,
    member,
    operator,
    payer,
    account: account.organizationId,
    jurisdictionId,
    governmentKey: government.key,
    appropriationId: programAppropriations(world, TRANSIT)[0]!.id,
  };
}

function pay(
  world: World,
  stableKey: string,
  from: EntityId,
  to: EntityId,
  amount: number,
): World {
  let next = createResourceFlow(world, {
    stableKey,
    source: { kind: "organization", organizationId: from },
    recipient: { kind: "organization", organizationId: to },
    startsAt: world.currentDate,
    amount: money(amount, "USD"),
    cadenceKind: "custom:fixture",
    basisKind: "custom:fixture-transfer",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${stableKey}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: money(amount, "USD"),
    transferredAmount: money(amount, "USD"),
    status: "completed",
    reasonKind: null,
    note: FIXTURE.note,
    provenance: flow.provenance,
  });
  return next;
}

const cash = (world: World, organizationId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "organization", organizationId },
    makeCurrencyCode("USD"),
  )!.liquidBalance.minorUnits;

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
      personId: g.mayor,
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
      personId: g.mayor,
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
      personId: g.mayor,
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
      personId: g.mayor,
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
      personId: g.mayor,
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
    if (!asMember.ok) expect(asMember.reason).toMatch(/council seat/);
    expect(asMember.world).toBe(g.world);
    const asGovernor = commitPublicProgram(g.world, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.mayor,
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
      personId: g.mayor,
      office: { kind: "municipal", governmentKey: g.governmentKey },
      recipientOrganizationId: g.operator,
    });
    expect(unaffordable.ok).toBe(false);
    if (!unaffordable.ok) expect(unaffordable.reason).toMatch(/Not affordable/);
    const late = days(g.world, 400);
    const lapsed = commitPublicProgram(late, {
      appropriationId: g.appropriationId,
      alternative: DRAFT_A,
      personId: g.mayor,
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
      personId: g.mayor,
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
