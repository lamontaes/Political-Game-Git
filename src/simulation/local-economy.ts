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
import { townJobRate } from "./living-world/town-pay";
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
import { nameCorpusVersionForWorld } from "./place-name-corpus";
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
 * the rest of this. One list of eight businesses for every town in the
 * country, with invented staff counts, revenue and owner pay, standing in
 * until the count by kind and town size, the size split and revenue bands are
 * answered. Replace it; do not tune it.
 *
 * A worker's pay is not part of that placeholder: it is the published wage
 * for the worker's occupation where the town is (BLS, May 2025), by
 * `localBusinessWageMinor`. `monthlyWageMinor` below is used only where no
 * published wage covers the town, and is marked as the placeholder it is.
 */
export const LOCAL_BUSINESS_PLACEHOLDER = {
  researchQuestionId: "businesses-owners-and-wealth",
  currency: "USD",
  /** PLACEHOLDER: a worker's monthly pay where no published wage covers. */
  monthlyWageMinor: 280_000,
} as const;

/**
 * GAME ASSUMPTION: the percentile of the published wage distribution a
 * business's staff are paid at. Staff have been there for years, so the
 * middle of the distribution.
 */
export const LOCAL_BUSINESS_WAGE_PERCENTILE = 50;

const HOURS_PER_YEAR = 2_080;

/**
 * What one of a business's workers is paid a month in `jurisdictionId`: the
 * BLS Occupational Employment and Wage Statistics wage for the worker's
 * occupation in the town's area, never below the minimum wage. The marked
 * placeholder pay where no wage is published for that occupation and area.
 */
export function localBusinessWageMinor(
  kind: Pick<LocalBusinessKind, "workerOccupation">,
  jurisdictionId: EntityId | null,
): { readonly monthlyMinor: number; readonly sourced: boolean } {
  const rate = townJobRate(
    kind.workerOccupation,
    jurisdictionId,
    LOCAL_BUSINESS_WAGE_PERCENTILE,
  );
  return rate
    ? {
        monthlyMinor: Math.round((rate.hourlyMinor * HOURS_PER_YEAR) / 12),
        sourced: true,
      }
    : {
        monthlyMinor: LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor,
        sourced: false,
      };
}

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
 * Where the population is not held, each kind once with the marked
 * placeholder figures on the kind: unknown is not none.
 */
export function localBusinessPlansFor(
  jurisdictionId: EntityId,
): readonly LocalBusinessPlan[] {
  const supply = localBusinessSupplyFor(jurisdictionId);
  if (!supply)
    return LOCAL_BUSINESS_KINDS.map((kind) => ({
      kind,
      index: 0,
      workers: kind.workers,
      monthlyRevenueMinor: kind.monthlyRevenueMinor,
      expected: null,
      sourced: false,
    }));
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

const FULL_TIME: Omit<TimeDemandProfile, "locationJurisdictionId"> = {
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
  // A town is seated once, whole. Businesses already there (a save from
  // before the list followed the town's counts) are kept as they are.
  if (seatedBusinessKeys(world, jurisdictionId).size > 0) return world;
  const missing = localBusinessPlansFor(jurisdictionId);
  const today = world.currentDate;
  const currency = money(0, LOCAL_BUSINESS_PLACEHOLDER.currency).currency;
  const rng = new SeededRng(world.seed).fork(
    `local-businesses:${jurisdictionId}`,
  );
  const provenanceFor = (planned: LocalBusinessPlan) => ({
    kind: "authored" as const,
    note: planned.sourced
      ? `Local business from published counts: the town's share of the county's establishments (about ${planned.expected!.toFixed(1)} of this kind in town; County Business Patterns 2023), staff from employees per establishment and sales from Economic Census 2022 sales per employee. At most ${LOCAL_BUSINESS_MAX_PER_KIND} of a kind and ${LOCAL_BUSINESS_MAX_STAFF} staff are seated (game assumption, for speed). The owner's draw is a placeholder pending research question ${LOCAL_BUSINESS_PLACEHOLDER.researchQuestionId}.`
      : `Placeholder local business pending research question ${LOCAL_BUSINESS_PLACEHOLDER.researchQuestionId}.`,
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
    const draw = (role: string, minAge: number, maxAge: number) => {
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
    const workers = Array.from({ length: planned.workers }, (_, index) => {
      const input = draw(`worker:${index + 1}`, 18, 60);
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
    flows.push({
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
          localBusinessWageMinor(plan.kind, jurisdictionId).monthlyMinor,
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
function dueOutcomes(
  world: World,
  flow: ResourceFlow,
  latest: IsoDate | null,
): RecordResourceTransferOutcomeInput[] {
  const due: RecordResourceTransferOutcomeInput[] = [];
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
      status: "completed",
      attemptedAmount: terms.amount,
      transferredAmount: terms.amount,
      reasonKind: null,
      note: null,
      provenance: flow.provenance,
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
      revenue: flow.basisKind === BUSINESS_REVENUE_BASIS,
    })),
  );
  due.sort(
    (a, b) =>
      a.input.periodStartsAt.localeCompare(b.input.periodStartsAt) ||
      Number(b.revenue) - Number(a.revenue),
  );
  return recordResourceTransferOutcomes(
    world,
    due.map((entry) => entry.input),
  );
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
