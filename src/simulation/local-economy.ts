import {
  LOCAL_BUSINESS_PLACEHOLDER,
  localBusinessWageMinor,
} from "./recorded-employer";
export {
  LOCAL_BUSINESS_PLACEHOLDER,
  localBusinessWageMinor,
} from "./recorded-employer";
// Preserve the published opening API while the sole selector lives with town businesses.
export { recordedTownEmployer as adultStartEmployer } from "./living-world/town-businesses";
import {
  inventedPersonAge,
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "./invented-person-age";
import { makeIsoDate } from "./dates";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
  type CharacterHistoryContextPersonInput,
} from "./character-history";
import {
  createOrganization,
  createWorkRelationships,
  type CreateWorkRelationshipInput,
} from "./life";
import { lifePlaceByJurisdictionId } from "./life-places";
import { localBusinessSupplyFor } from "./local-business-counts";
import {
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  drawCanonicalNameForGender,
} from "./people";
import { generatePersonIdentity } from "./person-identity";
import {
  createResourceFlows,
  money,
  type CreateResourceFlowInput,
  recordResourceTransferOutcomes,
  type RecordResourceTransferOutcomeInput,
} from "./resources";
import { resourceFlowTermsAt, sameEndpoint } from "./resource-queries";
import { paymentFromDatedCash } from "./resource-payments";
import { nameCorpusVersionForWorld } from "./place-name-corpus";
import { SeededRng } from "./rng";
import { writeWithWorldIntegrityOnce } from "./world";
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
 * Background businesses use published CBP establishment/staff rates and
 * Economic Census receipts per employee, scaled to the locality population.
 * These are explicit estimates, not recorded customer sales. Actual payment
 * requires dated cash; a missing operating-cost/net-earnings record leaves
 * new owner draws unestablished. Existing saved draw contracts remain intact.
 * Worker pay comes from the existing local BLS occupation wage reader.
 */
export interface LocalBusinessKind {
  readonly key: string;
  readonly name: (familyName: string) => string;
  readonly classification: OrganizationClassification;
  readonly ownerTitle: string;
  readonly workerTitle: string;
  readonly workerOccupation: OccupationClassification;
  readonly workers: number;
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
  },
  {
    key: "hardware",
    name: (family) => `${family} Hardware`,
    classification: "enterprise:retail",
    ownerTitle: "Owner",
    workerTitle: "Sales clerk",
    workerOccupation: "occupation:retail-sales",
    workers: 2,
  },
  {
    key: "diner",
    name: (family) => `${family}'s Diner`,
    classification: "enterprise:food-service",
    ownerTitle: "Owner",
    workerTitle: "Server",
    workerOccupation: "service:food-server",
    workers: 3,
  },
  {
    key: "auto-repair",
    name: (family) => `${family} Auto Repair`,
    classification: "enterprise:repair",
    ownerTitle: "Owner and mechanic",
    workerTitle: "Mechanic",
    workerOccupation: "trade:automotive-mechanic",
    workers: 2,
  },
  {
    key: "law-office",
    name: (family) => `${family} Law Office`,
    classification: "enterprise:legal-services",
    ownerTitle: "Attorney",
    workerTitle: "Legal assistant",
    workerOccupation: "profession:legal-assistant",
    workers: 1,
  },
  {
    key: "accounting",
    name: (family) => `${family} Accounting`,
    classification: "enterprise:professional-services",
    ownerTitle: "Accountant",
    workerTitle: "Bookkeeper",
    workerOccupation: "profession:bookkeeper",
    workers: 1,
  },
  {
    key: "construction",
    name: (family) => `${family} Construction`,
    classification: "enterprise:construction",
    ownerTitle: "Owner and contractor",
    workerTitle: "Carpenter",
    workerOccupation: "trade:carpenter",
    workers: 4,
  },
  {
    key: "salon",
    name: (family) => `${family}'s Hair Salon`,
    classification: "enterprise:personal-services",
    ownerTitle: "Owner and stylist",
    workerTitle: "Stylist",
    workerOccupation: "service:hairstylist",
    workers: 2,
  },
];

/**
 * GAME ASSUMPTION: how much of a town's real business list the game seats as
 * individual organizations with named people. A city of 200,000 has hundreds
 * of restaurants; seating each would put tens of thousands of people in a new
 * life. The game seats at most this many of each kind and at most this many
 * staff in each, for the speed of a new life and a Day. The real counts stay
 * in the business's provenance note; nothing here is a claim about the town.
 */
export const LOCAL_BUSINESS_MAX_PER_KIND = 2;
export const LOCAL_BUSINESS_MAX_STAFF = 3;

/** One business the game seats in a town. */
export interface LocalBusinessPlan {
  readonly kind: LocalBusinessKind;
  /** 0 for the first of its kind in the town. */
  readonly index: number;
  readonly workers: number;
  readonly monthlyRevenueMinor: number;
  /** Establishments of this kind the town really has, before rounding. */
  readonly expected: number | null;
  /** Whether count, staff and revenue come from published data. */
  readonly sourced: boolean;
  readonly estimateBasis?: string;
}

/**
 * The businesses a town gets.
 *
 * Where the town's population is held, its share of the county's
 * establishments of each kind (County Business Patterns 2023), rounded to the
 * nearest whole business, at most `LOCAL_BUSINESS_MAX_PER_KIND` of a kind. A
 * kind whose share rounds to zero is not in town. Staff are the county's
 * employees per establishment, at most `LOCAL_BUSINESS_MAX_STAFF`, and
 * revenue is the state's Economic Census sales per employee times those
 * staff. GAME ASSUMPTION: a town whose every share rounds to zero still has
 * its likeliest kind once, because an adult in town needs an employer.
 *
 * Where the population is not held, no new plan is established. This refuses
 * an unsupported opening estimate; it does not assert that the town has none.
 */
export function localBusinessPlansFor(
  jurisdictionId: EntityId,
): readonly LocalBusinessPlan[] {
  const supply = localBusinessSupplyFor(jurisdictionId);
  // Missing source coverage cannot establish businesses or their revenue.
  // Existing saved organizations and contracts remain available to readers.
  if (!supply) return [];
  const plans: LocalBusinessPlan[] = [];
  const build = (
    kind: LocalBusinessKind,
    row: (typeof supply)[number],
    count: number,
  ) => {
    const workers = Math.min(
      LOCAL_BUSINESS_MAX_STAFF,
      Math.max(1, Math.round(row.staffPerBusiness)),
    );
    for (let index = 0; index < count; index += 1)
      plans.push({
        kind,
        index,
        workers,
        monthlyRevenueMinor: Math.round(
          (workers * row.salesPerEmployeeDollars * 100) / 12,
        ),
        expected: row.expected,
        sourced: true,
        estimateBasis: row.estimateBasis,
      });
  };
  for (const kind of LOCAL_BUSINESS_KINDS) {
    const row = supply.find((entry) => entry.kind === kind.key);
    if (!row) continue;
    build(
      kind,
      row,
      Math.min(LOCAL_BUSINESS_MAX_PER_KIND, Math.round(row.expected)),
    );
  }
  if (plans.length === 0) {
    const likeliest = [...supply].sort((a, b) => b.expected - a.expected)[0]!;
    const kind = LOCAL_BUSINESS_KINDS.find(
      (entry) => entry.key === likeliest.kind,
    )!;
    build(kind, likeliest, 1);
  }
  return plans;
}

export const BUSINESS_REVENUE_BASIS = "custom:business-revenue" as const;
export const BUSINESS_WAGES_BASIS = "compensation:wages" as const;
export const OWNER_DRAW_BASIS = "compensation:owner-draw" as const;
export const BUSINESS_OWNER_WORK_KIND = "independent:business-owner" as const;
export const BUSINESS_WORKER_WORK_KIND = "employment:local-business" as const;

const CATCH_UP_LIMIT_MONTHS = 240;

/** The hours and demands of a local business's full-time job. */
export const FULL_TIME: Omit<TimeDemandProfile, "locationJurisdictionId"> = {
  expectedWeekly: { minimumHours: 35, maximumHours: 45 },
  attention: "moderate",
  concurrency: "mostly-exclusive",
  scheduleRigidity: "rigid",
  interruptibility: "limited",
};

/** The first business of a kind keeps the key it has always had. */
function businessKey(
  jurisdictionId: EntityId,
  kind: LocalBusinessKind,
  index = 0,
) {
  const base = `local-business:${jurisdictionId}:${kind.key}`;
  return index === 0 ? base : `${base}:${index + 1}`;
}

/**
 * The stable keys of the businesses already seated in a town, in one pass.
 * This runs at every transition of a life, so it reads the organizations once
 * rather than once per kind.
 */
function seatedBusinessKeys(
  world: World,
  jurisdictionId: EntityId,
): ReadonlySet<string> {
  const prefix = `local-business:${jurisdictionId}:`;
  const keys = new Set<string>();
  for (const record of world.history.organizations)
    if (record.stableKey.startsWith(prefix)) keys.add(record.stableKey);
  return keys;
}

/** The businesses seated in a town, in catalog order and then in the order seated. */
export function localBusinessesIn(
  world: World,
  jurisdictionId: EntityId,
): readonly { organization: Organization; kind: LocalBusinessKind }[] {
  const prefix = `local-business:${jurisdictionId}:`;
  const found: {
    organization: Organization;
    kind: LocalBusinessKind;
    order: number;
    index: number;
  }[] = [];
  for (const record of world.history.organizations) {
    if (!record.stableKey.startsWith(prefix)) continue;
    const [kindKey, ordinal, ...extra] = record.stableKey
      .slice(prefix.length)
      .split(":");
    const order = LOCAL_BUSINESS_KINDS.findIndex(
      (kind) => kind.key === kindKey,
    );
    if (order < 0 || extra.length > 0) continue;
    found.push({
      organization: record,
      kind: LOCAL_BUSINESS_KINDS[order]!,
      order,
      index: ordinal === undefined ? 0 : Number(ordinal) - 1,
    });
  }
  return found
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ organization, kind }) => ({ organization, kind }));
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
  // Every owner, worker, business and job is its own checked write; the
  // town's seating is checked once, against the World it started from.
  return writeWithWorldIntegrityOnce(world, () =>
    seatMissingLocalBusinesses(world, jurisdictionId),
  );
}

function seatMissingLocalBusinesses(
  world: World,
  jurisdictionId: EntityId,
): World {
  if (!world.jurisdictions[jurisdictionId]) return world;
  // A town is seated once, whole. Businesses already there (a save from
  // before the list followed the town's counts) are kept as they are.
  if (seatedBusinessKeys(world, jurisdictionId).size > 0) return world;
  const missing = localBusinessPlansFor(jurisdictionId);
  if (missing.length === 0) return world;
  const today = world.currentDate;
  const currency = money(0, LOCAL_BUSINESS_PLACEHOLDER.currency).currency;
  const rng = new SeededRng(world.seed).fork(
    `local-businesses:${jurisdictionId}`,
  );
  const provenanceFor = (planned: LocalBusinessPlan) => ({
    kind: "authored" as const,
    note:
      `${planned.estimateBasis ?? "Recorded saved business plan."} Owner draw pending: this legacy organization has no recorded nonpay operating costs/net earnings; modeled revenue and staff wage commitments do not establish distributable profit. ` +
      (planned.sourced
        ? `Local business from published counts: the town's share of the county's establishments (about ${planned.expected!.toFixed(1)} of this kind in town; County Business Patterns 2023), staff from employees per establishment and sales from Economic Census 2022 sales per employee. At most ${LOCAL_BUSINESS_MAX_PER_KIND} of a kind and ${LOCAL_BUSINESS_MAX_STAFF} staff are seated (game assumption, for speed). The owner's draw is not established without recorded operating costs.`
        : `ESTIMATED local business pending research question ${LOCAL_BUSINESS_PLACEHOLDER.researchQuestionId}.`),
  });

  type Staffing = {
    planned: LocalBusinessPlan;
    kind: LocalBusinessKind;
    formedAt: IsoDate;
    owner: CharacterHistoryContextPersonInput;
    workers: { input: CharacterHistoryContextPersonInput; since: IsoDate }[];
  };
  const plans: Staffing[] = [];
  const corpusVersion = nameCorpusVersionForWorld(world, jurisdictionId);
  const people: CharacterHistoryContextPersonInput[] = [];
  const taken = new Set<string>();
  for (const planned of missing) {
    const { kind } = planned;
    const kindRng = rng.fork(
      planned.index === 0 ? kind.key : `${kind.key}:${planned.index + 1}`,
    );
    const draw = (role: string, ageRole: InventedPersonRole) => {
      const personRng = kindRng.fork(role);
      const identity = generatePersonIdentity(personRng.fork("identity"));
      let name = drawCanonicalNameForGender(
        personRng.fork("name"),
        identity.gender,
        corpusVersion,
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
          corpusVersion,
          DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        );
      if (role === "owner") taken.add(name.familyName);
      const input: CharacterHistoryContextPersonInput = {
        stableKey: `${businessKey(jurisdictionId, kind, planned.index)}:${role}`,
        ...name,
        identity,
        birthDate: inventedPersonBirthDate(personRng.fork("age"), {
          role: ageRole,
          referenceDate: today,
          age: inventedPersonAge(personRng, ageRole),
        }),
        homeJurisdictionId: jurisdictionId,
      };
      people.push(input);
      return input;
    };
    const owner = draw("owner", "business-owner");
    const ownerAdult = yearsBefore(owner.birthDate, -22);
    const formedAt = later(
      yearsBefore(today, kindRng.integer(1, 31)),
      ownerAdult,
    );
    const workers = Array.from({ length: planned.workers }, (_, index) => {
      const input = draw(`worker:${index + 1}`, "business-worker");
      const since = later(
        yearsBefore(today, kindRng.integer(0, 6)),
        later(formedAt, yearsBefore(input.birthDate, -16)),
      );
      return { input, since: since > today ? today : since };
    });
    plans.push({
      planned,
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

  const jobs: CreateWorkRelationshipInput[] = [];
  const flows: CreateResourceFlowInput[] = [];
  for (const plan of plans) {
    const key = businessKey(jurisdictionId, plan.kind, plan.planned.index);
    const provenance = provenanceFor(plan.planned);
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
    jobs.push({
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
    flows.push({
      stableKey: `${key}:revenue`,
      source: {
        kind: "organization",
        organizationId: customers.organizationId,
      },
      recipient: business,
      startsAt: today,
      amount: money(plan.planned.monthlyRevenueMinor, currency),
      cadenceKind: "schedule:monthly",
      basisKind: BUSINESS_REVENUE_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    // No new owner-draw obligation is invented from modeled sales. This
    // organization records payroll commitments but no nonpay operating costs
    // or distributable earnings. Existing saved draw flows remain settleable.
    plan.workers.forEach(({ input, since }, index) => {
      const workerId = personId(input);
      jobs.push({
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
      flows.push({
        stableKey: `${key}:worker:${index + 1}:wages`,
        source: business,
        recipient: { kind: "person", personId: workerId },
        startsAt: today,
        amount: money(
          localBusinessWageMinor(plan.kind, jurisdictionId, world).monthlyMinor,
          currency,
        ),
        cadenceKind: "schedule:monthly",
        basisKind: BUSINESS_WAGES_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId,
        provenance,
      });
    });
  }
  // One integrity check for each batch rather than one per record: a town
  // is about sixty records, and seating them one by one cost a new life a
  // fifth of a second.
  next = createWorkRelationships(next, jobs);
  return createResourceFlows(next, flows);
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

/** What one flow is owed for each first of the month since it last settled. */
type ScheduledBusinessPayment = Omit<
  RecordResourceTransferOutcomeInput,
  "status" | "transferredAmount" | "reasonKind"
>;

function dueOutcomes(
  world: World,
  flow: ResourceFlow,
  latest: IsoDate | null,
): ScheduledBusinessPayment[] {
  const due: ScheduledBusinessPayment[] = [];
  let dueOn = firstOfNextMonth(latest ?? flow.startsAt);
  for (
    let month = 0;
    month < CATCH_UP_LIMIT_MONTHS && dueOn <= world.currentDate;
    month += 1
  ) {
    const terms = resourceFlowTermsAt(world, flow.id, {
      asOfDate: dueOn,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (!terms || terms.status !== "active") break;
    due.push({
      stableKey: `${flow.stableKey}:${dueOn}`,
      resourceFlowId: flow.id,
      periodStartsAt: dueOn,
      periodEndsAt: dueOn,
      occurredAt: dueOn,
      attemptedAmount: terms.amount,
      note: null,
      provenance: terms.provenance,
    });
    dueOn = firstOfNextMonth(dueOn);
  }
  return due;
}

/** Whether the game keeps a balance for either end of this flow. */
function touchesTrackedMoney(world: World, flow: ResourceFlow): boolean {
  return world.history.resourcePositions.some(
    (position) =>
      sameEndpoint(position.owner, flow.source) ||
      sameEndpoint(position.owner, flow.recipient),
  );
}

/** The revenue, wage and owner's-draw flows of these businesses, in one pass. */
function businessFlowsOf(
  world: World,
  organizationIds: ReadonlySet<EntityId>,
): readonly ResourceFlow[] {
  if (organizationIds.size === 0) return [];
  return world.history.resourceFlows.filter(
    (flow) =>
      (flow.basisKind === BUSINESS_REVENUE_BASIS &&
        flow.recipient.kind === "organization" &&
        organizationIds.has(flow.recipient.organizationId)) ||
      ((flow.basisKind === BUSINESS_WAGES_BASIS ||
        flow.basisKind === OWNER_DRAW_BASIS) &&
        flow.source.kind === "organization" &&
        organizationIds.has(flow.source.organizationId)),
  );
}

function businessFlows(
  world: World,
  organizationId: EntityId,
): readonly ResourceFlow[] {
  return businessFlowsOf(world, new Set([organizationId]));
}

/**
 * Writes every due month at once, in date order with each month's revenue
 * ahead of its pay, so a month's pay is never recorded before its takings.
 * One integrity check for the whole batch.
 *
 * Only money the game keeps a balance for is settled. Nobody's savings are
 * known for a town's shopkeepers yet, and unknown is not zero, so a payment
 * between two untracked ends would change nothing anyone can read while
 * adding a record every month for every job in town, forever. The flows
 * themselves are the record of what each business takes in and pays; the
 * months settle from the day either end's money starts being tracked.
 */
function settleFlows(world: World, flows: readonly ResourceFlow[]): World {
  const tracked = flows.filter((flow) => touchesTrackedMoney(world, flow));
  if (tracked.length === 0) return world;
  const latest = new Map<EntityId, IsoDate>();
  const ids = new Set(tracked.map((flow) => flow.id));
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (!ids.has(outcome.resourceFlowId)) continue;
    const seen = latest.get(outcome.resourceFlowId);
    if (seen === undefined || outcome.periodStartsAt > seen)
      latest.set(outcome.resourceFlowId, outcome.periodStartsAt);
  }
  const due = tracked.flatMap((flow) =>
    dueOutcomes(world, flow, latest.get(flow.id) ?? null).map((input) => ({
      input,
      flow,
      revenue: flow.basisKind === BUSINESS_REVENUE_BASIS,
    })),
  );
  due.sort(
    (a, b) =>
      a.input.periodStartsAt.localeCompare(b.input.periodStartsAt) ||
      Number(b.revenue) - Number(a.revenue),
  );
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const { input, flow } of due) {
      const payment = paymentFromDatedCash(
        next,
        flow.source,
        input.attemptedAmount,
        makeIsoDate(input.occurredAt),
      );
      next = recordResourceTransferOutcomes(next, [
        {
          ...input,
          status: payment.status,
          transferredAmount: payment.transferredAmount,
          reasonKind: payment.reasonKind,
        },
      ]);
    }
    return next;
  });
}

/**
 * Every month of one business's money that has come due: revenue in, then
 * staff and owner paid. Idempotent, keyed by the first of each month.
 *
 * General on purpose: any organization whose revenue, wages or owner's draw
 * are written as these flows is settled by this, whatever kind of business it
 * is. The dated payer balance determines a completed, partial or missed
 * transfer; an untracked payer is blocked. Canonical town books separately
 * model operating sales, payroll capacity and closure, not cash receipts.
 */
export function settleBusinessMoney(
  world: World,
  organizationId: EntityId,
): World {
  return settleFlows(world, businessFlows(world, organizationId));
}

/** The same, for every business seated in a town, as one batch. */
export function settleLocalBusinesses(
  world: World,
  jurisdictionId: EntityId,
): World {
  // Nothing is settled until somebody's money is kept, and at the start of a
  // life nobody's in town is. Checking that first keeps the check that runs
  // at every transition from walking every flow in the world.
  if (world.history.resourcePositions.length === 0) return world;
  const prefix = `local-business:${jurisdictionId}:`;
  const ids = new Set<EntityId>();
  for (const record of world.history.organizations)
    if (record.stableKey.startsWith(prefix)) ids.add(record.id);
  return settleFlows(world, businessFlowsOf(world, ids));
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
