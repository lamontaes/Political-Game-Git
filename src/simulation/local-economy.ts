import { makeIsoDate } from "./dates";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
  type CharacterHistoryContextPersonInput,
} from "./character-history";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  drawCanonicalNameForGender,
} from "./people";
import { generatePersonIdentity } from "./person-identity";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { SeededRng } from "./rng";
import type {
  EntityId,
  IsoDate,
  Organization,
  OrganizationClassification,
  OccupationClassification,
  ResourceFlow,
  TimeDemandProfile,
  World,
} from "./types";

/**
 * The businesses of a town.
 *
 * Before this, every background job was a phrase ("a synthetic construction
 * firm") and no private business had an owner, staff or money. A town now has
 * its stores, a diner, a garage and a few offices, each a real organization
 * with a named owner and staff who work there, and each takes in revenue every
 * month and pays its staff and owner out of it through the same money records
 * pay and rent use.
 *
 * These jobs are background: see `playable-work.ts` for the few that are
 * played. The kinds, counts and every dollar figure are placeholders.
 */

/**
 * PLACEHOLDER(research: businesses-owners-and-wealth). Nobody has researched
 * any of this. One list of eight businesses for every town in the country,
 * with invented staff counts, revenue and owner pay, standing in until the
 * count by kind and town size, the size split and revenue bands are answered.
 * Replace it; do not tune it.
 */
export const LOCAL_BUSINESS_PLACEHOLDER = {
  researchQuestionId: "businesses-owners-and-wealth",
  currency: "USD",
  /** One worker's monthly pay, the same in every business. */
  monthlyWageMinor: 280_000,
} as const;

export interface LocalBusinessKind {
  readonly key: string;
  readonly name: (familyName: string) => string;
  readonly classification: OrganizationClassification;
  readonly ownerTitle: string;
  readonly workerTitle: string;
  readonly workerOccupation: OccupationClassification;
  readonly workers: number;
  readonly monthlyRevenueMinor: number;
  readonly monthlyOwnerDrawMinor: number;
}

export const LOCAL_BUSINESS_KINDS: readonly LocalBusinessKind[] = [
  {
    key: "grocery",
    name: (family) => `${family}'s Market`,
    classification: "enterprise:retail",
    ownerTitle: "Owner",
    workerTitle: "Cashier",
    workerOccupation: "occupation:cashier",
    workers: 3,
    monthlyRevenueMinor: 6_000_000,
    monthlyOwnerDrawMinor: 500_000,
  },
  {
    key: "hardware",
    name: (family) => `${family} Hardware`,
    classification: "enterprise:retail",
    ownerTitle: "Owner",
    workerTitle: "Sales clerk",
    workerOccupation: "occupation:retail-sales",
    workers: 2,
    monthlyRevenueMinor: 4_000_000,
    monthlyOwnerDrawMinor: 450_000,
  },
  {
    key: "diner",
    name: (family) => `${family}'s Diner`,
    classification: "enterprise:food-service",
    ownerTitle: "Owner",
    workerTitle: "Server",
    workerOccupation: "service:food-server",
    workers: 3,
    monthlyRevenueMinor: 3_500_000,
    monthlyOwnerDrawMinor: 350_000,
  },
  {
    key: "auto-repair",
    name: (family) => `${family} Auto Repair`,
    classification: "enterprise:repair",
    ownerTitle: "Owner and mechanic",
    workerTitle: "Mechanic",
    workerOccupation: "trade:automotive-mechanic",
    workers: 2,
    monthlyRevenueMinor: 3_000_000,
    monthlyOwnerDrawMinor: 500_000,
  },
  {
    key: "law-office",
    name: (family) => `${family} Law Office`,
    classification: "enterprise:legal-services",
    ownerTitle: "Attorney",
    workerTitle: "Legal assistant",
    workerOccupation: "profession:legal-assistant",
    workers: 1,
    monthlyRevenueMinor: 2_500_000,
    monthlyOwnerDrawMinor: 900_000,
  },
  {
    key: "accounting",
    name: (family) => `${family} Accounting`,
    classification: "enterprise:professional-services",
    ownerTitle: "Accountant",
    workerTitle: "Bookkeeper",
    workerOccupation: "profession:bookkeeper",
    workers: 1,
    monthlyRevenueMinor: 2_000_000,
    monthlyOwnerDrawMinor: 700_000,
  },
  {
    key: "construction",
    name: (family) => `${family} Construction`,
    classification: "enterprise:construction",
    ownerTitle: "Owner and contractor",
    workerTitle: "Carpenter",
    workerOccupation: "trade:carpenter",
    workers: 4,
    monthlyRevenueMinor: 8_000_000,
    monthlyOwnerDrawMinor: 800_000,
  },
  {
    key: "salon",
    name: (family) => `${family}'s Hair Salon`,
    classification: "enterprise:personal-services",
    ownerTitle: "Owner and stylist",
    workerTitle: "Stylist",
    workerOccupation: "service:hairstylist",
    workers: 2,
    monthlyRevenueMinor: 1_500_000,
    monthlyOwnerDrawMinor: 300_000,
  },
];

export const BUSINESS_REVENUE_BASIS = "custom:business-revenue" as const;
export const BUSINESS_WAGES_BASIS = "compensation:wages" as const;
export const OWNER_DRAW_BASIS = "compensation:owner-draw" as const;
export const BUSINESS_OWNER_WORK_KIND = "independent:business-owner" as const;
export const BUSINESS_WORKER_WORK_KIND = "employment:local-business" as const;

const CATCH_UP_LIMIT_MONTHS = 240;

const FULL_TIME: Omit<TimeDemandProfile, "locationJurisdictionId"> = {
  expectedWeekly: { minimumHours: 35, maximumHours: 45 },
  attention: "moderate",
  concurrency: "mostly-exclusive",
  scheduleRigidity: "rigid",
  interruptibility: "limited",
};

function businessKey(jurisdictionId: EntityId, kind: LocalBusinessKind) {
  return `local-business:${jurisdictionId}:${kind.key}`;
}

/** The businesses seated in a town, in catalog order. */
export function localBusinessesIn(
  world: World,
  jurisdictionId: EntityId,
): readonly { organization: Organization; kind: LocalBusinessKind }[] {
  const found: { organization: Organization; kind: LocalBusinessKind }[] = [];
  for (const kind of LOCAL_BUSINESS_KINDS) {
    const organization = world.history.organizations.find(
      (record) => record.stableKey === businessKey(jurisdictionId, kind),
    );
    if (organization) found.push({ organization, kind });
  }
  return found;
}

function birthDateFor(rng: SeededRng, today: IsoDate, age: number): IsoDate {
  const year = Number(today.slice(0, 4)) - age - 1;
  const month = rng.integer(1, 13);
  const day = rng.integer(1, 29);
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
}

function yearsBefore(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${Number(date.slice(0, 4)) - years}${date.slice(4, 7)}-01`,
  );
}

function later(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

function aggregateCustomers(
  world: World,
  jurisdictionId: EntityId,
): { world: World; organizationId: EntityId } {
  const stableKey = `local-customers:${jurisdictionId}`;
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate counterparty for what a town's customers spend at its businesses. The game has no individual shoppers and does not pretend to model them.",
    },
    initialProfile: {
      name: "Local customers",
      classification: "custom:aggregate-customers",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return { world: next, organizationId: next.history.organizations.at(-1)!.id };
}

/**
 * Seats the town's businesses, once. Each gets an owner and staff, who are new
 * townspeople: the town had five or so people in it, too few to staff even
 * one store, and nobody already living there is handed a job they never took.
 *
 * Idempotent by the town and the kind of business. Businesses predate the
 * game, but their money starts the day they are seated: nothing is paid for
 * time before the records existed.
 */
export function seatLocalBusinesses(
  world: World,
  jurisdictionId: EntityId,
): World {
  if (!world.jurisdictions[jurisdictionId]) return world;
  const missing = LOCAL_BUSINESS_KINDS.filter(
    (kind) =>
      !world.history.organizations.some(
        (record) => record.stableKey === businessKey(jurisdictionId, kind),
      ),
  );
  if (missing.length === 0) return world;
  const today = world.currentDate;
  const currency = money(0, LOCAL_BUSINESS_PLACEHOLDER.currency).currency;
  const rng = new SeededRng(world.seed).fork(
    `local-businesses:${jurisdictionId}`,
  );
  const provenance = {
    kind: "authored" as const,
    note: `Placeholder local business pending research question ${LOCAL_BUSINESS_PLACEHOLDER.researchQuestionId}.`,
  };

  type Staffing = {
    kind: LocalBusinessKind;
    formedAt: IsoDate;
    owner: CharacterHistoryContextPersonInput;
    workers: { input: CharacterHistoryContextPersonInput; since: IsoDate }[];
  };
  const plans: Staffing[] = [];
  const people: CharacterHistoryContextPersonInput[] = [];
  const taken = new Set<string>();
  for (const kind of missing) {
    const kindRng = rng.fork(kind.key);
    const draw = (role: string, minAge: number, maxAge: number) => {
      const personRng = kindRng.fork(role);
      const identity = generatePersonIdentity(personRng.fork("identity"));
      let name = drawCanonicalNameForGender(
        personRng.fork("name"),
        identity.gender,
        undefined,
        DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      );
      // Two businesses named for the same family reads as a chain; redraw.
      for (
        let attempt = 1;
        role === "owner" && attempt < 8 && taken.has(name.familyName);
        attempt += 1
      )
        name = drawCanonicalNameForGender(
          personRng.fork(`name:${attempt}`),
          identity.gender,
          undefined,
          DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        );
      if (role === "owner") taken.add(name.familyName);
      const input: CharacterHistoryContextPersonInput = {
        stableKey: `${businessKey(jurisdictionId, kind)}:${role}`,
        ...name,
        identity,
        birthDate: birthDateFor(
          personRng.fork("age"),
          today,
          personRng.integer(minAge, maxAge + 1),
        ),
        homeJurisdictionId: jurisdictionId,
      };
      people.push(input);
      return input;
    };
    const owner = draw("owner", 30, 64);
    const ownerAdult = yearsBefore(owner.birthDate, -22);
    const formedAt = later(
      yearsBefore(today, kindRng.integer(1, 31)),
      ownerAdult,
    );
    const workers = Array.from({ length: kind.workers }, (_, index) => {
      const input = draw(`worker:${index + 1}`, 18, 60);
      const since = later(
        yearsBefore(today, kindRng.integer(0, 6)),
        later(formedAt, yearsBefore(input.birthDate, -16)),
      );
      return { input, since: since > today ? today : since };
    });
    plans.push({
      kind,
      formedAt: formedAt > today ? today : formedAt,
      owner,
      workers,
    });
  }

  let next = createCharacterHistoryContextPeople(world, people);
  const customers = aggregateCustomers(next, jurisdictionId);
  next = customers.world;
  const personId = (input: CharacterHistoryContextPersonInput) =>
    characterHistoryContextPersonId(next, input.stableKey);

  for (const plan of plans) {
    const key = businessKey(jurisdictionId, plan.kind);
    next = createOrganization(next, {
      stableKey: key,
      formedAt: plan.formedAt,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: plan.kind.name(plan.owner.familyName),
        classification: plan.kind.classification,
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = next.history.organizations.at(-1)!.id;
    const business = { kind: "organization" as const, organizationId };
    const ownerId = personId(plan.owner);
    next = createWorkRelationship(next, {
      stableKey: `${key}:owner:work`,
      personId: ownerId,
      organizationId,
      startedAt: plan.formedAt,
      kind: BUSINESS_OWNER_WORK_KIND,
      compensation: "paid",
      authority: "directs-others",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance,
      initialRole: {
        title: plan.kind.ownerTitle,
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: { ...FULL_TIME, locationJurisdictionId: jurisdictionId },
      },
    });
    next = createResourceFlow(next, {
      stableKey: `${key}:revenue`,
      source: {
        kind: "organization",
        organizationId: customers.organizationId,
      },
      recipient: business,
      startsAt: today,
      amount: money(plan.kind.monthlyRevenueMinor, currency),
      cadenceKind: "schedule:monthly",
      basisKind: BUSINESS_REVENUE_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    next = createResourceFlow(next, {
      stableKey: `${key}:owner:draw`,
      source: business,
      recipient: { kind: "person", personId: ownerId },
      startsAt: today,
      amount: money(plan.kind.monthlyOwnerDrawMinor, currency),
      cadenceKind: "schedule:monthly",
      basisKind: OWNER_DRAW_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    plan.workers.forEach(({ input, since }, index) => {
      const workerId = personId(input);
      next = createWorkRelationship(next, {
        stableKey: `${key}:worker:${index + 1}:work`,
        personId: workerId,
        organizationId,
        startedAt: since,
        kind: BUSINESS_WORKER_WORK_KIND,
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: plan.kind.workerTitle,
          occupationClassification: plan.kind.workerOccupation,
          locationJurisdictionId: jurisdictionId,
          timeDemand: { ...FULL_TIME, locationJurisdictionId: jurisdictionId },
        },
      });
      next = createResourceFlow(next, {
        stableKey: `${key}:worker:${index + 1}:wages`,
        source: business,
        recipient: { kind: "person", personId: workerId },
        startsAt: today,
        amount: money(LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor, currency),
        cadenceKind: "schedule:monthly",
        basisKind: BUSINESS_WAGES_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId,
        provenance,
      });
    });
  }
  return next;
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function settleFlowMonthly(world: World, flow: ResourceFlow): World {
  let latest: IsoDate | null = null;
  for (const outcome of world.history.resourceTransferOutcomes)
    if (
      outcome.resourceFlowId === flow.id &&
      (latest === null || outcome.periodStartsAt > latest)
    )
      latest = outcome.periodStartsAt;
  let next = world;
  let dueOn = firstOfNextMonth(latest ?? flow.startsAt);
  for (
    let month = 0;
    month < CATCH_UP_LIMIT_MONTHS && dueOn <= next.currentDate;
    month += 1
  ) {
    const terms = resourceFlowTermsAt(next, flow.id, {
      asOfDate: dueOn,
      historySequenceExclusive: next.history.nextSequence,
    });
    if (!terms || terms.status !== "active") break;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${flow.stableKey}:${dueOn}`,
      resourceFlowId: flow.id,
      periodStartsAt: dueOn,
      periodEndsAt: dueOn,
      occurredAt: dueOn,
      status: "completed",
      attemptedAmount: terms.amount,
      transferredAmount: terms.amount,
      reasonKind: null,
      note: null,
      provenance: flow.provenance,
    });
    dueOn = firstOfNextMonth(dueOn);
  }
  return next;
}

/**
 * Every month of one business's money that has come due: revenue in, then
 * staff and owner paid. Idempotent, keyed by the first of each month.
 *
 * General on purpose: any organization whose revenue, wages or owner's draw
 * are written as these flows is settled by this, whatever kind of business it
 * is. Every payment completes. A business that cannot make payroll, closes
 * or is sold is part of the same research question and is not modeled yet.
 */
export function settleBusinessMoney(
  world: World,
  organizationId: EntityId,
): World {
  const flows = world.history.resourceFlows.filter(
    (flow) =>
      (flow.basisKind === BUSINESS_REVENUE_BASIS &&
        flow.recipient.kind === "organization" &&
        flow.recipient.organizationId === organizationId) ||
      ((flow.basisKind === BUSINESS_WAGES_BASIS ||
        flow.basisKind === OWNER_DRAW_BASIS) &&
        flow.source.kind === "organization" &&
        flow.source.organizationId === organizationId),
  );
  // Revenue first, so a month's pay is never recorded before its takings.
  flows.sort(
    (a, b) =>
      Number(b.basisKind === BUSINESS_REVENUE_BASIS) -
      Number(a.basisKind === BUSINESS_REVENUE_BASIS),
  );
  let next = world;
  for (const flow of flows) next = settleFlowMonthly(next, flow);
  return next;
}

/** The same, for every business seated in a town. */
export function settleLocalBusinesses(
  world: World,
  jurisdictionId: EntityId,
): World {
  let next = world;
  for (const { organization } of localBusinessesIn(world, jurisdictionId))
    next = settleBusinessMoney(next, organization.id);
  return next;
}

/** Seats and settles the businesses of the town this person lives in. */
export function refreshLocalEconomy(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) return world;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  if (!place) return world;
  const jurisdictionId = place.context.jurisdiction.id;
  return settleLocalBusinesses(
    seatLocalBusinesses(world, jurisdictionId),
    jurisdictionId,
  );
}
