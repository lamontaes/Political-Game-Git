import openingEmploymentData from "./data/opening-employment.json" with { type: "json" };
import residentData from "./data/resident-employment.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  daysBetween,
  isoDateFromParts,
} from "../simulation/dates";
import { createStableId, stableHash } from "../simulation/ids";
import { jailTermOn } from "../simulation/justice/jail-terms";
import { organizationProfileAt } from "../simulation/life-queries";
import {
  activeWorkers,
  laborStatus,
  TOWN_MEDIAN_TENURE_BY_AGE,
  TOWN_WORKPLACES,
  townEmploymentMix,
  townResidents,
  townWorkplaceFor,
  townWorkplaceWeights,
  type Role,
  type Workplace,
} from "../simulation/living-world/town-employment";
import { TOWN_EMPLOYMENT_META } from "../simulation/living-world/town-employment.generated";
import {
  nationalMedianAnnualWage,
  townJobRate,
  townPayPercentile,
  weeklyHoursOf,
} from "../simulation/living-world/town-pay";
import { TOWN_PAY_META } from "../simulation/living-world/town-pay.generated";
import type {
  EntityId,
  IsoDate as WorldDate,
  Organization,
  World,
  WorkRelationship,
  WorkRoleRecord,
} from "../simulation/types";
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { JobInput, Source } from "./types";

function estimatedSource(
  asOf: string,
  citation: string,
  estimatedFrom: string,
): Source {
  return { tag: "ESTIMATED", asOf, citation, estimatedFrom };
}
function yearsBefore(date: WorldDate, years: number): WorldDate {
  const [year, month, day] = date.split("-").map(Number);
  try {
    return isoDateFromParts(year! - years, month!, day!);
  } catch {
    return isoDateFromParts(year! - years, month!, day! - p("one"));
  }
}
export interface EmploymentAgeRow {
  id: string;
  minimumAgeParameter: string;
  maximumAgeParameter?: string;
  nationalPopulationParameter?: string;
  nationalEmployedParameter?: string;
}
export interface ResidentEmploymentData {
  nationalAgeRows: readonly EmploymentAgeRow[];
  countyAgeRows: readonly EmploymentAgeRow[];
  countyCounts: Readonly<
    Record<
      string,
      Readonly<
        Record<
          string,
          {
            civilianPopulation?: string;
            residentPopulation?: string;
            employed: string;
            denominatorKind?: string;
          }
        >
      >
    >
  >;
  missingCountyScaleParameter: string;
  stopgapId: string;
  source: { citation: string; asOf: string };
  countySource: { citation: string; asOf: string };
  countySources?: Readonly<Record<string, { citation: string; asOf: string }>>;
}
export const DEFAULT_RESIDENT_EMPLOYMENT: ResidentEmploymentData = residentData;
const inAgeRow = (age: number, row: EmploymentAgeRow) =>
  age >= p(row.minimumAgeParameter) &&
  (!row.maximumAgeParameter || age < p(row.maximumAgeParameter));

/** Estimate rows never create an individual labor status or a future hire decision. */
export function residentEmploymentRate(
  age: number,
  countyGeoid: string | undefined,
  data: ResidentEmploymentData = DEFAULT_RESIDENT_EMPLOYMENT,
): { rate: number; basis: string; ageId: string; source: string } | undefined {
  const local = data.countyAgeRows.find((row) => inAgeRow(age, row));
  const cells =
    local && countyGeoid
      ? data.countyCounts[countyGeoid]?.[local.id]
      : undefined;
  if (cells) {
    const denominator = cells.civilianPopulation ?? cells.residentPopulation;
    const civilian = denominator === undefined ? NaN : Number(denominator),
      employed = Number(cells.employed);
    if (
      [civilian, employed].every(
        (value) => Number.isSafeInteger(value) && value >= p("zero"),
      ) &&
      civilian > p("zero") &&
      employed <= civilian
    )
      return {
        rate: employed / civilian,
        basis:
          cells.civilianPopulation !== undefined
            ? "county-ACS-civilian-age"
            : "county-ACS-resident-age-armed-detail-not-reported",
        ageId: local!.id,
        source:
          (countyGeoid
            ? data.countySources?.[countyGeoid]?.citation
            : undefined) ?? data.countySource.citation,
      };
  }
  const row = data.nationalAgeRows.find((entry) => inAgeRow(age, entry));
  if (!row?.nationalPopulationParameter || !row.nationalEmployedParameter)
    return undefined;
  stopgap("SG-P8-resident-employment-proxy");
  if (data.stopgapId !== "SG-P8-resident-employment-proxy")
    stopgap(data.stopgapId);
  const population = p(row.nationalPopulationParameter),
    employed = p(row.nationalEmployedParameter);
  if (population <= p("zero") || employed < p("zero") || employed > population)
    throw new Error("Invalid resident employment source counts.");
  const scale = p(data.missingCountyScaleParameter);
  if (!Number.isFinite(scale) || scale < p("zero"))
    throw new Error("Invalid resident employment proxy scale.");
  return {
    rate: Math.min(p("one"), (employed / population) * scale),
    basis: "national-CPS-age-with-tunable-missing-county-scale",
    ageId: row.id,
    source: data.source.citation,
  };
}

export interface OpeningEmploymentData {
  version: string;
  stopgapId: string;
  expandableEmployerPrefixes: readonly string[];
  supportedOccupations: readonly string[];
  source: {
    citations: readonly string[];
    estimatedFrom: string;
  };
}

interface OpeningWorkTemplate {
  organization: Organization;
  workplace: Workplace;
  relationship: WorkRelationship;
  role: WorkRoleRecord;
  definition: Role;
}

interface OpeningRoleTarget {
  key: string;
  definition: Role;
  sourceWeight: number;
  target: number;
  recorded: number;
  added: number;
  templates: readonly OpeningWorkTemplate[];
}

export interface OpeningEmploymentAllocation {
  jobs: readonly JobInput[];
  startedAtByJob: ReadonlyMap<string, WorldDate>;
  templateJobIdByJob: ReadonlyMap<string, string>;
  receipt: {
    tag: "ESTIMATED";
    version: string;
    basis: string;
    denominator: string;
    employmentTarget: number;
    residentSourceCohort: number;
    canonicalMatchingEligibleSupply: number;
    recordedActiveEligibleWorkers: number;
    unassignedCandidates: number;
    addedJobs: number;
    sourceWeight: number;
    supportedSourceWeight: number;
    omitted: readonly { key: string; sourceWeight: number; reason: string }[];
    ageTargets: readonly {
      key: string;
      residents: number;
      rate: number;
      target: number;
      recorded: number;
      added: number;
      remaining: number;
      basis: string;
      source: string;
    }[];
    targets: readonly {
      key: string;
      target: number;
      recorded: number;
      added: number;
      remaining: number;
    }[];
  };
}

/**
 * Opening generation only. Existing work/family/entity records never change.
 * Fixed cohort targets cannot stall on an unavailable sector. Source weights
 * describe workplace stock; their application to residents and firm staffing
 * remains an explicit estimate. This produces no future application or hire.
 */
export function openingEmploymentFromRecordedRoles(
  world: World,
  town: EntityId,
  seed: string,
  data: OpeningEmploymentData = openingEmploymentData,
  countyGeoidByPerson: ReadonlyMap<string, string> = new Map(),
  rateData: ResidentEmploymentData = DEFAULT_RESIDENT_EMPLOYMENT,
): OpeningEmploymentAllocation {
  stopgap("SG-P8-opening-employment");
  if (data.stopgapId !== "SG-P8-opening-employment") stopgap(data.stopgapId);
  const residents = townResidents(world, town);
  const employed = activeWorkers(world);
  const recordedPeople = new Set(
    world.history.workRelationships.map((row) => row.personId),
  );
  const candidates = residents
    .filter(
      (resident) =>
        !recordedPeople.has(resident.personId) &&
        !jailTermOn(world, resident.personId) &&
        laborStatus(world, resident) === "employed",
    )
    .map((resident) => ({
      ...resident,
      order: stableHash(`${data.version}:${seed}:${resident.personId}`),
    }))
    .sort(
      (left, right) =>
        left.order.localeCompare(right.order) ||
        left.personId.localeCompare(right.personId),
    );
  const recordedActiveEligibleWorkers = residents.filter((resident) =>
    employed.has(resident.personId),
  ).length;
  // All generated residents in the source age bins form the denominator. Known
  // school/care/jail constraints restrict candidate supply, not this denominator.
  const residentRows = world.personOrder.map((personId) => ({
    personId,
    age: ageOnDate(world.people[personId]!.birthDate, world.currentDate),
  }));
  const ageTargets = new Map<
    string,
    {
      key: string;
      residents: number;
      rate: number;
      target: number;
      recorded: number;
      added: number;
      basis: string;
      source: string;
    }
  >();
  const quotaByPerson = new Map<string, string>();
  for (const resident of residentRows) {
    const county = countyGeoidByPerson.get(resident.personId);
    const rate = residentEmploymentRate(resident.age, county, rateData);
    if (!rate) continue;
    const key = `${county ?? "missing-county"}:${rate.ageId}`;
    const row = ageTargets.get(key) ?? {
      key,
      residents: p("zero"),
      rate: rate.rate,
      target: p("zero"),
      recorded: p("zero"),
      added: p("zero"),
      basis: rate.basis,
      source: rate.source,
    };
    row.residents += p("one");
    if (employed.has(resident.personId)) row.recorded += p("one");
    ageTargets.set(key, row);
    quotaByPerson.set(resident.personId, key);
  }
  let employmentTarget = p("zero");
  for (const row of ageTargets.values()) {
    row.target = Math.floor(row.residents * row.rate);
    employmentTarget += row.target;
  }

  const weights = townWorkplaceWeights(town);
  const sourceWeight = [...weights.values()].reduce(
    (sum, value) => sum + Math.max(p("zero"), value),
    p("zero"),
  );
  const supported = new Set<string>(data.supportedOccupations);
  const employers = new Map<
    EntityId,
    { organization: Organization; workplace: Workplace }
  >();
  for (const organization of world.history.organizations) {
    const profile = organizationProfileAt(world, organization.id);
    if (!profile || profile.closed || profile.locationJurisdictionId !== town)
      continue;
    const workplace = townWorkplaceFor(
      organization.stableKey,
      profile.classification,
    );
    if (workplace) employers.set(organization.id, { organization, workplace });
  }
  const roles = new Map<EntityId, WorkRoleRecord>();
  for (const role of world.history.workRoles)
    if (role.effectiveAt <= world.currentDate)
      roles.set(role.workRelationshipId, role);
  const statuses = new Map<EntityId, string>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= world.currentDate)
      statuses.set(status.workRelationshipId, status.status);
  const roleKey = (workplace: Workplace, definition: Role) =>
    `${workplace.key}:${definition.occupation}:${definition.title}`;
  const templates = new Map<string, OpeningWorkTemplate[]>();
  const recorded = new Map<string, number>();
  const staff = new Map<EntityId, number>();
  for (const relationship of world.history.workRelationships) {
    if (
      !relationship.organizationId ||
      relationship.startedAt > world.currentDate ||
      statuses.get(relationship.id) !== "active"
    )
      continue;
    staff.set(
      relationship.organizationId,
      (staff.get(relationship.organizationId) ?? p("zero")) + p("one"),
    );
    const employer = employers.get(relationship.organizationId);
    const role = roles.get(relationship.id);
    if (!employer || !role || role.locationJurisdictionId !== town) continue;
    const definition = employer.workplace.roles.find(
      (entry) =>
        entry.occupation === role.occupationClassification &&
        entry.title === role.title,
    );
    if (!definition) continue;
    const key = roleKey(employer.workplace, definition);
    recorded.set(key, (recorded.get(key) ?? p("zero")) + p("one"));
    if (
      relationship.compensation !== "paid" ||
      relationship.kind !== employer.workplace.kind ||
      relationship.authority === "directs-others" ||
      weeklyHoursOf(role) <= p("zero")
    )
      continue;
    const rows = templates.get(key) ?? [];
    rows.push({ ...employer, relationship, role, definition });
    templates.set(key, rows);
  }
  const targets: OpeningRoleTarget[] = [];
  const omitted: { key: string; sourceWeight: number; reason: string }[] = [];
  let supportedSourceWeight = p("zero");
  for (const [key, weight] of weights) {
    if (weight <= p("zero")) continue;
    const workplace = TOWN_WORKPLACES.find((row) => row.key === key);
    const positiveRoles =
      workplace?.roles.filter((role) => role.weight > p("zero")) ?? [];
    const roleWeight = positiveRoles.reduce(
      (sum, role) => sum + role.weight,
      p("zero"),
    );
    if (!workplace || roleWeight <= p("zero")) {
      omitted.push({
        key,
        sourceWeight: weight,
        reason: "No represented positive-weight role definition.",
      });
      continue;
    }
    const hasEmployer = [...employers.values()].some(
      (row) => row.workplace.key === key,
    );
    const expandable = data.expandableEmployerPrefixes.some((prefix) =>
      workplace.classification.startsWith(prefix),
    );
    for (const definition of positiveRoles) {
      const key = roleKey(workplace, definition);
      const amount = (weight * definition.weight) / roleWeight;
      const rows = templates.get(key) ?? [];
      const localRate = townJobRate(
        definition.occupation,
        town,
        townPayPercentile(p("zero")),
      );
      const nationalAnnual = nationalMedianAnnualWage(definition.occupation);
      const reason = !hasEmployer
        ? "No recorded employer identity."
        : !expandable
          ? "Public/institutional staffing requires a source-backed position and funding."
          : definition.authority === "directs-others" ||
              !supported.has(definition.occupation)
            ? "Singleton, management, qualification or role-support assumption not supplied."
            : rows.length === p("zero")
              ? "No compatible recorded employee role to reuse."
              : !localRate &&
                  !(nationalAnnual !== null && nationalAnnual > p("zero"))
                ? "No same-occupation SOC wage reference; generic pay fallback excluded."
                : undefined;
      if (reason) {
        omitted.push({ key, sourceWeight: amount, reason });
        continue;
      }
      supportedSourceWeight += amount;
      targets.push({
        key,
        definition,
        sourceWeight: amount,
        target:
          sourceWeight > p("zero")
            ? Math.floor((employmentTarget * amount) / sourceWeight)
            : p("zero"),
        recorded: recorded.get(key) ?? p("zero"),
        added: p("zero"),
        templates: rows.sort((left, right) =>
          left.role.id.localeCompare(right.role.id),
        ),
      });
    }
  }
  const jobs: JobInput[] = [];
  const startedAtByJob = new Map<string, WorldDate>();
  const templateJobIdByJob = new Map<string, string>();
  for (const resident of candidates) {
    const quotaKey = quotaByPerson.get(resident.personId);
    const quota = quotaKey ? ageTargets.get(quotaKey) : undefined;
    if (!quota || quota.recorded + quota.added >= quota.target) continue;
    let selected: OpeningRoleTarget | undefined;
    for (const target of targets) {
      if (
        resident.age <
        (target.definition.minAge ?? p("employment-age-18-minimumAge"))
      )
        continue;
      const deficit = target.target - target.recorded - target.added;
      if (deficit <= p("zero")) continue;
      const selectedDeficit = selected
        ? selected.target - selected.recorded - selected.added
        : p("zero");
      if (
        !selected ||
        deficit > selectedDeficit ||
        (deficit === selectedDeficit && target.key < selected.key)
      )
        selected = target;
    }
    if (!selected) continue;
    const template = [...selected.templates].sort(
      (left, right) =>
        (staff.get(left.organization.id) ?? p("zero")) -
          (staff.get(right.organization.id) ?? p("zero")) ||
        left.role.id.localeCompare(right.role.id),
    )[p("zero")]!;
    const person = world.people[resident.personId]!;
    const adultSince = yearsBefore(
      person.birthDate,
      -(selected.definition.minAge ?? p("employment-age-18-minimumAge")),
    );
    const tenureRow = TOWN_MEDIAN_TENURE_BY_AGE.find(
      ([below]) => resident.age < below,
    );
    const tenureYears = tenureRow?.[p("one")] ?? p("zero");
    const estimatedStart = addDays(
      world.currentDate,
      -Math.round(tenureYears * p("daysPerMeanYear")),
    );
    const startedAt = [
      adultSince,
      estimatedStart,
      template.organization.formedAt,
    ]
      .sort()
      .at(-p("one"))!;
    const percentile = townPayPercentile(
      daysBetween(startedAt, world.currentDate) / p("daysPerMeanYear"),
    );
    const rate = townJobRate(selected.definition.occupation, town, percentile);
    const nationalAnnual = nationalMedianAnnualWage(
      selected.definition.occupation,
    );
    if (!rate && nationalAnnual === null)
      throw new Error(
        `Opening role lost its supported SOC wage: ${selected.key}`,
      );
    const hourlyMinor =
      rate?.hourlyMinor ??
      (nationalAnnual! * p("minorPerDollar")) / p("annualWorkHours");
    const hoursDaily = weeklyHoursOf(template.role) / p("daysPerWeek");
    const id = createStableId(
      "work-relationship",
      `${world.id}:${data.version}:${resident.personId}`,
    );
    jobs.push({
      id,
      personId: resident.personId,
      organizationId: template.organization.id,
      title: template.role.title,
      occupationClassification: selected.definition.occupation,
      hoursDaily,
      wageDailyMinor: Math.round(hourlyMinor * hoursDaily),
      hourlyMinor: Math.round(hourlyMinor),
      source: estimatedSource(
        world.currentDate,
        `${TOWN_EMPLOYMENT_META.countyBusinessPatterns.source} ${TOWN_EMPLOYMENT_META.publicEmployment.source} ${TOWN_PAY_META.wages} ${data.source.citations.join("; ")} ${quota.source}`,
        `${data.source.estimatedFrom} Role template ${template.role.id}, employer ${template.organization.id}; cohort target ${selected.target} for ${selected.key}. ${rate ? `SOC ${rate.soc}, area ${rate.area}, percentile ${rate.percentile}` : "National same-occupation median proxy; no local wage measurement"}. Hours retain the recorded role estimate. BLS age-cohort median tenure is bounded by adulthood and recorded employer formation; start ${startedAt}. Initial generated assignment, not an application, offered vacancy, acceptance or future hiring decision.`,
      ),
    });
    startedAtByJob.set(id, startedAt);
    templateJobIdByJob.set(id, template.relationship.id);
    selected.added += p("one");
    quota.added += p("one");
    staff.set(
      template.organization.id,
      (staff.get(template.organization.id) ?? p("zero")) + p("one"),
    );
  }
  return {
    jobs,
    startedAtByJob,
    templateJobIdByJob,
    receipt: {
      tag: "ESTIMATED",
      version: data.version,
      basis: townEmploymentMix(town).basis,
      denominator:
        "Generated resident age cohorts times supplied ACS employed/civilian-age population where Armed Forces detail exists; ACS older bins use reported age population with that limitation. Missing county cells use national CPS employed/civilian-noninstitutional population times a tunable scale. The generated denominator is an initialization proxy, not observed local employment or inferred unemployment.",
      employmentTarget,
      residentSourceCohort: [...ageTargets.values()].reduce(
        (sum, row) => sum + row.residents,
        p("zero"),
      ),
      canonicalMatchingEligibleSupply:
        recordedActiveEligibleWorkers + candidates.length,
      recordedActiveEligibleWorkers,
      unassignedCandidates: candidates.length - jobs.length,
      addedJobs: jobs.length,
      sourceWeight,
      supportedSourceWeight,
      omitted,
      ageTargets: [...ageTargets.values()].map((row) => ({
        ...row,
        remaining: Math.max(p("zero"), row.target - row.recorded - row.added),
      })),
      targets: targets.map((target) => ({
        key: target.key,
        target: target.target,
        recorded: target.recorded,
        added: target.added,
        remaining: Math.max(
          p("zero"),
          target.target - target.recorded - target.added,
        ),
      })),
    },
  };
}
