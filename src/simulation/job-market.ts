import { addDays, ageOnDate, daysBetween, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { createWorkRelationship, recordWorkStatus } from "./life";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  organizationProfileAt,
  workStatusAt,
} from "./life-queries";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { governmentUnit } from "./government-units";
import { governmentUnitDisplayName } from "./nationwide-world/government-unit-names";
import {
  ensureHomeLocalGovernments,
  homeLocalGovernmentUnits,
  localGovernmentOrganizationKey,
} from "./nationwide-world/local-governments";
import { resourceFlowTermsAt } from "./resource-queries";
import {
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "./resources";
import { SeededRng } from "./rng";
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
  /** Chance a role with no open listing opens one in a given week. */
  weeklyOpeningChance: 0.35,
  /** Share of hourly openings that are part-time. */
  partTimeShare: 0.3,
  /** Part-time weekly hours: the low end, and how far the range runs. */
  partTimeMinimumHours: { minimum: 16, maximum: 24 },
  partTimeSpreadHours: { minimum: 4, maximum: 8 },
  /** How far an offer may sit from what the employer pays now, either way. */
  offerSpread: 0.08,
  /** Days between applying and hearing back. */
  decisionDays: { minimum: 2, maximum: 7 },
  /** Chance an application ends in an offer, by route. */
  hireChance: { applied: 0.45, introduced: 0.75 } as Readonly<
    Record<JobApplicationRoute, number>
  >,
  /** Days from the reply deadline to the start date. */
  startLeadDays: { minimum: 1, maximum: 7 },
  /** Days after a start date before the employer treats it as missed. */
  missedStartGraceDays: 2,
  /** Chance the employer follows up a first missed start without a contact. */
  followUpChance: 0.5,
  /** Days from a follow-up to the new start date. */
  followUpStartDays: { minimum: 3, maximum: 7 },
  /** An existing job this many hours a week rules out a full-time second. */
  fullTimeHours: 30,
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
 * The federal minimum wage (Fair Labor Standards Act, $7.25 an hour since
 * July 24, 2009). No offer is written below it. State and territory minimums
 * are not on file (research: minimum-wages-by-place), so none is claimed.
 */
export const FEDERAL_MINIMUM_HOURLY_MINOR = 725;

/**
 * The youngest applicant an employer takes: 16, the federal general minimum
 * for nonfarm work without hour limits.
 */
export const MINIMUM_APPLICANT_AGE = 16;

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

function rngFor(world: World, key: string): SeededRng {
  return new SeededRng(`${world.seed}:job-market:${key}`);
}

function between(
  rng: SeededRng,
  range: { minimum: number; maximum: number },
): number {
  return rng.integer(range.minimum, range.maximum + 1);
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
function spoken(date: IsoDate | null): string {
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
    !openingFilled(world, opening.id)
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

function offerTerms(
  role: EmployerRole,
  rng: SeededRng,
): {
  pay: JobPayTerms;
  weeklyHours: { minimumHours: number; maximumHours: number };
} {
  const spread = 1 + (rng.next() * 2 - 1) * JOB_MARKET_PLACEHOLDER.offerSpread;
  const partTime =
    !role.salaried && rng.next() < JOB_MARKET_PLACEHOLDER.partTimeShare;
  const weeklyHours = partTime
    ? (() => {
        const minimum = between(
          rng,
          JOB_MARKET_PLACEHOLDER.partTimeMinimumHours,
        );
        return {
          minimumHours: minimum,
          maximumHours:
            minimum + between(rng, JOB_MARKET_PLACEHOLDER.partTimeSpreadHours),
        };
      })()
    : role.weeklyHours;
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
    FEDERAL_MINIMUM_HOURLY_MINOR,
    roundTo((role.annualMinor / 52 / fullTimeHours) * spread, 5),
  );
  return {
    pay: { basis: "hourly", amount: money(hourly, role.currency) },
    weeklyHours,
  };
}

/**
 * Opens this week's listings in the person's area. Idempotent within a week:
 * each role's chance is drawn from its key and the week, so a second call in
 * the same week draws the same answer and the stable key refuses a second
 * write.
 */
export function openWeeklyListings(world: World, personId: EntityId): World {
  const week = weekIndex(world.currentDate);
  let next = world;
  for (const role of townEmployerRoles(world, personId)) {
    const openForRole = (next.history.jobOpenings ?? []).some(
      (opening) =>
        opening.stableKey.startsWith(`job-opening:${role.key}:`) &&
        openingTakesApplications(next, opening),
    );
    if (openForRole) continue;
    const key = `job-opening:${role.key}:${week}`;
    const rng = rngFor(next, key);
    if (rng.next() >= JOB_MARKET_PLACEHOLDER.weeklyOpeningChance) continue;
    const terms = offerTerms(role, rng);
    const closesAt = addDays(
      next.currentDate,
      between(rng, JOB_TIMING.recruitmentWindowDays),
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
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return "Only the person being played can apply here.";
  const person = world.people[personId];
  if (!person) return "This person is not in the world.";
  if (ageOnDate(person.birthDate, world.currentDate) < MINIMUM_APPLICANT_AGE)
    return `Employers here take applicants who are ${MINIMUM_APPLICANT_AGE} or older.`;
  return null;
}

/** Why this person cannot apply for this opening now, or null if they can. */
export function applicationBlocked(
  world: World,
  personId: EntityId,
  openingId: EntityId,
): string | null {
  const refusal = playerCanAct(world, personId);
  if (refusal) return refusal;
  const opening = jobOpening(world, openingId);
  if (!opening || !openingTakesApplications(world, opening))
    return "This opening is no longer taking applications.";
  if (
    applicationsFor(world, personId).some(
      (application) => application.openingId === openingId,
    )
  )
    return "You have already applied for this job.";
  if (
    activeWorkRelationshipsAt(world, personId).some(
      (entry) => entry.relationship.organizationId === opening.organizationId,
    )
  )
    return "You already work here.";
  return null;
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
  const rng = rngFor(world, stableKey);
  const decisionAt = addDays(
    world.currentDate,
    between(rng, JOB_MARKET_PLACEHOLDER.decisionDays),
  );
  const employer = organizationName(world, opening.organizationId);
  const introducer = introducerPersonId
    ? world.people[introducerPersonId]
    : null;
  const summary = introducer
    ? `${introducer.givenName} ${introducer.familyName} put in a word for you at ${employer} about the ${opening.title.toLowerCase()} opening.`
    : `You applied to ${employer} for the ${opening.title.toLowerCase()} opening.`;
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
    message: introducer
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

function decide(world: World, application: JobApplicationRecord): World {
  const opening = jobOpening(world, application.openingId)!;
  const employer = organizationName(world, opening.organizationId);
  const on = application.decisionAt;
  if (
    opening.weeklyHours.minimumHours >= JOB_MARKET_PLACEHOLDER.fullTimeHours &&
    holdsFullTimeWork(world, application.personId)
  )
    return addStep(world, application, {
      kind: "declined",
      occurredAt: on,
      reason:
        "They wanted someone free to work these hours, and you already hold a full-time job.",
      summary: `${employer} turned down your application: they wanted someone free for full-time hours, and you already work full time.`,
    });
  const rng = rngFor(world, `${application.stableKey}:decision`);
  if (rng.next() >= JOB_MARKET_PLACEHOLDER.hireChance[application.route])
    return addStep(world, application, {
      kind: "declined",
      occurredAt: on,
      reason: "They chose another applicant.",
      summary: `${employer} chose another applicant for the ${opening.title.toLowerCase()} job.`,
    });
  const replyBy = addDays(on, between(rng, JOB_TIMING.offerReplyDays));
  const leadStart = addDays(
    replyBy,
    between(rng, JOB_MARKET_PLACEHOLDER.startLeadDays),
  );
  const startAt =
    opening.earliestStartAt && opening.earliestStartAt > leadStart
      ? opening.earliestStartAt
      : leadStart;
  const agreedWeeklyHours =
    opening.pay.basis === "hourly"
      ? rng.integer(
          opening.weeklyHours.minimumHours,
          opening.weeklyHours.maximumHours + 1,
        )
      : null;
  return addStep(world, application, {
    kind: "offered",
    occurredAt: on,
    replyBy,
    startAt,
    agreedWeeklyHours,
    summary: `${employer} offered you the ${opening.title.toLowerCase()} job at ${payPhrase(opening.pay)}${agreedWeeklyHours ? `, ${agreedWeeklyHours} hours a week` : ""}, starting ${spoken(startAt)}. They asked for an answer by ${spoken(replyBy)}.`,
  });
}

/** Accept or turn down an offer that is still waiting for an answer. */
export function answerJobOffer(
  world: World,
  applicationId: EntityId,
  accept: boolean,
): JobMarketResult {
  const application = (world.history.jobApplications ?? []).find(
    (row) => row.id === applicationId,
  );
  if (!application)
    return { world, ok: false, message: "There is no such application." };
  const refusal = playerCanAct(world, application.personId);
  if (refusal) return { world, ok: false, message: refusal };
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
        summary: `You turned down ${employer}'s offer.`,
      }),
      ok: true,
      message: `You turned down the offer from ${employer}.`,
    };
  return {
    world: addStep(world, application, {
      kind: "accepted",
      occurredAt: world.currentDate,
      startAt: latest.startAt,
      summary: `You accepted ${employer}'s offer. You start on ${spoken(latest.startAt)}.`,
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
  const application = (world.history.jobApplications ?? []).find(
    (row) => row.id === applicationId,
  );
  if (!application) return "There is no such application.";
  const refusal = playerCanAct(world, application.personId);
  if (refusal) return refusal;
  const latest = latestApplicationStep(world, applicationId);
  if (latest?.kind !== "accepted" && latest?.kind !== "followed-up")
    return "There is no accepted offer to start.";
  const startAt = expectedStart(world, applicationId)!;
  if (world.currentDate < startAt) return `You start on ${spoken(startAt)}.`;
  return null;
}

/** Turn up on (or after) the start date and begin the job. */
export function startJob(
  world: World,
  applicationId: EntityId,
): JobMarketResult {
  const blocked = startBlocked(world, applicationId);
  if (blocked) return { world, ok: false, message: blocked };
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
  const weekly =
    opening.pay.basis === "annual-salary"
      ? Math.round(opening.pay.amount.minorUnits / 52)
      : opening.pay.amount.minorUnits *
        (offer.agreedWeeklyHours ?? opening.weeklyHours.minimumHours);
  next = ensureLifePathPersonalPosition(
    next,
    application.personId,
    opening.pay.amount.currency,
  );
  next = createWorkCompensation(next, {
    stableKey: `${PAY_KEY_PREFIX}${work.id}`,
    workRelationshipId: work.id,
    startsAt: next.currentDate,
    amount: money(weekly, opening.pay.amount.currency),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  next = addStep(next, application, {
    kind: "started",
    occurredAt: world.currentDate,
    workRelationshipId: work.id,
    summary: `You started as ${opening.title.toLowerCase()} at ${employer}.`,
  });
  return { world: next, ok: true, message: `You started at ${employer}.` };
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
        summary: `${employer}'s offer lapsed: you did not answer by ${spoken(latest.replyBy)}.`,
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
      const rng = rngFor(next, `${application.stableKey}:missed:${startAt}`);
      const followUp =
        latest.kind === "accepted" &&
        (application.route === "introduced" ||
          rng.next() < JOB_MARKET_PLACEHOLDER.followUpChance);
      if (followUp) {
        const newStart = addDays(
          occurredAt,
          between(rng, JOB_MARKET_PLACEHOLDER.followUpStartDays),
        );
        next = addStep(next, application, {
          kind: "followed-up",
          occurredAt,
          startAt: newStart,
          reason: `You did not come in on ${spoken(startAt)}.`,
          summary: `${employer} called when you did not come in on ${spoken(startAt)}. They still want you and asked you to start on ${spoken(newStart)}.`,
        });
        continue;
      }
      next = addStep(next, application, {
        kind: "withdrawn",
        occurredAt,
        reason:
          latest.kind === "followed-up"
            ? `You missed the second start date, ${spoken(startAt)}.`
            : `You did not come in on ${spoken(startAt)}.`,
        summary:
          latest.kind === "followed-up"
            ? `${employer} withdrew the offer after you missed the second start date, ${spoken(startAt)}.`
            : `${employer} withdrew the offer when you did not come in on ${spoken(startAt)}.`,
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
  let next = world;
  for (const work of world.history.workRelationships) {
    if (work.personId !== personId || work.kind !== JOB_MARKET_WORK_KIND)
      continue;
    const flow = next.history.resourceFlows.find(
      (row) => row.stableKey === payKey(work),
    );
    if (!flow) continue;
    let paidWeeks = 0;
    for (const outcome of next.history.resourceTransferOutcomes) {
      if (outcome.resourceFlowId !== flow.id) continue;
      const week =
        daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
      if (week > paidWeeks) paidWeeks = week;
    }
    for (
      let week = paidWeeks + 1;
      week <= paidWeeks + CATCH_UP_LIMIT_WEEKS;
      week += 1
    ) {
      const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
      const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
      if (dueOn > next.currentDate) break;
      if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
      next = resolveWorkCompensationPeriod(next, {
        stableKey: `${flow.stableKey}:${periodStartsAt}`,
        workRelationshipId: work.id,
        periodStartsAt,
        periodEndsAt: addDays(dueOn, -1),
        occurredAt: dueOn,
        status: "completed",
        reasonKind: null,
        note: "Pay for the week.",
        provenance: flow.provenance,
      });
    }
  }
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
  for (const application of applicationsFor(next, personId))
    next = advanceApplication(next, application);
  return settleJobPay(next, personId);
}
