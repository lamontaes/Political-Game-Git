import { addDays } from "../../src/simulation/dates";
import { createScenarioWorld } from "../../src/simulation/demo";
import {
  declareProgramCapacity,
  programAppropriations,
  recordProgramAppropriation,
  type PublicProgramAlternative,
} from "../../src/simulation/governing/public-program";
import { createOrganization } from "../../src/simulation/life";
import { requireLifePlace } from "../../src/simulation/life-places";
import { municipalGovernmentForLifePlace } from "../../src/simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../../src/simulation/tax-policy";
import type { EntityId, World } from "../../src/simulation/types";

/**
 * CRUNCH46 G3 acceptance input. Every number here is an authored test
 * fixture, not a real budget and not a production default.
 */
export const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "CRUNCH46 G3 acceptance fixture; not a real budget.",
};
export const TRANSIT = "transit:bus-service";
export const PARKS = "parks:trail-upkeep";

export const DRAFT_A: PublicProgramAlternative = {
  key: "draft-a",
  title: "Three monthly operating payments",
  installments: [0, 30, 60].map((afterDays) => ({
    afterDays,
    amount: money(200_000_00, "USD"),
    purpose: "operating" as const,
  })),
  deliveryLeadDays: null,
};
export const DRAFT_B: PublicProgramAlternative = {
  key: "draft-b",
  title: "Bus maintenance",
  installments: [
    { afterDays: 0, amount: money(300_000_00, "USD"), purpose: "maintenance" },
  ],
  deliveryLeadDays: 90,
};
export const NO_ACTION: PublicProgramAlternative = {
  key: "no-action",
  title: "No action",
  installments: [],
  deliveryLeadDays: null,
};

/** A real city with a seated mayor and member, a funded public account and the G3 program. */
export function city(seed: string, cash: number) {
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

export function pay(
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

export const cash = (world: World, organizationId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "organization", organizationId },
    makeCurrencyCode("USD"),
  )!.liquidBalance.minorUnits;
