import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { addDays } from "../simulation/dates";
import { createScenarioWorld } from "../simulation/demo";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  recordProgramAppropriation,
  type PublicProgramAlternative,
} from "../simulation/governing/public-program";
import { requireLifePlace } from "../simulation/life-places";
import { createOrganization } from "../simulation/life";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../simulation/resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../simulation/tax-policy";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { forbiddenPlayerPhrasesIn } from "./player-copy";
import { projectPublicServiceConditions } from "./public-service-conditions";

// Fixture copied from GOVERNING's G3 acceptance test (authored, not a budget).
/**
 * CRUNCH46 G3 acceptance input. Every number here is an authored test
 * fixture, not a real budget and not a production default.
 */
const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "CRUNCH46 G3 acceptance fixture; not a real budget.",
};
const TRANSIT = "transit:bus-service";

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
  const [manager, mayor, member] = world.personOrder as [
    EntityId,
    EntityId,
    EntityId,
  ];
  world = { ...world, control: { kind: "person", personId: mayor } };
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  // This city's compiled record is manager-led, so the officer who administers
  // the adopted budget is the appointed manager. Seating one is what lets the
  // fixture commit through GOVERNING's authority rule instead of around it;
  // committing as the mayor is refused, and refusing is correct.
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId: manager,
    startedAt: world.currentDate,
    role: "professional-manager",
    seatLabel: "Authored test manager",
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
    manager,
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

function commit(
  g: ReturnType<typeof city>,
  alternative: PublicProgramAlternative,
) {
  // The committing officer is the sitting APPLICABLE executive, which in this
  // city's compiled record is the appointed manager: it is manager-led, so the
  // manager administers the adopted budget and the mayor does not. Committing
  // as the mayor is refused, correctly — a mayor title alone is not universal
  // expenditure authority — so the fixture goes through that precondition
  // rather than around it. What CHANGE asserts below is unchanged.
  const committed = commitPublicProgram(g.world, {
    appropriationId: g.appropriationId,
    alternative,
    personId: g.manager,
    office: { kind: "municipal", governmentKey: g.governmentKey },
    recipientOrganizationId: alternative.installments.length
      ? g.operator
      : null,
  });
  if (!committed.ok)
    throw new Error(`fixture commitment refused: ${committed.reason}`);
  return committed.world;
}

describe("CHANGE public-service projection over GOVERNING program records", () => {
  it("reads the declared backlog and its recovery only after delivered work", () => {
    const g = city("change-service-b", 2_500_000_00);
    const start = projectPublicServiceConditions(g.world, g.jurisdictionId);
    expect(start).toHaveLength(1);
    const view = start[0]!;
    expect(view.serviceLabel).toBe("City bus service");
    expect(view.backlog).toEqual({ declared: 2, now: 2, change: "unchanged" });
    expect(view.completedPermille).toBe(600);
    expect(view.basisLabel).toBe("Illustrative figures");
    expect(view.funding.posted.minorUnits).toBe(0);

    let world = days(commit(g, DRAFT_B), 89);
    const waiting = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(waiting.capacity).toHaveLength(1);
    expect(waiting.backlog.now).toBe(2);
    expect(waiting.funding.posted.minorUnits).toBe(300_000_00);

    world = days(world, 1);
    const done = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(done.capacity.map((p) => [p.source, p.outOfService])).toEqual([
      ["declared", 2],
      ["after-delivered-work", 0],
    ]);
    expect(done.capacity[1]!.restoredUnits).toBe(2);
    expect(done.backlog).toEqual({ declared: 2, now: 0, change: "reduced" });
    // A completed-trips share is never projected from repaired buses.
    expect(done.completedPermille).toBe(600);
    expect(done.summary).toMatch(/^All 10 buses were in service as of /);
    expect(forbiddenPlayerPhrasesIn(done.summary)).toEqual([]);
  }, 180_000);

  it("no action leaves the backlog where it was and reports no money", () => {
    const g = city("change-service-none", 2_500_000_00);
    const world = days(commit(g, NO_ACTION), 60);
    const view = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(view.backlog.change).toBe("unchanged");
    expect(view.funding.committed.minorUnits).toBe(0);
    expect(view.failures).toEqual([]);
    expect(view.summary).toMatch(/^8 of 10 buses were in service as of /);
  }, 180_000);

  it("shows failed payments with their recorded reason and changes nothing", () => {
    const g = city("change-service-short", 700_000_00);
    let world = pay(
      commit(g, DRAFT_A),
      "change-service-short:other",
      g.account,
      g.payer,
      450_000_00,
    );
    world = days(world, 60);
    const before = JSON.stringify(world);
    const view = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(JSON.stringify(world)).toBe(before);
    expect(view.failures).toHaveLength(2);
    expect(view.failures[0]!.reason).toMatch(/not cash/);
    // Other places see none of this program.
    const elsewhere = Object.keys(world.jurisdictions).find(
      (id) => id !== g.jurisdictionId,
    );
    if (elsewhere)
      expect(
        projectPublicServiceConditions(world, elsewhere as EntityId),
      ).toEqual([]);
  }, 180_000);
});
