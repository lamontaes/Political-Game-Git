import { annualizedRecordedPayMinor } from "./household-pay-math";
/** Complete Native employer roles and weekly-listing math. Effect drafts require the shared append owner; this module writes no World. */
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { money } from "./cost-money";
import {
  stateMedianAnnualWage as wageMedian,
  type WageSourceFacts,
} from "./wage-source";
import { resourceFlowTermsAt as termsOf } from "./credential-pay";
import { localGovernmentOrganizationKey } from "../../simulation/nationwide-world/local-governments";
import type * as life from "../../simulation/life-queries";
import type { homeLocalGovernmentUnits as nativeUnits } from "../../simulation/nationwide-world/local-governments";
import type {
  JobOpeningRecord,
  JobPayTerms,
  JobApplicationStepRecord,
} from "../../simulation/job-market-types";
import type {
  World,
  EntityId,
  IsoDate,
  OccupationClassification,
  WorkRelationship,
} from "../../simulation/types";
export interface JobListingFacts {
  readonly currentDate: IsoDate;
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "workRelationships"
    | "workRoles"
    | "organizations"
    | "resourceFlows"
    | "resourceFlowTerms"
    | "resourceTransferOutcomes"
    | "jobOpenings"
    | "jobApplications"
    | "jobApplicationSteps"
  >;
  readonly people: World["people"];
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationProfileAt>
  >;
  readonly statuses: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.workStatusAt>
  >;
  readonly roles: ReadonlyMap<EntityId, ReturnType<typeof life.workRoleAt>>;
  readonly closings: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationClosingAt>
  >;
  readonly units: ReadonlyMap<EntityId, ReturnType<typeof nativeUnits>>;
  readonly population: ReadonlyMap<EntityId, number | null>;
  readonly minimum: ReadonlyMap<EntityId, number>;
  readonly wage: WageSourceFacts;
}
export interface JobListingRequest {
  readonly kind: "appendJobOpening";
  readonly input: Omit<JobOpeningRecord, "id" | "sequence">;
}
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key))
    throw Error("Missing raw listing source/life/legal receipt: " + key);
  return map.get(key)!;
}
function currentLifeCutoff(facts: JobListingFacts) {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function organizationProfileAt(
  facts: JobListingFacts,
  id: EntityId,
  _cutoff?: ReturnType<typeof currentLifeCutoff>,
) {
  void _cutoff;
  return receipt(facts.profiles, id);
}
function workStatusAt(
  facts: JobListingFacts,
  id: EntityId,
  _cutoff?: ReturnType<typeof currentLifeCutoff>,
) {
  void _cutoff;
  return receipt(facts.statuses, id);
}
function workRoleAt(
  facts: JobListingFacts,
  id: EntityId,
  _cutoff?: ReturnType<typeof currentLifeCutoff>,
) {
  void _cutoff;
  return receipt(facts.roles, id);
}
function organizationClosingAt(facts: JobListingFacts, id: EntityId) {
  return receipt(facts.closings, id);
}
function homeLocalGovernmentUnits(facts: JobListingFacts, id: EntityId) {
  return receipt(facts.units, id);
}
function playerTown(facts: JobListingFacts, id: EntityId) {
  return receipt(facts.population, id);
}
function townRoster(population: number) {
  return { population };
}
function stateMedianAnnualWage(
  facts: JobListingFacts,
  occupation: string,
  id: EntityId,
) {
  return wageMedian(facts.wage, occupation, id);
}
function resourceFlowTermsAt(facts: JobListingFacts, id: EntityId) {
  return termsOf(
    { currentDate: facts.currentDate, records: facts.records },
    id,
  );
}
function minimumWageSettingAt(
  facts: JobListingFacts,
  id: EntityId | null,
  _onDate: IsoDate,
) {
  void _onDate;
  return id ? { hourlyMinor: receipt(facts.minimum, id) } : null;
}
const FEDERAL_MINIMUM_HOURLY_MINOR = 725;
// STOPGAP: economy.job-listing-public-role-estimate

const PROVENANCE_NOTE =
  "Opening, answer and start timing are drawn from the estimated profile in job-market.ts; pay is read from the employer's own pay for the role.";
export const JOB_TIMING = {
  recruitmentWindowDays: { minimum: 7, maximum: 28 },
  offerReplyDays: { minimum: 3, maximum: 7 },
} as const;
export const JOB_MARKET_TIMING_ESTIMATE = {
  researchQuestionId: "job-market-calibration",
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "Bureau of Labor Statistics Job Openings and Labor Turnover Survey hiring timing; 30 full-time hours from the Affordable Care Act",
  offerSpread: 0.08,
  decisionDays: { minimum: 2, maximum: 7 },
  startLeadDays: { minimum: 1, maximum: 7 },
  missedStartGraceDays: 2,
  followUpStartDays: { minimum: 3, maximum: 7 },
  fullTimeHours: 30,
} as const;
export const JOB_TURNOVER = {
  monthlySeparationRate: 0.033,
  localGovernmentStaffPerResident: 6789100 / 340110988,
  newEmployerDays: 91,
} as const;
export const PUBLIC_BODY_ROLE_PROFILE = {
  researchQuestionId: "public-employer-roles-and-pay",
  title: "Office clerk",
  occupationClassification: "occupation:office-clerk",
  weeklyHours: { minimumHours: 37, maximumHours: 40 },
} as const;
export const JOB_MARKET_WORK_KIND = "employment:job-market" as const;
const WEEK_DAYS = 7;
const WEEK_EPOCH = makeIsoDate("2000-01-03");
export interface EmployerRole {
  readonly key: string;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly title: string;
  readonly occupationClassification: OccupationClassification | null;
  readonly annualMinor: number;
  readonly currency: string;
  readonly weeklyHours: {
    readonly minimumHours: number;
    readonly maximumHours: number;
  };
  readonly salaried: boolean;
  readonly source: "staff-pay" | "public-body-profile";
  readonly holders: number;
  readonly lastHiredAt: IsoDate | null;
}
const SLUGS = new Map<string, string>();
function slug(value: string): string {
  const saved = SLUGS.get(value);
  if (saved !== undefined) return saved;
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  SLUGS.set(value, result);
  return result;
}
function annualFromTerms(minor: number, cadence: string): number | null {
  return annualizedRecordedPayMinor(minor, cadence);
}
function publicBodyOrganizations(
  facts: JobListingFacts,
  personId: EntityId,
): readonly EntityId[] {
  const units = homeLocalGovernmentUnits(facts, personId);
  const ids: EntityId[] = [];
  for (const unit of [...units.municipal, ...units.counties]) {
    const key = localGovernmentOrganizationKey(unit);
    const organization = facts.records.organizations.find(
      (record) => record.stableKey === key,
    );
    if (organization) ids.push(organization.id);
  }
  return ids;
}
function publicBodyRolePay(
  facts: JobListingFacts,
  organizationId: EntityId,
  jurisdictionId: EntityId,
): {
  annualMinor: number;
  currency: string;
  source: EmployerRole["source"];
} | null {
  const role = PUBLIC_BODY_ROLE_PROFILE;
  const offeredHours =
    (role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2;
  const cutoff = currentLifeCutoff(facts);
  for (const work of facts.records.workRelationships) {
    if (
      work.organizationId !== organizationId ||
      (work.compensation !== "paid" && work.compensation !== "mixed") ||
      work.startedAt > cutoff.asOfDate ||
      workStatusAt(facts, work.id, cutoff)?.status !== "active"
    )
      continue;
    const actualRole = workRoleAt(facts, work.id, cutoff);
    if (actualRole?.occupationClassification !== role.occupationClassification)
      continue;
    const pay = staffPay(facts, work);
    const hours = actualRole.timeDemand.expectedWeekly;
    const actualHours = (hours.minimumHours + hours.maximumHours) / 2;
    if (!pay || actualHours <= 0) continue;
    return {
      annualMinor: Math.round((pay.annualMinor * offeredHours) / actualHours),
      currency: pay.currency,
      source: "staff-pay",
    };
  }
  const annualMedian = stateMedianAnnualWage(
    facts,
    role.occupationClassification,
    jurisdictionId,
  );
  if (annualMedian === null) return null;
  return {
    annualMinor: Math.round((annualMedian * 100 * offeredHours) / 40),
    currency: "USD",
    source: "public-body-profile",
  };
}
export function townEmployerRoles(
  facts: JobListingFacts,
  personId: EntityId,
): readonly EmployerRole[] {
  const person = facts.people[personId];
  if (!person) return [];
  const home = person.homeJurisdictionId;
  const roles: EmployerRole[] = [];
  for (const organizationId of publicBodyOrganizations(facts, personId)) {
    const profile = organizationProfileAt(facts, organizationId);
    if (!profile?.locationJurisdictionId) continue;
    const role = PUBLIC_BODY_ROLE_PROFILE;
    const pay = publicBodyRolePay(
      facts,
      organizationId,
      profile.locationJurisdictionId,
    );
    if (!pay) continue;
    const population = playerTown(facts, personId);
    roles.push({
      key: `${organizationId}:${slug(role.title)}`,
      organizationId,
      jurisdictionId: profile.locationJurisdictionId,
      title: role.title,
      occupationClassification: role.occupationClassification,
      annualMinor: pay.annualMinor,
      currency: pay.currency,
      weeklyHours: role.weeklyHours,
      salaried: false,
      source: pay.source,
      holders:
        population !== null
          ? Math.max(
              1,
              Math.round(
                townRoster(population!).population *
                  JOB_TURNOVER.localGovernmentStaffPerResident,
              ),
            )
          : 1,
      lastHiredAt: null,
    });
  }
  const cutoff = currentLifeCutoff(facts);
  const byOrganization = new Map<EntityId, WorkRelationship[]>();
  for (const work of facts.records.workRelationships) {
    if (!work.organizationId || work.personId === personId) continue;
    if (!work.kind.startsWith("employment:")) continue;
    if (work.kind === JOB_MARKET_WORK_KIND) continue;
    const list = byOrganization.get(work.organizationId);
    if (list) list.push(work);
    else byOrganization.set(work.organizationId, [work]);
  }
  for (const organization of facts.records.organizations) {
    if (organization.stableKey.startsWith("production:earlier-life:")) continue;
    const staff = byOrganization.get(organization.id);
    if (!staff) continue;
    const profile = organizationProfileAt(facts, organization.id, cutoff);
    if (!profile || profile.locationJurisdictionId !== home) continue;
    if (!profile.classification.startsWith("enterprise:")) continue;
    const held = new Map<
      string,
      {
        holders: number;
        lastHiredAt: IsoDate;
      }
    >();
    for (const work of staff) {
      if (workStatusAt(facts, work.id, cutoff)?.status !== "active") continue;
      const role = activeRole(facts, work);
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
      if (workStatusAt(facts, work.id, cutoff)?.status !== "active") continue;
      const role = activeRole(facts, work);
      if (!role || seen.has(role.title)) continue;
      const pay = staffPay(facts, work);
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
// STOPGAP: economy.job-listing-history-frontier
function activeRole(facts: JobListingFacts, work: WorkRelationship) {
  const roles = facts.records.workRoles.filter(
    (role) => role.workRelationshipId === work.id,
  );
  return roles.at(-1) ?? null;
}
function staffPay(
  facts: JobListingFacts,
  work: WorkRelationship,
): {
  annualMinor: number;
  currency: string;
} | null {
  for (const flow of facts.records.resourceFlows) {
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
    const terms = resourceFlowTermsAt(facts, flow.id);
    if (!terms || terms.status === "ended") continue;
    const annual = annualFromTerms(terms.amount.minorUnits, terms.cadenceKind);
    if (annual === null || annual <= 0) continue;
    return { annualMinor: annual, currency: terms.amount.currency };
  }
  return null;
}
function weekIndex(date: IsoDate): number {
  return Math.floor(daysBetween(WEEK_EPOCH, date) / WEEK_DAYS);
}
export function applicationSteps(
  facts: JobListingFacts,
  applicationId: EntityId,
): readonly JobApplicationStepRecord[] {
  return (facts.records.jobApplicationSteps ?? []).filter(
    (row) => row.applicationId === applicationId,
  );
}
export function openingFilled(
  facts: JobListingFacts,
  openingId: EntityId,
): boolean {
  return (facts.records.jobApplications ?? []).some(
    (application) =>
      application.openingId === openingId &&
      applicationSteps(facts, application.id).some(
        (step) => step.kind === "started",
      ),
  );
}
export function openingTakesApplications(
  facts: JobListingFacts,
  opening: JobOpeningRecord,
): boolean {
  return (
    opening.opensAt <= facts.currentDate &&
    facts.currentDate <= opening.closesAt &&
    !openingFilled(facts, opening.id) &&
    !organizationClosingAt(facts, opening.organizationId)
  );
}
function roundTo(minor: number, step: number): number {
  return Math.max(step, Math.round(minor / step) * step);
}
function roleListings(
  facts: JobListingFacts,
  role: EmployerRole,
): readonly JobOpeningRecord[] {
  return (facts.records.jobOpenings ?? []).filter((opening) =>
    opening.stableKey.startsWith(`job-opening:${role.key}:`),
  );
}
function someoneLeft(
  facts: JobListingFacts,
  role: EmployerRole,
  since: IsoDate | null,
): boolean {
  for (const work of facts.records.workRelationships) {
    if (work.organizationId !== role.organizationId) continue;
    if (activeRole(facts, work)?.title !== role.title) continue;
    const status = workStatusAt(facts, work.id);
    if (status?.status !== "ended") continue;
    if (since === null || status.effectiveAt > since) return true;
  }
  return false;
}
// STOPGAP: economy.job-listing-turnover-offer-policy
function roleComesOpen(facts: JobListingFacts, role: EmployerRole): boolean {
  const listings = roleListings(facts, role);
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
  if (someoneLeft(facts, role, since)) return true;
  const organization = facts.records.organizations.find(
    (row) => row.id === role.organizationId,
  );
  if (
    listings.length === 0 &&
    organization &&
    daysBetween(organization.formedAt, facts.currentDate) <
      JOB_TURNOVER.newEmployerDays
  )
    return true;
  const weeksApart = Math.ceil(
    52 / (12 * JOB_TURNOVER.monthlySeparationRate * Math.max(1, role.holders)),
  );
  return daysBetween(since, facts.currentDate) >= weeksApart * WEEK_DAYS;
}
function offerTerms(
  facts: JobListingFacts,
  role: EmployerRole,
  minimumHourlyMinor: number,
): {
  pay: JobPayTerms;
  weeklyHours: {
    minimumHours: number;
    maximumHours: number;
  };
} {
  const last = [...roleListings(facts, role)]
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
    .at(-1);
  const wentUnfilled =
    last !== undefined &&
    last.closesAt < facts.currentDate &&
    !openingFilled(facts, last.id);
  const spread = wentUnfilled ? 1 + JOB_MARKET_TIMING_ESTIMATE.offerSpread : 1;
  const weeklyHours = role.weeklyHours;
  if (role.salaried) {
    return {
      pay: {
        basis: "annual-salary",
        amount: money(roundTo(role.annualMinor * spread, 50000), role.currency),
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
// STOPGAP: economy.job-listing-append-receipts
export function* openWeeklyListings(
  facts: JobListingFacts,
  personId: EntityId,
): Generator<JobListingRequest, JobListingFacts, JobListingFacts> {
  const week = weekIndex(facts.currentDate);
  let next = facts;
  for (const role of townEmployerRoles(facts, personId)) {
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
    const closesAt = addDays(
      next.currentDate,
      role.salaried
        ? JOB_TIMING.recruitmentWindowDays.maximum
        : Math.ceil(JOB_TIMING.recruitmentWindowDays.maximum / 2),
    );
    next = yield {
      kind: "appendJobOpening",
      input: {
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
              ? `Opening, answer and start timing are drawn from the estimated profile in job-market.ts. The role remains the public-body profile (research: ${PUBLIC_BODY_ROLE_PROFILE.researchQuestionId}). ESTIMATE FROM SOURCE: its vacant-role offer uses the BLS May 2025 OEWS occupation median for the recorded workplace's state or territory, with the source reader's national fallback where that cell is withheld (https://www.bls.gov/oes/); occupation ${role.occupationClassification}, workplace ${role.jurisdictionId}, annual base ${role.annualMinor} USD cents at the stated hours. Recorded employer pay replaces this estimate when read; this is not an observed employer pay scale.`
              : PROVENANCE_NOTE,
        },
      },
    };
  }
  return next;
}
function minimumHourlyMinorFor(
  facts: JobListingFacts,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number {
  return (
    minimumWageSettingAt(facts, jurisdictionId, onDate)?.hourlyMinor ??
    FEDERAL_MINIMUM_HOURLY_MINOR
  );
}
