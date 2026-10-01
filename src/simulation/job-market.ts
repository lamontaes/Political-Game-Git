import { settleTownCompensations } from "./living-world/town-pay";
import {
  addDays,
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "./dates";
import { createStableId } from "./ids";
import { createWorkRelationship, recordWorkStatus } from "./life";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  organizationClosingAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  workStatusAt,
} from "./life-queries";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { adultStartEmployer, localBusinessWageMinor } from "./local-economy";
import { governmentUnit } from "./government-units";
import { governmentUnitDisplayName } from "./nationwide-world/government-unit-names";
import {
  ensureHomeLocalGovernments,
  homeLocalGovernmentUnits,
  localGovernmentOrganizationKey,
} from "./nationwide-world/local-governments";
import {
  FEDERAL_MINIMUM_HOURLY_MINOR,
  minimumWageSettingAt,
} from "./minimum-wage";
import { payAtHire, UNCOVERED_PAY_NOTE } from "./fairness-pay-law";
import {
  resourceFlowTermsAt,
  resourceFlowTermsHistory,
} from "./resource-queries";
import { createWorkCompensation, money } from "./resources";
import { playerTown, townRoster } from "./living-world/town-residents";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type {
  JobApplicationRecord,
  JobApplicationRoute,
  JobApplicationStepKind,
  JobApplicationStepRecord,
  JobOpeningRecord,
  JobPayTerms,
} from "./job-market-types";
import type {
  EntityId,
  EntityKind,
  IsoDate,
  OccupationClassification,
  TimeDemandProfile,
  World,
  WorkRelationship,
} from "./types";

/**
 * The jobs a town offers, and how a person gets one.
 *
 * The owner's five Jobs answers (9/22), in the order the code meets them:
 *
 *   1. Employers are the town's own organizations: its businesses, and the
 *      public bodies the Census 2025 listing verifies. Nothing here invents an
 *      employer or names one; a public body keeps the name its seated
 *      organization was recorded under.
 *   2. A listing shows actual pay and hours. A national median is kept for
 *      optional detail by the screen, never beside the offer.
 *   3. Pay is quoted by the hour or as an annual salary.
 *   4. A person applies, or is put forward by someone they know who works
 *      there; either can be turned down, for a reason tied to the role.
 *   5. After a missed start the employer follows up once or withdraws.
 *
 * Every date a person might be held to (the recruitment window, the answer
 * date, the reply deadline, the start date) is drawn once, when its record is
 * written, and is never drawn again, so rereading or reloading cannot move it.
 *
 * What a role pays is read from what the employer already pays the people
 * doing that work. An employer with nobody on staff offers nothing, except a
 * public body, whose one role is the bounded game profile below.
 */

const PROVENANCE_NOTE =
  "Opening, answer and start timing are drawn from the placeholder calibration in job-market.ts; pay is read from the employer's own pay for the role.";

/**
 * Owner-approved ranges (9/22 13:18 UTC, "number three, correct"): an
 * opening takes applications for 7 to 28 days, and an offer waits 3 to 7 days
 * for an answer. Each is drawn once per record.
 */
export const JOB_TIMING = {
  recruitmentWindowDays: { minimum: 7, maximum: 28 },
  offerReplyDays: { minimum: 3, maximum: 7 },
} as const;

/**
 * PLACEHOLDER(research: job-market-calibration). Nobody has researched any
 * of these. They stand in until the question is answered; replace them, do
 * not tune them.
 */
export const JOB_MARKET_PLACEHOLDER = {
  researchQuestionId: "job-market-calibration",
  /**
   * How much more an employer offers when the last listing for the same work
   * closed with nobody hired.
   */
  offerSpread: 0.08,
  /**
   * Days between applying and hearing back: the short end when somebody who
   * works there put the applicant forward, the long end otherwise.
   */
  decisionDays: { minimum: 2, maximum: 7 },
  /**
   * Days from the reply deadline to the start date: the long end when the
   * applicant has a job to leave first.
   */
  startLeadDays: { minimum: 1, maximum: 7 },
  /** Days after a start date before the employer treats it as missed. */
  missedStartGraceDays: 2,
  /**
   * Days from a follow-up to the new start date: the long end when the
   * applicant has a job to leave first.
   */
  followUpStartDays: { minimum: 3, maximum: 7 },
  /** An existing job this many hours a week rules out a full-time second. */
  fullTimeHours: 30,
} as const;

/**
 * How often work comes open.
 *
 * MEASURED: total separations averaged 3.3% of jobs a month in 2024 and in
 * 2025 (Bureau of Labor Statistics, Job Openings and Labor Turnover Survey,
 * series JTU000000000000000TSR, annual averages). Work one person holds comes
 * open about once in 132 weeks, and work 10 people hold about once in 14.
 *
 * ESTIMATED FROM AVERAGE: a town government's staff. No source the game
 * reads gives one town's employees, so the town takes the national figure:
 * 6,789,100 local government employees outside schools in 2024 (Bureau of
 * Labor Statistics, Current Employment Statistics, CEU9093000001 less
 * CEU9093161101, annual averages) for 340,110,988 residents (Census Vintage
 * 2024), about 20 for every 1,000 residents.
 */
export const JOB_TURNOVER = {
  monthlySeparationRate: 0.033,
  localGovernmentStaffPerResident: 6_789_100 / 340_110_988,
  /**
   * PLACEHOLDER(research: job-market-calibration): a business this many days
   * old is still taking on its first staff, so it lists every role it has.
   */
  newEmployerDays: 91,
} as const;

/**
 * PLACEHOLDER(research: public-employer-roles-and-pay). One role for every
 * county, city and township government in the country, standing in until
 * ChatGPT says which jobs a public body posts and what it pays. The pay is
 * the published national median for general office clerks (BLS OEWS, May
 * 2025, $21.64 an hour), not this government's pay scale.
 */
export const PUBLIC_BODY_ROLE_PLACEHOLDER = {
  researchQuestionId: "public-employer-roles-and-pay",
  title: "Office clerk",
  occupationClassification: "occupation:office-clerk",
  hourlyMinor: 2164,
  weeklyHours: { minimumHours: 37, maximumHours: 40 },
} as const;

/**
 * The youngest applicant an employer takes: 16, the federal general minimum
 * for nonfarm work without hour limits.
 */
export const MINIMUM_APPLICANT_AGE = 16;

/**
 * The stable key of the job the first-job situation records. It was recorded
 * as paid with no pay; it is now paid weekly from the day it is taken, and a
 * saved one from the first settlement after this change, never for the weeks
 * already gone.
 */
export const LEGACY_FIRST_JOB_WORK_KEY = "formative-play:first-job:work";

export const JOB_MARKET_WORK_KIND = "employment:job-market" as const;
const PAY_KEY_PREFIX = "job-pay:";
const WEEK_DAYS = 7;
const CATCH_UP_LIMIT_WEEKS = 520;
const WEEK_EPOCH = makeIsoDate("2000-01-03");

export interface JobMarketResult {
  readonly world: World;
  readonly ok: boolean;
  readonly message: string;
}

/** One kind of work an employer takes people on for. */
export interface EmployerRole {
  readonly key: string;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly title: string;
  readonly occupationClassification: OccupationClassification | null;
  /** What the employer pays for this work over a year, full time. */
  readonly annualMinor: number;
  readonly currency: string;
  readonly weeklyHours: {
    readonly minimumHours: number;
    readonly maximumHours: number;
  };
  readonly salaried: boolean;
  readonly source: "staff-pay" | "public-body-profile";
  /** How many people do this work there now: counted, or estimated for a public body. */
  readonly holders: number;
  /** When the latest of them started, when the record says. */
  readonly lastHiredAt: IsoDate | null;
}

/* -------------------------------------------------------------------------- */
/* Employers                                                                  */
/* -------------------------------------------------------------------------- */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function annualFromTerms(minor: number, cadence: string): number | null {
  if (cadence === "schedule:monthly" || cadence === "work:monthly-salary")
    return minor * 12;
  if (cadence === "schedule:weekly") return minor * 52;
  return null;
}

function publicBodyOrganizations(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const units = homeLocalGovernmentUnits(world, personId);
  const ids: EntityId[] = [];
  for (const unit of [...units.municipal, ...units.counties]) {
    const key = localGovernmentOrganizationKey(unit);
    const organization = world.history.organizations.find(
      (record) => record.stableKey === key,
    );
    if (organization) ids.push(organization.id);
  }
  return ids;
}

/**
 * The work each of the town's employers takes people on for.
 *
 * A business's roles are the ones its staff hold today, at what it pays them
 * today. The earlier-life employers written into a character's childhood are
 * not listed: they are the same few names in every town, which is the list
 * the owner rejected.
 */
export function townEmployerRoles(
  world: World,
  personId: EntityId,
): readonly EmployerRole[] {
  const person = world.people[personId];
  if (!person) return [];
  const home = person.homeJurisdictionId;
  const roles: EmployerRole[] = [];
  for (const organizationId of publicBodyOrganizations(world, personId)) {
    const profile = organizationProfileAt(world, organizationId);
    if (!profile?.locationJurisdictionId) continue;
    const role = PUBLIC_BODY_ROLE_PLACEHOLDER;
    const town = playerTown(world, personId);
    roles.push({
      key: `${organizationId}:${slug(role.title)}`,
      organizationId,
      jurisdictionId: profile.locationJurisdictionId,
      title: role.title,
      occupationClassification: role.occupationClassification,
      annualMinor: Math.round(
        role.hourlyMinor *
          52 *
          ((role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2),
      ),
      currency: "USD",
      weeklyHours: role.weeklyHours,
      salaried: false,
      source: "public-body-profile",
      holders: town
        ? Math.max(
            1,
            Math.round(
              townRoster(town).population *
                JOB_TURNOVER.localGovernmentStaffPerResident,
            ),
          )
        : 1,
      lastHiredAt: null,
    });
  }

  const cutoff = currentLifeCutoff(world);
  const byOrganization = new Map<EntityId, WorkRelationship[]>();
  for (const work of world.history.workRelationships) {
    if (!work.organizationId || work.personId === personId) continue;
    if (!work.kind.startsWith("employment:")) continue;
    if (work.kind === JOB_MARKET_WORK_KIND) continue;
    const list = byOrganization.get(work.organizationId);
    if (list) list.push(work);
    else byOrganization.set(work.organizationId, [work]);
  }
  for (const organization of world.history.organizations) {
    if (organization.stableKey.startsWith("production:earlier-life:")) continue;
    const staff = byOrganization.get(organization.id);
    if (!staff) continue;
    const profile = organizationProfileAt(world, organization.id, cutoff);
    if (!profile || profile.locationJurisdictionId !== home) continue;
    if (!profile.classification.startsWith("enterprise:")) continue;
    const held = new Map<string, { holders: number; lastHiredAt: IsoDate }>();
    for (const work of staff) {
      if (workStatusAt(world, work.id, cutoff)?.status !== "active") continue;
      const role = activeRole(world, work);
      if (!role) continue;
      const entry = held.get(role.title);
      held.set(role.title, {
        holders: (entry?.holders ?? 0) + 1,
        lastHiredAt:
          entry && entry.lastHiredAt > work.startedAt
            ? entry.lastHiredAt
            : work.startedAt,
      });
    }
    const seen = new Set<string>();
    for (const work of staff) {
      if (workStatusAt(world, work.id, cutoff)?.status !== "active") continue;
      const role = activeRole(world, work);
      if (!role || seen.has(role.title)) continue;
      const pay = staffPay(world, work);
      if (!pay) continue;
      seen.add(role.title);
      const hours = role.timeDemand.expectedWeekly;
      roles.push({
        key: `${organization.id}:${slug(role.title)}`,
        organizationId: organization.id,
        jurisdictionId: home,
        title: role.title,
        occupationClassification: role.occupationClassification,
        annualMinor: pay.annualMinor,
        currency: pay.currency,
        weeklyHours: {
          minimumHours: hours.minimumHours,
          maximumHours: hours.maximumHours,
        },
        // PLACEHOLDER(research: job-market-calibration): which work is
        // salaried. A professional occupation is, and everything else is
        // paid by the hour.
        salaried: role.occupationClassification?.startsWith("profession:")
          ? true
          : false,
        source: "staff-pay",
        holders: held.get(role.title)!.holders,
        lastHiredAt: held.get(role.title)!.lastHiredAt,
      });
    }
  }
  return roles;
}

function activeRole(world: World, work: WorkRelationship) {
  const roles = world.history.workRoles.filter(
    (role) => role.workRelationshipId === work.id,
  );
  return roles.at(-1) ?? null;
}

function staffPay(
  world: World,
  work: WorkRelationship,
): { annualMinor: number; currency: string } | null {
  for (const flow of world.history.resourceFlows) {
    const toWorker =
      flow.recipient.kind === "person" &&
      flow.recipient.personId === work.personId;
    if (!toWorker) continue;
    const fromEmployer =
      (flow.source.kind === "organization" &&
        flow.source.organizationId === work.organizationId) ||
      (flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === work.id);
    if (!fromEmployer || !flow.basisKind.startsWith("compensation:")) continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    if (!terms || terms.status === "ended") continue;
    const annual = annualFromTerms(terms.amount.minorUnits, terms.cadenceKind);
    if (annual === null || annual <= 0) continue;
    return { annualMinor: annual, currency: terms.amount.currency };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Records                                                                    */
/* -------------------------------------------------------------------------- */

type Field = "jobOpenings" | "jobApplications" | "jobApplicationSteps";

function append<K extends Field>(
  world: World,
  field: K,
  kind: EntityKind,
  record: Omit<NonNullable<World["history"][K]>[number], "id" | "sequence">,
): World {
  const id = createStableId(kind, `${world.id}:${record.stableKey}`);
  const existing = world.history[field] ?? [];
  if (existing.some((row) => row.stableKey === record.stableKey)) return world;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      [field]: [
        ...existing,
        { ...record, id, sequence: world.history.nextSequence },
      ],
    },
  };
}

function weekIndex(date: IsoDate): number {
  return Math.floor(daysBetween(WEEK_EPOCH, date) / WEEK_DAYS);
}

const SPOKEN_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** A date as a sentence says it: "October 5, 2026". */
/** A date as a person says it: "February 8, 2026". */
export function spoken(date: IsoDate | null): string {
  return date ? SPOKEN_DATE.format(new Date(`${date}T00:00:00Z`)) : "";
}

/**
 * An employer's name as a listing says it. A county or city government keeps
 * the listing's own words in the order people say them ("Washoe County", not
 * the recorded "County of Washoe").
 */
export function employerDisplayName(
  world: World,
  organizationId: EntityId,
): string {
  const organization = world.history.organizations.find(
    (record) => record.id === organizationId,
  );
  const prefix = "local-government:";
  if (organization?.stableKey.startsWith(prefix)) {
    const unit = governmentUnit(organization.stableKey.slice(prefix.length));
    if (unit) return governmentUnitDisplayName(unit);
  }
  return organizationProfileAt(world, organizationId)?.name ?? "The employer";
}

function organizationName(world: World, organizationId: EntityId): string {
  return employerDisplayName(world, organizationId);
}

function note(
  world: World,
  input: {
    readonly key: string;
    readonly type: string;
    readonly occurredAt: IsoDate;
    readonly personId: EntityId;
    readonly involved: readonly EntityId[];
    readonly jurisdictionId: EntityId | null;
    readonly summary: string;
  },
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: `job-market:${input.key}:event`,
    type: `job-market.${input.type}`,
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [...new Set([input.personId, ...input.involved])],
    participants: [
      {
        personId: input.personId,
        role: "agency:participant",
        detail: input.summary,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["job-market"],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: input.summary,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

export function jobOpening(
  world: World,
  openingId: EntityId,
): JobOpeningRecord | null {
  return world.history.jobOpenings?.find((row) => row.id === openingId) ?? null;
}

export function applicationSteps(
  world: World,
  applicationId: EntityId,
): readonly JobApplicationStepRecord[] {
  return (world.history.jobApplicationSteps ?? []).filter(
    (row) => row.applicationId === applicationId,
  );
}

export function latestApplicationStep(
  world: World,
  applicationId: EntityId,
): JobApplicationStepRecord | null {
  return applicationSteps(world, applicationId).at(-1) ?? null;
}

/** An opening is filled only once somebody has actually started in it. */
export function openingFilled(world: World, openingId: EntityId): boolean {
  return (world.history.jobApplications ?? []).some(
    (application) =>
      application.openingId === openingId &&
      applicationSteps(world, application.id).some(
        (step) => step.kind === "started",
      ),
  );
}

export function openingTakesApplications(
  world: World,
  opening: JobOpeningRecord,
): boolean {
  return (
    opening.opensAt <= world.currentDate &&
    world.currentDate <= opening.closesAt &&
    !openingFilled(world, opening.id) &&
    !organizationClosingAt(world, opening.organizationId)
  );
}

/** The jurisdictions a person can find work in: their town and its county. */
export function jobSearchArea(
  world: World,
  personId: EntityId,
): ReadonlySet<EntityId> {
  const person = world.people[personId];
  const area = new Set<EntityId>();
  if (!person) return area;
  area.add(person.homeJurisdictionId);
  for (const organizationId of publicBodyOrganizations(world, personId)) {
    const location = organizationProfileAt(
      world,
      organizationId,
    )?.locationJurisdictionId;
    if (location) area.add(location);
  }
  return area;
}

/** Openings taking applications in the person's area, newest first. */
export function openJobListings(
  world: World,
  personId: EntityId,
): readonly JobOpeningRecord[] {
  const area = jobSearchArea(world, personId);
  return (world.history.jobOpenings ?? [])
    .filter(
      (opening) =>
        area.has(opening.jurisdictionId) &&
        openingTakesApplications(world, opening),
    )
    .reverse();
}

export function applicationsFor(
  world: World,
  personId: EntityId,
): readonly JobApplicationRecord[] {
  return (world.history.jobApplications ?? []).filter(
    (application) => application.personId === personId,
  );
}

/** The people this person knows: kin, household and anyone they have dealt with. */
function acquaintancesOf(world: World, personId: EntityId): Set<EntityId> {
  const known = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(world, personId)) {
    for (const id of kin.personIds) if (id !== personId) known.add(id);
  }
  const homes = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  for (const record of world.history.householdMemberships) {
    if (record.personId !== personId && homes.has(record.householdId))
      known.add(record.personId);
  }
  for (const interaction of world.history.relationshipInteractions) {
    const [a, b] = interaction.personIds;
    if (a === personId) known.add(b);
    else if (b === personId) known.add(a);
  }
  return known;
}

/**
 * Whether someone this person knows works for the organization now, and so
 * could vouch for them there.
 */
export function someoneKnownWorksAt(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
): boolean {
  for (const candidate of acquaintancesOf(world, personId)) {
    if (!world.people[candidate]) continue;
    if (
      activeWorkRelationshipsAt(world, candidate).some(
        (entry) => entry.relationship.organizationId === organizationId,
      )
    )
      return true;
  }
  return false;
}

/**
 * Who could put this person forward for an opening: someone they know who
 * works for that employer now, or owns it.
 */
export function introducersFor(
  world: World,
  personId: EntityId,
  openingId: EntityId,
): readonly EntityId[] {
  const opening = jobOpening(world, openingId);
  if (!opening) return [];
  const known = acquaintancesOf(world, personId);
  const found: EntityId[] = [];
  for (const candidate of known) {
    if (!world.people[candidate]) continue;
    const works = activeWorkRelationshipsAt(world, candidate).some(
      (entry) => entry.relationship.organizationId === opening.organizationId,
    );
    if (works) found.push(candidate);
  }
  return found.sort();
}

/* -------------------------------------------------------------------------- */
/* Openings                                                                   */
/* -------------------------------------------------------------------------- */

function roundTo(minor: number, step: number): number {
  return Math.max(step, Math.round(minor / step) * step);
}

function roleListings(
  world: World,
  role: EmployerRole,
): readonly JobOpeningRecord[] {
  return (world.history.jobOpenings ?? []).filter((opening) =>
    opening.stableKey.startsWith(`job-opening:${role.key}:`),
  );
}

/** Whether somebody doing this work there has left since `since`. */
function someoneLeft(
  world: World,
  role: EmployerRole,
  since: IsoDate | null,
): boolean {
  for (const work of world.history.workRelationships) {
    if (work.organizationId !== role.organizationId) continue;
    if (activeRole(world, work)?.title !== role.title) continue;
    const status = workStatusAt(world, work.id);
    if (status?.status !== "ended") continue;
    if (since === null || status.effectiveAt > since) return true;
  }
  return false;
}

/**
 * Whether the employer lists this work now. Nothing is drawn. It lists when
 * somebody doing the work has left since it last listed or hired, when the
 * business is new enough to be taking on its first staff, and otherwise as
 * often as work that many people hold comes open.
 */
function roleComesOpen(world: World, role: EmployerRole): boolean {
  const listings = roleListings(world, role);
  const lastListedAt = listings.reduce<IsoDate | null>(
    (latest, opening) =>
      latest === null || opening.opensAt > latest ? opening.opensAt : latest,
    null,
  );
  const since =
    lastListedAt === null ||
    (role.lastHiredAt !== null && role.lastHiredAt > lastListedAt)
      ? role.lastHiredAt
      : lastListedAt;
  if (since === null) return true;
  if (someoneLeft(world, role, since)) return true;
  const organization = world.history.organizations.find(
    (row) => row.id === role.organizationId,
  );
  if (
    listings.length === 0 &&
    organization &&
    daysBetween(organization.formedAt, world.currentDate) <
      JOB_TURNOVER.newEmployerDays
  )
    return true;
  const weeksApart = Math.ceil(
    52 / (12 * JOB_TURNOVER.monthlySeparationRate * Math.max(1, role.holders)),
  );
  return daysBetween(since, world.currentDate) >= weeksApart * WEEK_DAYS;
}

/**
 * What the employer offers: what it pays for the work now, and the hours the
 * people doing it work. It offers more when its last listing for the same
 * work closed with nobody hired.
 */
function offerTerms(
  world: World,
  role: EmployerRole,
  minimumHourlyMinor: number,
): {
  pay: JobPayTerms;
  weeklyHours: { minimumHours: number; maximumHours: number };
} {
  const last = [...roleListings(world, role)]
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
    .at(-1);
  const wentUnfilled =
    last !== undefined &&
    last.closesAt < world.currentDate &&
    !openingFilled(world, last.id);
  const spread = wentUnfilled ? 1 + JOB_MARKET_PLACEHOLDER.offerSpread : 1;
  const weeklyHours = role.weeklyHours;
  if (role.salaried) {
    return {
      pay: {
        basis: "annual-salary",
        amount: money(
          roundTo(role.annualMinor * spread, 50_000),
          role.currency,
        ),
      },
      weeklyHours,
    };
  }
  const fullTimeHours =
    (role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2;
  const hourly = Math.max(
    minimumHourlyMinor,
    roundTo((role.annualMinor / 52 / fullTimeHours) * spread, 5),
  );
  return {
    pay: { basis: "hourly", amount: money(hourly, role.currency) },
    weeklyHours,
  };
}

/**
 * Opens this week's listings in the person's area. Idempotent within a week:
 * whether a role lists is read from the record, and the stable key refuses a
 * second write.
 */
export function openWeeklyListings(world: World, personId: EntityId): World {
  const week = weekIndex(world.currentDate);
  let next = world;
  for (const role of townEmployerRoles(world, personId)) {
    const openForRole = roleListings(next, role).some((opening) =>
      openingTakesApplications(next, opening),
    );
    if (openForRole) continue;
    if (!roleComesOpen(next, role)) continue;
    const key = `job-opening:${role.key}:${week}`;
    const terms = offerTerms(
      next,
      role,
      minimumHourlyMinorFor(next, role.jurisdictionId, next.currentDate),
    );
    // PLACEHOLDER(research: job-market-calibration): salaried work is
    // advertised for the longest window, hourly work for half of it.
    const closesAt = addDays(
      next.currentDate,
      role.salaried
        ? JOB_TIMING.recruitmentWindowDays.maximum
        : Math.ceil(JOB_TIMING.recruitmentWindowDays.maximum / 2),
    );
    next = append(next, "jobOpenings", "job-opening", {
      stableKey: key,
      organizationId: role.organizationId,
      jurisdictionId: role.jurisdictionId,
      title: role.title,
      occupationClassification: role.occupationClassification,
      pay: terms.pay,
      weeklyHours: terms.weeklyHours,
      schedule: null,
      qualifications: null,
      earliestStartAt: null,
      opensAt: next.currentDate,
      closesAt,
      provenance: {
        kind: "authored",
        note:
          role.source === "public-body-profile"
            ? `${PROVENANCE_NOTE} The role and its pay are the placeholder public-body profile (research: ${PUBLIC_BODY_ROLE_PLACEHOLDER.researchQuestionId}).`
            : PROVENANCE_NOTE,
      },
    });
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Applying                                                                   */
/* -------------------------------------------------------------------------- */

function playerCanAct(world: World, personId: EntityId): string | null {
  if (!isPlayed(world, personId))
    return "Only the person being played can apply here.";
  return applicantCanAct(world, personId);
}

/**
 * Whether this is the played person, whose own records speak to them as
 * "you". Everybody else's are written about them by name.
 */
function isPlayed(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function applicantCanAct(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  if (!person) return "This person is not in the world.";
  if (!isPersonAliveAt(world, personId, currentLifeCutoff(world)))
    return "This person is no longer living.";
  if (ageOnDate(person.birthDate, world.currentDate) < MINIMUM_APPLICANT_AGE)
    return `Employers here take applicants who are ${MINIMUM_APPLICANT_AGE} or older.`;
  return null;
}

/**
 * The same job market, for somebody other than the person being played.
 *
 * A resident looking for work applies to an opening that is actually listed,
 * hears back from the employer on the day drawn for it, and answers and starts
 * through the same records the player's own application writes. Nothing is
 * created for them: no opening, no employer and no offer that the market did
 * not produce. The played person always applies for themselves.
 */
function residentCanAct(world: World, personId: EntityId): string | null {
  if (isPlayed(world, personId))
    return "The person being played applies for themselves.";
  return applicantCanAct(world, personId);
}

function residentName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? `${person.givenName} ${person.familyName}` : "They";
}

function openingBlocked(
  world: World,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  const opening = jobOpening(world, openingId);
  if (!opening || !openingTakesApplications(world, opening))
    return "This opening is no longer taking applications.";
  const played = isPlayed(world, personId);
  if (
    applicationsFor(world, personId).some(
      (application) => application.openingId === openingId,
    )
  )
    return played
      ? "You have already applied for this job."
      : "They have already applied for this job.";
  if (
    activeWorkRelationshipsAt(world, personId).some(
      (entry) => entry.relationship.organizationId === opening.organizationId,
    )
  )
    return played ? "You already work here." : "They already work here.";
  return null;
}

/** Why this person cannot apply for this opening now, or null if they can. */
export function applicationBlocked(
  world: World,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  return (
    playerCanAct(world, personId) ?? openingBlocked(world, personId, openingId)
  );
}

/** Why a resident cannot apply for this opening now, or null if they can. */
export function residentApplicationBlocked(
  world: World,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  return (
    residentCanAct(world, personId) ??
    openingBlocked(world, personId, openingId)
  );
}

/**
 * Apply for an opening, or be put forward for it by someone who works there.
 * The employer's answer comes on a day drawn now.
 */
export function applyForJob(
  world: World,
  personId: EntityId,
  openingId: EntityId,
  introducerPersonId: EntityId | null = null,
): JobMarketResult {
  const blocked = applicationBlocked(world, personId, openingId);
  if (blocked) return { world, ok: false, message: blocked };
  return submitApplication(world, personId, openingId, introducerPersonId);
}

/**
 * A resident applies for a listed opening, or is put forward for it by
 * somebody they know who works there. Refuses the played person.
 */
export function applyForJobAsResident(
  world: World,
  personId: EntityId,
  openingId: EntityId,
  introducerPersonId: EntityId | null = null,
): JobMarketResult {
  const blocked = residentApplicationBlocked(world, personId, openingId);
  if (blocked) return { world, ok: false, message: blocked };
  return submitApplication(world, personId, openingId, introducerPersonId);
}

function submitApplication(
  world: World,
  personId: EntityId,
  openingId: EntityId,
  introducerPersonId: EntityId | null,
): JobMarketResult {
  if (
    introducerPersonId !== null &&
    !introducersFor(world, personId, openingId).includes(introducerPersonId)
  )
    return {
      world,
      ok: false,
      message: "That person cannot put you forward for this job.",
    };
  const opening = jobOpening(world, openingId)!;
  const route: JobApplicationRoute = introducerPersonId
    ? "introduced"
    : "applied";
  const stableKey = `job-application:${opening.id}:${personId}`;
  const decisionAt = addDays(
    world.currentDate,
    route === "introduced"
      ? JOB_MARKET_PLACEHOLDER.decisionDays.minimum
      : JOB_MARKET_PLACEHOLDER.decisionDays.maximum,
  );
  const employer = organizationName(world, opening.organizationId);
  const introducer = introducerPersonId
    ? world.people[introducerPersonId]
    : null;
  const played = isPlayed(world, personId);
  const applicant = played ? "you" : residentName(world, personId);
  const summary = introducer
    ? `${introducer.givenName} ${introducer.familyName} put in a word for ${applicant} at ${employer} about the ${opening.title.toLowerCase()} opening.`
    : played
      ? `You applied to ${employer} for the ${opening.title.toLowerCase()} opening.`
      : `${applicant} applied to ${employer} for the ${opening.title.toLowerCase()} opening.`;
  const noted = note(world, {
    key: stableKey,
    type: route === "introduced" ? "introduced" : "applied",
    occurredAt: world.currentDate,
    personId,
    involved: [
      opening.organizationId,
      ...(introducerPersonId ? [introducerPersonId] : []),
    ],
    jurisdictionId: opening.jurisdictionId,
    summary,
  });
  const next = append(noted.world, "jobApplications", "job-application", {
    stableKey,
    openingId: opening.id,
    personId,
    route,
    introducerPersonId,
    submittedAt: world.currentDate,
    decisionAt,
  });
  return {
    world: next,
    ok: true,
    message: !played
      ? `${applicant} applied. ${employer} will be in touch.`
      : introducer
        ? `${introducer.givenName} will put in a word for you. ${employer} will be in touch.`
        : `Your application is in. ${employer} will be in touch.`,
  };
}

function addStep(
  world: World,
  application: JobApplicationRecord,
  step: {
    readonly kind: JobApplicationStepKind;
    readonly occurredAt: IsoDate;
    readonly reason?: string | null;
    readonly replyBy?: IsoDate | null;
    readonly startAt?: IsoDate | null;
    readonly agreedWeeklyHours?: number | null;
    readonly workRelationshipId?: EntityId | null;
    readonly summary: string;
  },
): World {
  const index = applicationSteps(world, application.id).length;
  const stableKey = `${application.stableKey}:step:${index}:${step.kind}`;
  const opening = jobOpening(world, application.openingId)!;
  const noted = note(world, {
    key: stableKey,
    type: step.kind,
    occurredAt: step.occurredAt,
    personId: application.personId,
    involved: [
      opening.organizationId,
      ...(step.workRelationshipId ? [step.workRelationshipId] : []),
    ],
    jurisdictionId: opening.jurisdictionId,
    summary: step.summary,
  });
  return append(noted.world, "jobApplicationSteps", "job-application-step", {
    stableKey,
    applicationId: application.id,
    kind: step.kind,
    occurredAt: step.occurredAt,
    reason: step.reason ?? null,
    replyBy: step.replyBy ?? null,
    startAt: step.startAt ?? null,
    agreedWeeklyHours: step.agreedWeeklyHours ?? null,
    workRelationshipId: step.workRelationshipId ?? null,
    eventId: noted.eventId,
  });
}

/** The offer an application is answering to, if it has one. */
export function applicationOffer(
  world: World,
  applicationId: EntityId,
): JobApplicationStepRecord | null {
  return (
    [...applicationSteps(world, applicationId)]
      .reverse()
      .find((step) => step.kind === "offered") ?? null
  );
}

/** The start date the person is now expected on, after any follow-up. */
export function expectedStart(
  world: World,
  applicationId: EntityId,
): IsoDate | null {
  const step = [...applicationSteps(world, applicationId)]
    .reverse()
    .find((row) => row.kind === "offered" || row.kind === "followed-up");
  return step?.startAt ?? null;
}

export function payPhrase(pay: JobPayTerms): string {
  const dollars = pay.amount.minorUnits / 100;
  if (pay.basis === "annual-salary")
    return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })} a year`;
  const amount = `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return pay.basis === "per-shift" ? `${amount} a shift` : `${amount} an hour`;
}

function holdsFullTimeWork(world: World, personId: EntityId): boolean {
  return activeWorkRelationshipsAt(world, personId).some(
    (entry) =>
      entry.relationship.kind.startsWith("employment:") &&
      entry.relationship.kind !== "employment:education" &&
      entry.role.timeDemand.expectedWeekly.minimumHours >=
        JOB_MARKET_PLACEHOLDER.fullTimeHours,
  );
}

/** Whether the person holds paid work now that they would have to leave. */
export function holdsWork(world: World, personId: EntityId): boolean {
  return activeWorkRelationshipsAt(world, personId).some(
    (entry) =>
      entry.relationship.kind.startsWith("employment:") &&
      entry.relationship.kind !== "employment:education",
  );
}

/**
 * Days the person has done this line of work, from their recorded jobs: the
 * same title, or the same occupation when the opening names one.
 */
function daysInLine(
  world: World,
  personId: EntityId,
  opening: JobOpeningRecord,
  on: IsoDate,
): number {
  let days = 0;
  for (const work of world.history.workRelationships) {
    if (work.personId !== personId || work.startedAt > on) continue;
    if (!work.kind.startsWith("employment:")) continue;
    const inLine = world.history.workRoles.some(
      (role) =>
        role.workRelationshipId === work.id &&
        (role.title === opening.title ||
          (opening.occupationClassification !== null &&
            role.occupationClassification ===
              opening.occupationClassification)),
    );
    if (!inLine) continue;
    const status = workStatusAt(world, work.id);
    const endedAt =
      status?.status === "ended" && status.effectiveAt < on
        ? status.effectiveAt
        : on;
    days += Math.max(0, daysBetween(work.startedAt, endedAt));
  }
  return days;
}

const OUT_OF_THE_RUNNING: ReadonlySet<JobApplicationStepKind> = new Set([
  "declined",
  "refused",
  "offer-lapsed",
  "withdrawn",
]);

/**
 * Whether `a` is better placed for the opening than `b`. HARDWIRED order:
 * more time in the same line of work first; between equals, the applicant
 * somebody who works there put forward; then whoever applied first.
 */
function betterPlaced(
  world: World,
  opening: JobOpeningRecord,
  on: IsoDate,
  a: JobApplicationRecord,
  b: JobApplicationRecord,
): boolean {
  const daysA = daysInLine(world, a.personId, opening, on);
  const daysB = daysInLine(world, b.personId, opening, on);
  if (daysA !== daysB) return daysA > daysB;
  if (a.route !== b.route) return a.route === "introduced";
  if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt;
  return a.personId < b.personId;
}

/** The other applications for the same opening, in by `on`. */
function rivalsFor(
  world: World,
  application: JobApplicationRecord,
  on: IsoDate,
): readonly JobApplicationRecord[] {
  return (world.history.jobApplications ?? []).filter(
    (other) =>
      other.openingId === application.openingId &&
      other.id !== application.id &&
      other.personId !== application.personId &&
      other.submittedAt <= on,
  );
}

function decide(world: World, application: JobApplicationRecord): World {
  const opening = jobOpening(world, application.openingId)!;
  const employer = organizationName(world, opening.organizationId);
  const on = application.decisionAt;
  const played = isPlayed(world, application.personId);
  const name = residentName(world, application.personId);
  if (
    opening.weeklyHours.minimumHours >= JOB_MARKET_PLACEHOLDER.fullTimeHours &&
    holdsFullTimeWork(world, application.personId)
  )
    return addStep(world, application, {
      kind: "declined",
      occurredAt: on,
      reason: played
        ? "They wanted someone free to work these hours, and you already hold a full-time job."
        : `They wanted someone free to work these hours, and ${name} already holds a full-time job.`,
      summary: played
        ? `${employer} turned down your application: they wanted someone free for full-time hours, and you already work full time.`
        : `${employer} turned down ${name}'s application: they wanted someone free for full-time hours.`,
    });
  const rivals = rivalsFor(world, application, on).filter((other) => {
    const latest = latestApplicationStep(world, other.id);
    return !latest || !OUT_OF_THE_RUNNING.has(latest.kind);
  });
  const chosen =
    rivals.find((other) => latestApplicationStep(world, other.id) !== null) ??
    rivals.find((other) =>
      betterPlaced(world, opening, on, other, application),
    );
  if (chosen)
    return addStep(world, application, {
      kind: "declined",
      occurredAt: on,
      reason: "They chose another applicant.",
      summary: played
        ? `${employer} chose another applicant for the ${opening.title.toLowerCase()} job.`
        : `${employer} chose another applicant over ${name} for the ${opening.title.toLowerCase()} job.`,
    });
  const leaving = holdsWork(world, application.personId);
  // PLACEHOLDER(research: job-market-calibration): salaried work gives the
  // long end of the reply window, hourly work the short end.
  const replyBy = addDays(
    on,
    opening.pay.basis === "annual-salary"
      ? JOB_TIMING.offerReplyDays.maximum
      : JOB_TIMING.offerReplyDays.minimum,
  );
  const leadStart = addDays(
    replyBy,
    leaving
      ? JOB_MARKET_PLACEHOLDER.startLeadDays.maximum
      : JOB_MARKET_PLACEHOLDER.startLeadDays.minimum,
  );
  const startAt =
    opening.earliestStartAt && opening.earliestStartAt > leadStart
      ? opening.earliestStartAt
      : leadStart;
  // Somebody keeping other work is offered the fewest hours the job has;
  // anyone else the most.
  const agreedWeeklyHours =
    opening.pay.basis === "hourly"
      ? leaving
        ? opening.weeklyHours.minimumHours
        : opening.weeklyHours.maximumHours
      : null;
  return addStep(world, application, {
    kind: "offered",
    occurredAt: on,
    replyBy,
    startAt,
    agreedWeeklyHours,
    summary: `${employer} offered ${played ? "you" : name} the ${opening.title.toLowerCase()} job at ${payPhrase(opening.pay)}${agreedWeeklyHours ? `, ${agreedWeeklyHours} hours a week` : ""}, starting ${spoken(startAt)}. They asked for an answer by ${spoken(replyBy)}.`,
  });
}

/** Accept or turn down an offer that is still waiting for an answer. */
export function answerJobOffer(
  world: World,
  applicationId: EntityId,
  accept: boolean,
): JobMarketResult {
  return answerOffer(world, applicationId, accept, playerCanAct);
}

/** A resident answers an offer still waiting for them. Refuses the played person. */
export function answerJobOfferAsResident(
  world: World,
  applicationId: EntityId,
  accept: boolean,
): JobMarketResult {
  return answerOffer(world, applicationId, accept, residentCanAct);
}

function answerOffer(
  world: World,
  applicationId: EntityId,
  accept: boolean,
  canAct: (world: World, personId: EntityId) => string | null,
): JobMarketResult {
  const application = (world.history.jobApplications ?? []).find(
    (row) => row.id === applicationId,
  );
  if (!application)
    return { world, ok: false, message: "There is no such application." };
  const refusal = canAct(world, application.personId);
  if (refusal) return { world, ok: false, message: refusal };
  const played = isPlayed(world, application.personId);
  const name = residentName(world, application.personId);
  const latest = latestApplicationStep(world, applicationId);
  if (latest?.kind !== "offered" || world.currentDate > latest.replyBy!)
    return {
      world,
      ok: false,
      message: "This offer is no longer waiting for an answer.",
    };
  const opening = jobOpening(world, application.openingId)!;
  const employer = organizationName(world, opening.organizationId);
  if (!accept)
    return {
      world: addStep(world, application, {
        kind: "refused",
        occurredAt: world.currentDate,
        summary: played
          ? `You turned down ${employer}'s offer.`
          : `${name} turned down ${employer}'s offer.`,
      }),
      ok: true,
      message: `You turned down the offer from ${employer}.`,
    };
  return {
    world: addStep(world, application, {
      kind: "accepted",
      occurredAt: world.currentDate,
      startAt: latest.startAt,
      summary: played
        ? `You accepted ${employer}'s offer. You start on ${spoken(latest.startAt)}.`
        : `${name} accepted ${employer}'s offer and starts on ${spoken(latest.startAt)}.`,
    }),
    ok: true,
    message: `Accepted. You start on ${spoken(latest.startAt)}.`,
  };
}

function timeDemandFor(
  opening: JobOpeningRecord,
  hours: number | null,
): TimeDemandProfile {
  return {
    expectedWeekly:
      hours === null
        ? {
            minimumHours: opening.weeklyHours.minimumHours,
            maximumHours: opening.weeklyHours.maximumHours,
          }
        : { minimumHours: hours, maximumHours: hours },
    attention: "moderate",
    concurrency: "mostly-exclusive",
    scheduleRigidity: "rigid",
    interruptibility: "limited",
    locationJurisdictionId: opening.jurisdictionId,
  };
}

/** Why the person cannot start this job today, or null if they can. */
export function startBlocked(
  world: World,
  applicationId: EntityId,
): string | null {
  return startRefusal(world, applicationId, playerCanAct);
}

function startRefusal(
  world: World,
  applicationId: EntityId,
  canAct: (world: World, personId: EntityId) => string | null,
): string | null {
  const application = (world.history.jobApplications ?? []).find(
    (row) => row.id === applicationId,
  );
  if (!application) return "There is no such application.";
  const refusal = canAct(world, application.personId);
  if (refusal) return refusal;
  const latest = latestApplicationStep(world, applicationId);
  if (latest?.kind !== "accepted" && latest?.kind !== "followed-up")
    return "There is no accepted offer to start.";
  const opening = jobOpening(world, application.openingId);
  if (opening && organizationClosingAt(world, opening.organizationId))
    return `${organizationName(world, opening.organizationId)} has closed.`;
  const startAt = expectedStart(world, applicationId)!;
  if (world.currentDate < startAt)
    return isPlayed(world, application.personId)
      ? `You start on ${spoken(startAt)}.`
      : `They start on ${spoken(startAt)}.`;
  return null;
}

/** Turn up on (or after) the start date and begin the job. */
export function startJob(
  world: World,
  applicationId: EntityId,
): JobMarketResult {
  const blocked = startBlocked(world, applicationId);
  if (blocked) return { world, ok: false, message: blocked };
  return beginWork(world, applicationId);
}

/** A resident turns up on (or after) their start date. Refuses the played person. */
export function startJobAsResident(
  world: World,
  applicationId: EntityId,
): JobMarketResult {
  const blocked = startRefusal(world, applicationId, residentCanAct);
  if (blocked) return { world, ok: false, message: blocked };
  return beginWork(world, applicationId);
}

function beginWork(world: World, applicationId: EntityId): JobMarketResult {
  const application = (world.history.jobApplications ?? []).find(
    (row) => row.id === applicationId,
  )!;
  const opening = jobOpening(world, application.openingId)!;
  const offer = applicationOffer(world, applicationId)!;
  const employer = organizationName(world, opening.organizationId);
  const provenance = { kind: "authored" as const, note: PROVENANCE_NOTE };
  let next = createWorkRelationship(world, {
    stableKey: `${application.stableKey}:work`,
    personId: application.personId,
    organizationId: opening.organizationId,
    startedAt: world.currentDate,
    initialStatus: "active",
    kind: JOB_MARKET_WORK_KIND,
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: opening.title,
      occupationClassification: opening.occupationClassification,
      locationJurisdictionId: opening.jurisdictionId,
      timeDemand: timeDemandFor(opening, offer.agreedWeeklyHours),
    },
  });
  const work = next.history.workRelationships.at(-1)!;
  next = leaveFirstJobFor(next, application.personId, opening.title);
  const hours = offer.agreedWeeklyHours ?? opening.weeklyHours.minimumHours;
  const weekly = weeklyPayAtHire(
    world,
    application.personId,
    opening.jurisdictionId,
    opening.pay.basis === "annual-salary"
      ? Math.round(opening.pay.amount.minorUnits / 52)
      : opening.pay.amount.minorUnits * hours,
    hours,
  );
  next = ensureLifePathPersonalPosition(
    next,
    application.personId,
    opening.pay.amount.currency,
  );
  next = createWorkCompensation(next, {
    stableKey: `${PAY_KEY_PREFIX}${work.id}`,
    workRelationshipId: work.id,
    startsAt: next.currentDate,
    amount: money(weekly.weeklyMinor, opening.pay.amount.currency),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: { ...provenance, note: `${PROVENANCE_NOTE}${weekly.note}` },
  });
  next = addStep(next, application, {
    kind: "started",
    occurredAt: world.currentDate,
    workRelationshipId: work.id,
    summary: isPlayed(world, application.personId)
      ? `You started as ${opening.title.toLowerCase()} at ${employer}.`
      : `${residentName(world, application.personId)} started as ${opening.title.toLowerCase()} at ${employer}.`,
  });
  return {
    world: next,
    ok: true,
    message: isPlayed(world, application.personId)
      ? `You started at ${employer}.`
      : `${residentName(world, application.personId)} started at ${employer}.`,
  };
}

/** Leave a job taken through the job market. */
export function leaveJob(
  world: World,
  workRelationshipId: EntityId,
): JobMarketResult {
  const work = world.history.workRelationships.find(
    (row) => row.id === workRelationshipId,
  );
  if (!work || work.kind !== JOB_MARKET_WORK_KIND)
    return {
      world,
      ok: false,
      message: "This is not a job you can leave here.",
    };
  const refusal = playerCanAct(world, work.personId);
  if (refusal) return { world, ok: false, message: refusal };
  const status = workStatusAt(world, work.id);
  if (status?.status !== "active")
    return { world, ok: false, message: "You no longer work here." };
  const next = recordWorkStatus(world, {
    stableKey: `${work.stableKey}:left:${world.currentDate}`,
    workRelationshipId: work.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "Left the job.",
    provenance: { kind: "authored", note: PROVENANCE_NOTE },
    supersedesStatusId: status.id,
  });
  return {
    world: next,
    ok: true,
    message: `You left your job at ${organizationName(world, work.organizationId!)}.`,
  };
}

/* -------------------------------------------------------------------------- */
/* A first job                                                                */
/* -------------------------------------------------------------------------- */

function payWeekly(
  world: World,
  personId: EntityId,
  workRelationshipId: EntityId,
  weeklyMinor: number,
  currency: string,
  note: string,
): World {
  const stableKey = `${PAY_KEY_PREFIX}${workRelationshipId}`;
  if (world.history.resourceFlows.some((row) => row.stableKey === stableKey))
    return world;
  const amount = money(weeklyMinor, currency);
  const next = ensureLifePathPersonalPosition(world, personId, amount.currency);
  return createWorkCompensation(next, {
    stableKey,
    workRelationshipId,
    startsAt: next.currentDate,
    amount,
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: { kind: "authored", note },
  });
}

/**
 * A grown-up new life arrives holding a job in their own town, at the local
 * business `adultStartEmployer` chooses from their own situation, rather
 * than between jobs. It is an ordinary job of this market: paid each week,
 * raised by a minimum-wage law, and left like any other.
 *
 * The job began when the person was free to take it: at eighteen, when the
 * business opened, or the day after their last recorded job ended, whichever
 * is latest. Pay runs from the day the game opens, at the town's published
 * monthly pay for the work spread over the weeks of a year; earlier wages
 * are not claimed. Writes nothing for a person under nineteen, one already
 * working, or a town with no business they are fit for, and nothing twice.
 */
export function hireAtAdultStart(
  world: World,
  input: { readonly personId: EntityId; readonly jurisdictionId: EntityId },
): World {
  const key = `adult-start-work-v1:${input.personId}`;
  if (world.history.workRelationships.some((work) => work.stableKey === key))
    return world;
  const person = world.people[input.personId];
  if (!person || ageOnDate(person.birthDate, world.currentDate) < 19)
    return world;
  if (activeWorkRelationshipsAt(world, person.id).length > 0) return world;
  const employer = adultStartEmployer(world, person.id, input.jurisdictionId);
  if (!employer) return world;
  const lastEnded = world.history.workRelationships
    .filter((work) => work.personId === person.id)
    .flatMap((work) => {
      const status = workStatusAt(world, work.id);
      return status?.status === "ended" ? [status.effectiveAt] : [];
    })
    .sort()
    .at(-1);
  const startedAt = [
    dateAtAge(person.birthDate, 18),
    employer.organization.formedAt,
    ...(lastEnded ? [addDays(lastEnded, 1)] : []),
  ]
    .sort()
    .at(-1)!;
  if (startedAt > world.currentDate) return world;
  const note =
    "A grown-up new life's job at a local business, chosen from the people they know, the work they did before and the town's pay.";
  const next = createWorkRelationship(world, {
    stableKey: key,
    personId: person.id,
    organizationId: employer.organization.id,
    startedAt,
    initialStatus: "active",
    kind: JOB_MARKET_WORK_KIND,
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note },
    initialRole: {
      title: employer.kind.workerTitle,
      occupationClassification: employer.kind.workerOccupation,
      locationJurisdictionId: input.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: input.jurisdictionId,
      },
    },
  });
  const work = next.history.workRelationships.at(-1)!;
  const monthly = localBusinessWageMinor(
    employer.kind,
    input.jurisdictionId,
  ).monthlyMinor;
  const weekly = weeklyPayAtHire(
    next,
    person.id,
    input.jurisdictionId,
    Math.round((monthly * 12) / 52),
    40,
  );
  return payWeekly(
    next,
    person.id,
    work.id,
    weekly.weeklyMinor,
    "USD",
    `${note}${weekly.note}`,
  );
}

/**
 * A hire's weekly pay under the fairness-law rule (`fairness-pay-law.ts`):
 * a man partnered with a man whom no fairness law covers where the job is,
 * hired today, is paid the job's pay over 1.027, never below the minimum wage
 * for his hours. The note says so, or is empty.
 */
function weeklyPayAtHire(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId | null,
  weeklyMinor: number,
  hours: number,
): { readonly weeklyMinor: number; readonly note: string } {
  const paid = payAtHire(world, {
    personId,
    jobJurisdictionId: jurisdictionId,
    date: world.currentDate,
    amountMinor: weeklyMinor,
    floorMinor:
      minimumHourlyMinorFor(world, jurisdictionId, world.currentDate) * hours,
  });
  return {
    weeklyMinor: paid.amountMinor,
    note: paid.belowRate ? ` Paid ${UNCOVERED_PAY_NOTE}.` : "",
  };
}

/**
 * A teenager's first job ends when an adult job starts: the stock clerk job
 * used to run on beside every later job for life, in all nine of the regional
 * roll-call lives. Ended today, with the new job named. Unchanged when there
 * is no active first job.
 */
export function leaveFirstJobFor(
  world: World,
  personId: EntityId,
  newTitle: string,
): World {
  const work = world.history.workRelationships.find(
    (row) =>
      row.personId === personId && row.stableKey === LEGACY_FIRST_JOB_WORK_KEY,
  );
  const status = work ? workStatusAt(world, work.id) : null;
  if (!work || status?.status !== "active") return world;
  const ended = recordWorkStatus(world, {
    stableKey: `${work.stableKey}:left:${world.currentDate}`,
    workRelationshipId: work.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: `Left for work as ${newTitle.toLowerCase()}.`,
    provenance: { kind: "authored", note: PROVENANCE_NOTE },
    supersedesStatusId: status.id,
  });
  // Said in the life record, so the ending reads back rather than the job
  // quietly vanishing from the list.
  const title = activeRole(world, work)?.title ?? "first job";
  return note(ended, {
    key: `${work.stableKey}:left:${world.currentDate}`,
    type: "first-job-left",
    occurredAt: world.currentDate,
    personId,
    involved: [work.id, ...(work.organizationId ? [work.organizationId] : [])],
    jurisdictionId: null,
    summary: `You left your ${title.toLowerCase()} job${work.organizationId ? ` at ${organizationName(world, work.organizationId)}` : ""} to work as ${newTitle.toLowerCase()}.`,
  }).world;
}

/**
 * A saved adult who already started another job while the first job ran on
 * leaves the first job at the next settlement, forward only.
 */
function retireSupersededFirstJob(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person || ageOnDate(person.birthDate, world.currentDate) < 18)
    return world;
  const first = world.history.workRelationships.find(
    (row) =>
      row.personId === personId && row.stableKey === LEGACY_FIRST_JOB_WORK_KEY,
  );
  if (!first || workStatusAt(world, first.id)?.status !== "active")
    return world;
  const later = world.history.workRelationships.find(
    (row) =>
      row.personId === personId &&
      row.id !== first.id &&
      row.kind.startsWith("employment:") &&
      workStatusAt(world, row.id)?.status === "active",
  );
  if (!later) return world;
  return leaveFirstJobFor(
    world,
    personId,
    activeRole(world, later)?.title ?? "another job",
  );
}

/**
 * The minimum wage in force where a job is on `onDate`, in cents an hour: the
 * highest of the federal, state and local minimum (`minimum-wage.ts`). Where
 * the state's rate is unknown, the federal rate is the floor known.
 */
function minimumHourlyMinorFor(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number {
  return (
    minimumWageSettingAt(world, jurisdictionId, onDate)?.hourlyMinor ??
    FEDERAL_MINIMUM_HOURLY_MINOR
  );
}

/** Where a job is worked: its role's place, else its employer's, else home. */
function workplaceJurisdictionId(
  world: World,
  work: WorkRelationship,
): EntityId | null {
  const role = activeRole(world, work);
  return (
    role?.locationJurisdictionId ??
    role?.timeDemand.locationJurisdictionId ??
    (work.organizationId
      ? (organizationProfileAt(world, work.organizationId)
          ?.locationJurisdictionId ?? null)
      : null) ??
    world.people[work.personId]?.homeJurisdictionId ??
    null
  );
}

/**
 * Pays a teenager's first job weekly from today, at its expected hours (the
 * middle of the range) and the state minimum wage for today's date. Called when the job
 * is taken; a saved one is found at the next settlement and paid forward
 * only. Unchanged when the job is not active or is already paid.
 */
export function payFirstJob(world: World, personId: EntityId): World {
  const work = world.history.workRelationships.find(
    (row) =>
      row.personId === personId &&
      row.stableKey === LEGACY_FIRST_JOB_WORK_KEY &&
      row.compensation === "paid",
  );
  if (!work || workStatusAt(world, work.id)?.status !== "active") return world;
  const weekly = activeRole(world, work)?.timeDemand.expectedWeekly;
  if (!weekly) return world;
  const hours = Math.round((weekly.minimumHours + weekly.maximumHours) / 2);
  const hourlyMinor = minimumHourlyMinorFor(
    world,
    workplaceJurisdictionId(world, work),
    world.currentDate,
  );
  return payWeekly(
    world,
    personId,
    work.id,
    hourlyMinor * hours,
    "USD",
    `A first job, paid weekly from ${world.currentDate} for ${hours} hours at the minimum wage where it is, $${(hourlyMinor / 100).toFixed(2)} an hour.`,
  );
}

/* -------------------------------------------------------------------------- */
/* Time passing                                                               */
/* -------------------------------------------------------------------------- */

function advanceApplication(
  world: World,
  application: JobApplicationRecord,
): World {
  let next = world;
  // Each pass writes at most one step; a long stretch can need several, as
  // when an answer, an unanswered offer and its lapse all fall in one jump.
  for (let guard = 0; guard < 6; guard += 1) {
    const latest = latestApplicationStep(next, application.id);
    const opening = jobOpening(next, application.openingId)!;
    const employer = organizationName(next, opening.organizationId);
    const today = next.currentDate;
    const played = isPlayed(next, application.personId);
    const who = played ? "you" : residentName(next, application.personId);
    if (!latest) {
      if (today < application.decisionAt) return next;
      next = decide(next, application);
      continue;
    }
    if (latest.kind === "offered") {
      if (today <= latest.replyBy!) return next;
      next = addStep(next, application, {
        kind: "offer-lapsed",
        occurredAt: addDays(latest.replyBy!, 1),
        summary: `${employer}'s offer lapsed: ${who} did not answer by ${spoken(latest.replyBy)}.`,
      });
      continue;
    }
    if (latest.kind === "accepted" || latest.kind === "followed-up") {
      const startAt = expectedStart(next, application.id)!;
      const missedOn = addDays(
        startAt,
        JOB_MARKET_PLACEHOLDER.missedStartGraceDays,
      );
      if (today <= missedOn) return next;
      const occurredAt = addDays(missedOn, 1);
      // The employer calls when somebody who works there vouched for them,
      // or when nobody else applied who it could call instead.
      const followUp =
        latest.kind === "accepted" &&
        (application.route === "introduced" ||
          rivalsFor(next, application, occurredAt).length === 0);
      if (followUp) {
        const newStart = addDays(
          occurredAt,
          holdsWork(next, application.personId)
            ? JOB_MARKET_PLACEHOLDER.followUpStartDays.maximum
            : JOB_MARKET_PLACEHOLDER.followUpStartDays.minimum,
        );
        next = addStep(next, application, {
          kind: "followed-up",
          occurredAt,
          startAt: newStart,
          reason: played
            ? `You did not come in on ${spoken(startAt)}.`
            : `${who} did not come in on ${spoken(startAt)}.`,
          summary: played
            ? `${employer} called when you did not come in on ${spoken(startAt)}. They still want you and asked you to start on ${spoken(newStart)}.`
            : `${employer} called when ${who} did not come in on ${spoken(startAt)} and asked them to start on ${spoken(newStart)}.`,
        });
        continue;
      }
      next = addStep(next, application, {
        kind: "withdrawn",
        occurredAt,
        reason:
          latest.kind === "followed-up"
            ? `${played ? "You" : who} missed the second start date, ${spoken(startAt)}.`
            : `${played ? "You" : who} did not come in on ${spoken(startAt)}.`,
        summary:
          latest.kind === "followed-up"
            ? `${employer} withdrew the offer after ${who} missed the second start date, ${spoken(startAt)}.`
            : `${employer} withdrew the offer when ${who} did not come in on ${spoken(startAt)}.`,
      });
      continue;
    }
    return next;
  }
  return next;
}

function payKey(work: WorkRelationship): string {
  return `${PAY_KEY_PREFIX}${work.id}`;
}

function isActiveOn(world: World, workId: EntityId, date: IsoDate): boolean {
  return (
    workStatusAt(world, workId, {
      ...currentLifeCutoff(world),
      asOfDate: date,
    })?.status === "active"
  );
}

/**
 * Pays every whole week of a held job that has come due, at the terms of the
 * offer. Keyed by the week it began, so a second call or a reload writes
 * nothing new.
 */
export function settleJobPay(world: World, personId: EntityId): World {
  return settleRecordedJobPay(
    payFirstJob(retireSupersededFirstJob(world, personId), personId),
    personId,
    (flow, work) => flow.stableKey === payKey(work),
  );
}

function settleRecordedJobPay(
  world: World,
  personId: EntityId,
  accepts: (
    flow: World["history"]["resourceFlows"][number],
    work: WorkRelationship,
  ) => boolean,
  earliestDueExclusive?: IsoDate,
  isDueAllowed?: (dueOn: IsoDate) => boolean,
): World {
  let next = world;
  for (const work of next.history.workRelationships) {
    if (work.personId !== personId) continue;
    const flow = next.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === work.id &&
        accepts(row, work),
    );
    if (!flow) continue;
    // Only weekly terms pay here. Town pay settles its own biweekly,
    // semimonthly and monthly schedules (living-world/town-pay.ts), and their
    // periods do not fall on whole weeks from the flow's start.
    if (
      !resourceFlowTermsHistory(next, flow.id).some(
        (terms) => terms.cadenceKind === "schedule:weekly",
      )
    )
      continue;
    let paidWeeks = 0;
    for (const outcome of next.history.resourceTransferOutcomes) {
      if (outcome.resourceFlowId !== flow.id) continue;
      const week =
        daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
      if (week > paidWeeks) paidWeeks = week;
    }
    const firstNewWeek =
      earliestDueExclusive && earliestDueExclusive >= flow.startsAt
        ? Math.floor(
            daysBetween(flow.startsAt, earliestDueExclusive) / WEEK_DAYS,
          ) + 1
        : 1;
    const firstWeek = Math.max(paidWeeks + 1, firstNewWeek);
    for (
      let week = firstWeek;
      week < firstWeek + CATCH_UP_LIMIT_WEEKS;
      week += 1
    ) {
      const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
      const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
      if (dueOn > next.currentDate) break;
      if (isDueAllowed && !isDueAllowed(dueOn)) break;
      if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
      const terms = resourceFlowTermsAt(next, flow.id, {
        asOfDate: periodStartsAt,
        historySequenceExclusive: next.history.nextSequence,
      });
      if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
        break;
      next = settleTownCompensations(next, [
        {
          stableKey: `${flow.stableKey}:${periodStartsAt}`,
          payFlowId: flow.id,
          activityId: flow.id,
          periodStartsAt,
          periodEndsAt: addDays(dueOn, -1),
          onDate: dueOn,
          note: "Pay for the week.",
        },
      ]);
    }
  }
  return next;
}

/**
 * A child-controlled clock also advances work already held by adults in the
 * child's recorded household. Only existing weekly compensation terms pay,
 * and only for weeks that came due after this clock advance began. A preexisting
 * job cannot mint years of wages when the child first passes a day. This does
 * not give a parent a job, guess a salary, or pool the wages into the household.
 * If the adult's personal money was not tracked before, its opening checkpoint
 * carries only the outcomes already recorded for that adult.
 */
export function settleHouseholdAdultJobPay(
  world: World,
  childPersonId: EntityId,
  earliestDueExclusive: IsoDate,
): World {
  const child = world.people[childPersonId];
  if (!child || ageOnDate(child.birthDate, earliestDueExclusive) >= 18)
    return world;
  const primary = householdMembershipsAt(world, childPersonId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (primary.length !== 1) return world;
  let next = world;
  for (const adultId of peopleInHouseholdAt(world, primary[0]!.household.id)) {
    if (adultId === childPersonId) continue;
    const adult = next.people[adultId];
    if (!adult || ageOnDate(adult.birthDate, next.currentDate) < 18) continue;
    const paid = settleRecordedJobPay(
      next,
      adultId,
      (flow, work) =>
        flow.basisKind === "compensation:work" &&
        flow.recipient.kind === "person" &&
        flow.recipient.personId === adultId &&
        flow.source.kind === "organization" &&
        flow.source.organizationId === work.organizationId,
      earliestDueExclusive,
      (dueOn) =>
        ageOnDate(child.birthDate, dueOn) < 18 &&
        isPersonAliveAt(next, adultId, {
          ...currentLifeCutoff(next),
          asOfDate: addDays(dueOn, -1),
        }),
    );
    const newOutcomes = paid.history.resourceTransferOutcomes.slice(
      next.history.resourceTransferOutcomes.length,
    );
    next = paid;
    for (const outcome of newOutcomes) {
      const flow = next.history.resourceFlows.find(
        (entry) => entry.id === outcome.resourceFlowId,
      );
      if (flow?.recipient.kind === "person") {
        next = ensureLifePathPersonalPosition(
          next,
          adultId,
          outcome.transferredAmount.currency,
        );
      }
    }
  }
  return next;
}

/**
 * The employer's side of every application as days pass: answers, lapsed
 * offers and missed starts. It runs on the ordinary clock too, so a plain day
 * skip no longer leaves an application waiting forever for an answer.
 */
export function advanceApplications(world: World, personId: EntityId): World {
  let next = world;
  for (const application of applicationsFor(next, personId))
    next = advanceApplication(next, application);
  return next;
}

/**
 * Everything the job market owes a person when time has passed: the town's
 * public bodies recorded as employers, this week's listings, the employer's
 * answers, lapsed and missed offers, and a held job's weekly pay. Idempotent
 * at the day.
 */
export function advanceJobMarket(world: World, personId: EntityId): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  const person = world.people[personId];
  if (!person) return world;
  let next = ensureHomeLocalGovernments(world, personId);
  if (ageOnDate(person.birthDate, next.currentDate) >= MINIMUM_APPLICANT_AGE)
    next = openWeeklyListings(next, personId);
  return settleJobPay(advanceApplications(next, personId), personId);
}
