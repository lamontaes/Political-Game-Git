/**
 * The jobs of the player's town at the opening.
 *
 * Every working-age resident the opening wrote out is given a place in the
 * town's labor force, once: most hold a recorded job (a work relationship and
 * a role with a title, an occupation, a workplace and weekly hours), written
 * into the opening's draft (`opening-draft.ts`). Nobody the player meets as a
 * clerk, a pastor or a nurse is a clerk, pastor or nurse only in a sentence.
 *
 * Ported from the old engine's `town-employment.ts` as the opening used it:
 * one fill, at the opening date, with no player, no closed business, no
 * budget-staffed role, no sentence and no business books to read, because
 * none of those exist before the first day is played. The ids, the hiring
 * order, the role choice and the hours are derived as the old fill derived
 * them, so a town built before and after this port holds the same jobs by
 * record id. Played-world hiring is the jobs module's (`modules/jobs.ts`).
 *
 * What is sourced and what is not:
 *
 * - The mix of industries is the town's own county's, from the Census 2023
 *   County Business Patterns (private employers), blended across the counties
 *   a town spans by land area. Public employment is the home state's, from the
 *   BLS May 2025 state ownership research estimates, scaled against the
 *   state's total employment (`reference/town-employment.generated.ts`,
 *   through `town-employment-mix.ts`).
 * - Which workplaces and job titles stand for each industry and how many
 *   outlets of each a town has are GAME ASSUMPTIONS (`town-workplaces.ts`),
 *   until a researched occupation-by-industry table replaces them.
 */
import {
  businessName,
  businessNameContext,
  countyDisplayName,
} from "./business-names";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import type { EntityId, IsoDate } from "./kernel/brands";
import {
  draftOrganizationProfiles,
  takeSequence,
  type DraftGovernmentOrganization,
  type DraftOrganization,
  type DraftOrganizationProfile,
  type DraftProvenance,
  type DraftPublicGovernmentIdentity,
  type DraftTimeDemand,
  type DraftWorkRelationship,
  type DraftWorkRole,
  type DraftWorkStatus,
  type OpeningDraft,
} from "./opening-draft";
import { countyGovernmentUnitsForPlace } from "./reference/government-units";
import {
  localInstitutionProvenance,
  localInstitutionsFor,
  type LocalInstitutionRow,
} from "./reference/local-institutions";
import { townWorkplaceWeights } from "./town-employment-mix";
import { parameter as p } from "./parameters";
import {
  TOWN_MEDIAN_TENURE_BY_AGE,
  TOWN_PART_TIME_DEFAULT,
  TOWN_PART_TIME_SHARE,
  TOWN_WORKPLACE_BY_KEY,
  TOWN_WORKPLACES,
  type OrganizationClassification,
  type Role,
  type Workplace,
} from "./town-workplaces";

export const TOWN_EMPLOYMENT_VERSION = "town-employment-v1";

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_EMPLOYMENT_VERSION,
};

const ESTIMATED_EMPLOYER_NAME_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: `${TOWN_EMPLOYMENT_VERSION}:founder-family-name`,
};

/** The youngest and oldest ages the town's jobs are filled for. */
export const WORKING_AGE_MIN = p("childUpperAge");
const WORKING_AGE_MAX = p("townJobsOldestHireAge");

const FULL_TIME_HOURS = [
  p("fullTimeWeeklyHours"),
  p("townJobsFullTimeMaximumWeeklyHours"),
] as const;
const PART_TIME_HOURS = [
  p("townJobsPartTimeMinimumWeeklyHours"),
  p("townJobsPartTimeMaximumWeeklyHours"),
] as const;

function medianTenureYears(age: number): number {
  return TOWN_MEDIAN_TENURE_BY_AGE.find(([below]) => age < below)![1];
}

/**
 * Roles every seated town has someone in, whatever the draw: the people a
 * player's political life runs through. One per listed workplace; a workplace
 * hired into its existing organizations (schools, congregations, party
 * chapters) gets one per organization.
 */
const CIVIC_MINIMUM: readonly (readonly [string, string])[] = [
  ["city-hall", "City clerk"],
  ["county-clerk", "County clerk"],
  ["city-hall", "City planner"],
  ["public-school", "Principal"],
  ["public-school", "Teacher"],
  ["congregation", "Pastor"],
  ["organizing", "Community organizer"],
  ["union", "Union representative"],
  ["hospital", "Registered nurse"],
  ["clinic", "Nurse"],
  ["police", "Police officer"],
  ["fire", "Firefighter"],
  // Every town keeps its roads up; the department is small and the mix
  // alone leaves some towns without one.
  ["public-works", "Maintenance worker"],
  ["party-office", "Party office manager"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign manager"],
];

/* -------------------------------------------------------------------------- */
/* Residents                                                                  */
/* -------------------------------------------------------------------------- */

export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}

/**
 * The town's written working-age residents, with what their hours need. At
 * the opening nobody is enrolled (schooling is written by play), so only a
 * partnered parent of a child under six is marked.
 */
export function townResidents(
  draft: OpeningDraft,
  town: EntityId,
): readonly Resident[] {
  const householdOf = new Map<EntityId, EntityId[]>();
  for (const membership of draft.history.householdMemberships) {
    const list = householdOf.get(membership.householdId) ?? [];
    list.push(membership.personId);
    householdOf.set(membership.householdId, list);
  }
  const youngChildHouseholds = new Set<EntityId>();
  const partnered = new Set(
    draft.history.partnerships.flatMap((row) => row.personIds),
  );
  const householdsOf = new Map<EntityId, EntityId[]>();
  for (const [household, members] of householdOf)
    for (const member of members) {
      const person = draft.people[member];
      if (
        person &&
        ageOnDate(person.birthDate, draft.currentDate) <
          p("townJobsYoungChildAge")
      )
        youngChildHouseholds.add(household);
      const list = householdsOf.get(member) ?? [];
      list.push(household);
      householdsOf.set(member, list);
    }
  const residents: Resident[] = [];
  for (const personId of draft.personOrder) {
    const person = draft.people[personId];
    if (!person || person.homeJurisdictionId !== town) continue;
    const age = ageOnDate(person.birthDate, draft.currentDate);
    if (age < WORKING_AGE_MIN || age > WORKING_AGE_MAX) continue;
    residents.push({
      personId,
      age,
      enrolled: false,
      parentOfYoungChild:
        partnered.has(personId) &&
        (householdsOf.get(personId) ?? []).some((household) =>
          youngChildHouseholds.has(household),
        ),
    });
  }
  return residents;
}

/** Everyone with a job whose latest status today is active. */
export function activeWorkers(draft: OpeningDraft): ReadonlySet<EntityId> {
  const personOf = new Map(
    draft.history.workRelationships.map((row) => [row.id, row.personId]),
  );
  const latest = new Map<EntityId, string>();
  for (const row of draft.history.workStatuses)
    if (row.effectiveAt <= draft.currentDate)
      latest.set(row.workRelationshipId, row.status);
  const working = new Set<EntityId>();
  for (const [relationshipId, status] of latest)
    if (status === "active") working.add(personOf.get(relationshipId)!);
  return working;
}

/* -------------------------------------------------------------------------- */
/* Writers                                                                    */
/* -------------------------------------------------------------------------- */

interface CreateOrganizationInput {
  readonly stableKey: string;
  readonly formedAt: IsoDate;
  readonly provenance: DraftProvenance;
  readonly initialProfile: {
    readonly name: string;
    readonly classification: OrganizationClassification;
    readonly locationJurisdictionId: EntityId;
    readonly publicGovernmentIdentity?: DraftPublicGovernmentIdentity;
  };
}

/** One organization and its first profile, as the old writer appended them. */
function createOrganization(
  draft: OpeningDraft,
  input: CreateOrganizationInput,
): void {
  if (
    draft.history.organizations.some((row) => row.stableKey === input.stableKey)
  )
    throw new Error(
      `organization stable key already exists: ${input.stableKey}`,
    );
  const organization: DraftOrganization = {
    id: createStableId("organization", `${draft.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: takeSequence(draft),
    formedAt: input.formedAt,
    detailLevel: "lightweight",
    provenance: input.provenance,
  };
  const profileStableKey = `${input.stableKey}:profile:initial`;
  const profile: DraftOrganizationProfile = {
    id: createStableId(
      "organization-profile",
      `${draft.id}:${profileStableKey}`,
    ),
    stableKey: profileStableKey,
    sequence: takeSequence(draft),
    organizationId: organization.id,
    effectiveAt: input.formedAt,
    name: input.initialProfile.name,
    classification: input.initialProfile.classification,
    locationJurisdictionId: input.initialProfile.locationJurisdictionId,
    ...(input.initialProfile.publicGovernmentIdentity === undefined
      ? {}
      : {
          publicGovernmentIdentity: {
            ...input.initialProfile.publicGovernmentIdentity,
          },
        }),
    provenance: input.provenance,
    supersedesProfileId: null,
  };
  draft.history.organizations.push(organization);
  draft.history.organizationProfiles.push(profile);
}

interface CreateWorkRelationshipInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  readonly startedAt: IsoDate;
  readonly kind: DraftWorkRelationship["kind"];
  readonly compensation: "paid";
  readonly authority: DraftWorkRelationship["authority"];
  readonly dependency: "dependent";
  readonly economicRisk: "organization-borne";
  readonly initialRole: {
    readonly title: string;
    readonly occupationClassification: DraftWorkRole["occupationClassification"];
    readonly locationJurisdictionId: EntityId;
    readonly timeDemand: DraftTimeDemand;
  };
}

/** Work relationships, their first status and role, as the old writer appended them. */
function createWorkRelationships(
  draft: OpeningDraft,
  inputs: readonly CreateWorkRelationshipInput[],
): void {
  const existingKeys = new Set(
    draft.history.workRelationships.map((record) => record.stableKey),
  );
  const recordedAt = draft.currentDate;
  for (const input of inputs) {
    if (existingKeys.has(input.stableKey))
      throw new Error(
        `work relationship stable key already exists: ${input.stableKey}`,
      );
    const person = draft.people[input.personId];
    if (!person) throw new Error(`No person ${input.personId} exists.`);
    const startedAt = makeIsoDate(input.startedAt);
    if (startedAt < person.birthDate)
      throw new Error("A work relationship cannot predate the person.");
    if (startedAt > recordedAt)
      throw new Error("Active work cannot start in the future.");
    const relationship: DraftWorkRelationship = {
      id: createStableId("work-relationship", `${draft.id}:${input.stableKey}`),
      stableKey: input.stableKey,
      sequence: takeSequence(draft),
      personId: person.id,
      organizationId: input.organizationId,
      recordedAt,
      startedAt,
      kind: input.kind,
      compensation: input.compensation,
      authority: input.authority,
      dependency: input.dependency,
      economicRisk: input.economicRisk,
      provenance: PROVENANCE,
    };
    const statusKey = `${input.stableKey}:status:initial`;
    const status: DraftWorkStatus = {
      id: createStableId("work-status", `${draft.id}:${statusKey}`),
      stableKey: statusKey,
      sequence: takeSequence(draft),
      workRelationshipId: relationship.id,
      effectiveAt: startedAt,
      status: "active",
      reason: null,
      provenance: PROVENANCE,
      supersedesStatusId: null,
    };
    const roleKey = `${input.stableKey}:role:initial`;
    const role: DraftWorkRole = {
      id: createStableId("work-role", `${draft.id}:${roleKey}`),
      stableKey: roleKey,
      sequence: takeSequence(draft),
      workRelationshipId: relationship.id,
      effectiveAt: startedAt,
      title: input.initialRole.title,
      occupationClassification: input.initialRole.occupationClassification,
      locationJurisdictionId: input.initialRole.locationJurisdictionId,
      timeDemand: { ...input.initialRole.timeDemand },
      provenance: PROVENANCE,
      supersedesRoleId: null,
    };
    draft.history.workRelationships.push(relationship);
    draft.history.workStatuses.push(status);
    draft.history.workRoles.push(role);
    existingKeys.add(input.stableKey);
  }
}

/** The town's governments the opening can write as organizations (`gov-rules/local-governments.ts`). */
export interface TownGovernments {
  readonly municipal: DraftGovernmentOrganization | null;
  readonly county: DraftGovernmentOrganization | null;
}

/** One recorded government written into the draft, once. */
function writeGovernmentOrganization(
  draft: OpeningDraft,
  government: DraftGovernmentOrganization,
): void {
  if (
    draft.history.organizations.some(
      (row) => row.stableKey === government.stableKey,
    )
  )
    return;
  createOrganization(draft, {
    stableKey: government.stableKey,
    formedAt: government.formedAt,
    provenance: government.provenance,
    initialProfile: {
      name: government.name,
      classification: government.classification,
      locationJurisdictionId: government.locationJurisdictionId,
      ...(government.publicGovernmentIdentity
        ? { publicGovernmentIdentity: government.publicGovernmentIdentity }
        : {}),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Employers                                                                  */
/* -------------------------------------------------------------------------- */

/** Public facilities get a real source name, or they do not enter the world. */
function sourcedTownInstitution(
  town: EntityId,
  key: string,
): LocalInstitutionRow | undefined {
  const institutions = localInstitutionsFor(town);
  if (key === "bank") return institutions.banks[0];
  if (key === "hospital")
    return institutions.hospitals.find((row) => row.kind === "hospital");
  if (key === "clinic")
    return institutions.hospitals.find((row) => row.kind === "clinic");
  return undefined;
}

/**
 * Write one employer, outlet `outlet` of `workplace`. A bank, a hospital, a
 * clinic or a school district carries its source record's name; any other
 * employer is named as play names a new business (`business-names.ts`, read
 * by `modules/business.ts`): its founder's family, here the resident whose
 * hire opens it, in the first of its kind's name styles that no employer in
 * town already carries. Nothing is drawn. Writing one already written changes
 * nothing.
 */
function writeTownEmployer(
  draft: OpeningDraft,
  town: EntityId,
  workplace: Workplace,
  outlet: number,
  formedAt: IsoDate,
  founderPersonId: EntityId,
): void {
  const stableKey = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:${outlet}`;
  const id = createStableId("organization", `${draft.id}:${stableKey}`);
  if (draft.history.organizations.some((row) => row.id === id)) return;
  const institutions = localInstitutionsFor(town);
  const institution =
    sourcedTownInstitution(town, workplace.key) ??
    (workplace.key === "public-school"
      ? institutions.largeEmployers.find(
          (row) => row.kind === "school-district",
        )
      : undefined);
  if (
    (workplace.key === "bank" ||
      workplace.key === "hospital" ||
      workplace.key === "clinic") &&
    !institution
  )
    return;
  const founder = draft.people[founderPersonId]!;
  const profiles = draftOrganizationProfiles(draft);
  const taken = new Set(
    draft.history.organizations.flatMap((row) => {
      const profile = profiles.get(row.id);
      return profile?.locationJurisdictionId === town ? [profile.name] : [];
    }),
  );
  const name =
    institution?.name ??
    businessName(
      workplace.key,
      businessNameContext(town, founder.familyName),
      taken,
    ) ??
    founder.familyName;
  createOrganization(draft, {
    stableKey,
    formedAt,
    provenance: institution
      ? localInstitutionProvenance(institution, formedAt)
      : ESTIMATED_EMPLOYER_NAME_PROVENANCE,
    initialProfile: {
      name,
      classification: workplace.classification,
      locationJurisdictionId: town,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Filling the town's jobs                                                    */
/* -------------------------------------------------------------------------- */

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}

/**
 * Fill the town's jobs for every working-age resident written out who has no
 * job. Idempotent: a job written once is never written again. Every working
 * age resident is eligible at the opening: no enrollment, care record or
 * sentence exists before the first day is played.
 */
export function openingTownJobs(
  draft: OpeningDraft,
  town: { readonly id: EntityId; readonly sourceGeoid?: string },
  governments: TownGovernments,
): void {
  const working = new Set(
    draft.history.workRelationships.map((row) => row.personId),
  );
  const open = townResidents(draft, town.id).filter(
    (resident) => !working.has(resident.personId),
  );
  fillTownJobs(draft, town.id, town.sourceGeoid, governments, open);
}

/**
 * Hire these residents into the town's jobs: any civic role nobody holds
 * today first, then by the town's own mix. A hire is backdated as if they had
 * held the job for years (the age band's median tenure).
 */
function fillTownJobs(
  draft: OpeningDraft,
  town: EntityId,
  sourceGeoid: string | undefined,
  governments: TownGovernments,
  open: readonly Resident[],
): void {
  if (open.length === 0) return;
  const today = draft.currentDate;
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}`;
  const jobKey = (personId: EntityId) => `${prefix}:job:${personId}`;

  // The county government the town mostly lies in, when it has one.
  const countyUnit = sourceGeoid
    ? countyGovernmentUnitsForPlace(sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const weights = [...townWorkplaceWeights(town, draft.seed)].filter(
    ([, w]) => w > 0,
  );
  const organizations = new Map<string, EntityId>();
  const outletsOf = new Map<string, readonly number[]>();
  // The town's jobs today, counting the hires made here: staff and
  // part-time staff at each employer, staff and roles by kind of workplace,
  // and the kinds of work each resident has done in town before.
  interface Census {
    readonly staff: Map<EntityId, number>;
    readonly partTime: Map<EntityId, number>;
    readonly byKind: Map<string, number>;
    readonly byRole: Map<string, number>;
    readonly pastKinds: Map<EntityId, Set<string>>;
    readonly kindOf: Map<EntityId, string>;
    total: number;
  }
  let census: Census | null = null;
  const counted = (): Census => {
    if (census) return census;
    const kindOf = new Map<EntityId, string>();
    for (const organization of draft.history.organizations) {
      const match = /:employer:([a-z-]+):\d+$/.exec(organization.stableKey);
      if (match && organization.stableKey.startsWith(`${prefix}:`))
        kindOf.set(organization.id, match[1]!);
    }
    for (const workplace of TOWN_WORKPLACES)
      if (workplace.existing || workplace.governmentOffice)
        for (const id of existingOf(workplace))
          if (!kindOf.has(id)) kindOf.set(id, workplace.key);
    const orgOf = new Map<EntityId, EntityId>();
    const pastKinds = new Map<EntityId, Set<string>>();
    for (const row of draft.history.workRelationships) {
      if (!row.stableKey.startsWith(`${prefix}:job:`) || !row.organizationId)
        continue;
      orgOf.set(row.id, row.organizationId);
      const kind = kindOf.get(row.organizationId);
      if (kind) {
        const kinds = pastKinds.get(row.personId) ?? new Set<string>();
        kinds.add(kind);
        pastKinds.set(row.personId, kinds);
      }
    }
    const latest = new Map<EntityId, string>();
    for (const row of draft.history.workStatuses)
      if (orgOf.has(row.workRelationshipId) && row.effectiveAt <= today)
        latest.set(row.workRelationshipId, row.status);
    const roleOf = new Map<EntityId, DraftWorkRole>();
    for (const row of draft.history.workRoles)
      if (orgOf.has(row.workRelationshipId) && row.effectiveAt <= today)
        roleOf.set(row.workRelationshipId, row);
    census = {
      staff: new Map(),
      partTime: new Map(),
      byKind: new Map(),
      byRole: new Map(),
      pastKinds,
      kindOf,
      total: 0,
    };
    for (const [id, status] of latest) {
      if (status !== "active") continue;
      const role = roleOf.get(id);
      const hours = role?.timeDemand.expectedWeekly?.maximumHours;
      countHire(
        census,
        orgOf.get(id)!,
        role?.title ?? null,
        hours !== undefined && hours < FULL_TIME_HOURS[0],
      );
    }
    return census;
  };
  const countHire = (
    into: Census,
    organizationId: EntityId,
    title: string | null,
    partTime: boolean,
  ) => {
    into.staff.set(organizationId, (into.staff.get(organizationId) ?? 0) + 1);
    if (partTime)
      into.partTime.set(
        organizationId,
        (into.partTime.get(organizationId) ?? 0) + 1,
      );
    const kind = into.kindOf.get(organizationId);
    if (!kind) return;
    into.byKind.set(kind, (into.byKind.get(kind) ?? 0) + 1);
    if (title)
      into.byRole.set(
        `${kind}|${title}`,
        (into.byRole.get(`${kind}|${title}`) ?? 0) + 1,
      );
    into.total += 1;
  };
  const staffAt = (organizationId: EntityId): number =>
    counted().staff.get(organizationId) ?? 0;
  /**
   * The role a resident takes at a kind of workplace: of the roles they are
   * old enough for, the one furthest below its share of the kind's staff
   * in town, then by title. Nothing is drawn.
   */
  const roleFor = (
    workplace: Workplace,
    resident: Resident,
    roles: readonly Role[] = workplace.roles,
  ): Role | null => {
    const fits = roles.filter(
      (entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN),
    );
    const total = fits.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return null;
    const held = fits.reduce(
      (sum, entry) =>
        sum + (counted().byRole.get(`${workplace.key}|${entry.title}`) ?? 0),
      0,
    );
    const short = (entry: Role) =>
      (entry.weight / total) * (held + 1) -
      (counted().byRole.get(`${workplace.key}|${entry.title}`) ?? 0);
    return [...fits].sort(
      (a, b) => short(b) - short(a) || a.title.localeCompare(b.title),
    )[0]!;
  };
  const existing = new Map<string, readonly EntityId[]>();
  const existingOf = (workplace: Workplace) => {
    if (!workplace.existing && !workplace.governmentOffice) return [];
    let found = existing.get(workplace.key);
    if (!found) {
      if (workplace.governmentOffice) {
        // Written the first time a job there is filled.
        const government =
          workplace.governmentOffice === "county"
            ? governments.county
            : governments.municipal;
        if (government) writeGovernmentOrganization(draft, government);
        const organization = government
          ? draft.history.organizations.find(
              (row) => row.stableKey === government.stableKey,
            )
          : undefined;
        found = organization ? [organization.id] : [];
      } else {
        const profiles = draftOrganizationProfiles(draft);
        found = draft.history.organizations
          .filter((organization) => {
            const profile = profiles.get(organization.id);
            return (
              profile?.classification === workplace.existing &&
              profile?.locationJurisdictionId === town
            );
          })
          .map((organization) => organization.id);
      }
      existing.set(workplace.key, found);
    }
    return found;
  };

  /**
   * The employer a hire at `workplace` works for, or null when no employer
   * of that kind can be written: the least staffed of its existing
   * organizations, else the outlet with the fewest staff, lowest number
   * first (every outlet has room at the opening; the books are written by play).
   */
  const employer = (
    workplace: Workplace,
    founderPersonId: EntityId,
  ): EntityId | null => {
    if (
      (workplace.key === "bank" ||
        workplace.key === "hospital" ||
        workplace.key === "clinic") &&
      !sourcedTownInstitution(town, workplace.key)
    )
      return null;
    const already = existingOf(workplace);
    if (workplace.existing || workplace.governmentOffice)
      return already.length > 0
        ? [...already].sort(
            (a, b) => staffAt(a) - staffAt(b) || a.localeCompare(b),
          )[0]!
        : null;
    let outlets = outletsOf.get(workplace.key);
    if (!outlets) {
      outlets = Array.from({ length: workplace.outlets }, (_, n) => n);
      outletsOf.set(workplace.key, outlets);
    }
    if (outlets.length === 0) return null;
    let outlet: number | null = null;
    let fewest = Infinity;
    for (const candidate of outlets) {
      const key = `${prefix}:employer:${workplace.key}:${candidate}`;
      const id =
        organizations.get(key) ??
        createStableId("organization", `${draft.id}:${key}`);
      if (staffAt(id) >= fewest) continue;
      outlet = candidate;
      fewest = staffAt(id);
    }
    if (outlet === null) return null;
    const stableKey = `${prefix}:employer:${workplace.key}:${outlet}`;
    const cached = organizations.get(stableKey);
    if (cached) return cached;
    writeTownEmployer(draft, town, workplace, outlet, today, founderPersonId);
    const id = createStableId("organization", `${draft.id}:${stableKey}`);
    organizations.set(stableKey, id);
    return id;
  };

  const jobs: CreateWorkRelationshipInput[] = [];
  const hire = (
    resident: Resident,
    workplace: Workplace,
    chosen: Role,
    at?: EntityId,
    civic = false,
  ) => {
    const organizationId = at ?? employer(workplace, resident.personId);
    if (!organizationId) return false;
    const person = draft.people[resident.personId]!;
    const adultSince = yearsBefore(person.birthDate, -WORKING_AGE_MIN);
    const hired = addDays(
      today,
      -Math.round(medianTenureYears(resident.age) * p("julianYearDays")),
    );
    // A civic role and a job that directs others are never part-time.
    // Otherwise the hire works part-time when their own life asks for fewer
    // hours, or while the employer's part-time staff are below its share.
    const staff = staffAt(organizationId);
    const partTime =
      !civic &&
      chosen.authority !== "directs-others" &&
      (resident.enrolled ||
        resident.parentOfYoungChild ||
        resident.age >= p("openingPartTimeOlderWorkerAge") ||
        (counted().partTime.get(organizationId) ?? 0) <
          (TOWN_PART_TIME_SHARE[workplace.key] ?? TOWN_PART_TIME_DEFAULT) *
            (staff + p("one")) -
            p("half"));
    counted().kindOf.set(organizationId, workplace.key);
    countHire(counted(), organizationId, chosen.title, partTime);
    const [minimumHours, maximumHours] =
      chosen.hours ?? (partTime ? PART_TIME_HOURS : FULL_TIME_HOURS);
    jobs.push({
      stableKey: jobKey(resident.personId),
      personId: resident.personId,
      organizationId,
      startedAt: hired < adultSince ? adultSince : hired,
      kind: workplace.kind,
      compensation: "paid",
      authority: chosen.authority ?? "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      initialRole: {
        title: chosen.title,
        occupationClassification: chosen.occupation,
        locationJurisdictionId: town,
        timeDemand: {
          expectedWeekly: { minimumHours, maximumHours },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: chosen.rigidity ?? "rigid",
          interruptibility: "limited",
          locationJurisdictionId: town,
        },
      },
    });
    return true;
  };

  // Civic roles nobody in town holds today come first, so a town always has
  // its clerk, its pastors and its principals.
  const pool = [...open].sort(
    (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
  );
  const take = (minAge: number) => {
    // From the middle of the pool: civic roles are not all held by the oldest.
    const fits = pool.filter((resident) => resident.age >= minAge);
    if (fits.length === 0) return null;
    const pick = fits[Math.floor(fits.length / 2)]!;
    pool.splice(pool.indexOf(pick), 1);
    return pick;
  };
  const held = heldTownRoles(draft, prefix);
  for (const [key, title] of CIVIC_MINIMUM) {
    if (key === "county-clerk" && !countyName) continue;
    const workplace = TOWN_WORKPLACE_BY_KEY.get(key)!;
    const chosen = workplace.roles.find((entry) => entry.title === title)!;
    const organizationIds = existingOf(workplace);
    // One per existing organization (each school its principal), else one.
    for (let n = 0; n < Math.max(1, organizationIds.length); n += 1) {
      const at = organizationIds[n] ?? null;
      const heldKey = `${title}|${at ?? key}`;
      if ((held.get(heldKey) ?? 0) > 0) {
        held.set(heldKey, held.get(heldKey)! - 1);
        continue;
      }
      const resident = take(chosen.minAge ?? WORKING_AGE_MIN);
      if (!resident) break;
      if (hire(resident, workplace, chosen, at ?? undefined, true)) continue;
      // No employer of that kind can be written: the resident goes back to
      // the pool and draws from the town's mix instead.
      pool.push(resident);
      pool.sort(
        (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
      );
      break;
    }
  }

  // Everyone else by the town's own mix, nothing drawn. Each resident, the
  // oldest first, tries the kinds of work they have done in town before,
  // then the kinds furthest below their share of the town's jobs. A kind at
  // or above its share takes nobody more: a resident no kind takes stays out
  // of work.
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const resident of pool) {
    const current = counted();
    const short = (key: string, weight: number) =>
      (weight / totalWeight) * (current.total + 1) -
      (current.byKind.get(key) ?? 0);
    const past = current.pastKinds.get(resident.personId);
    const order = weights
      .map(([key, weight]) => [key, short(key, weight)] as const)
      .filter(([, gap]) => gap > 0)
      .sort(
        (a, b) =>
          Number(past?.has(b[0]) ?? false) - Number(past?.has(a[0]) ?? false) ||
          b[1] - a[1] ||
          a[0].localeCompare(b[0]),
      );
    for (const [key] of order) {
      const workplace = TOWN_WORKPLACE_BY_KEY.get(key);
      if (!workplace) continue;
      // A congregation or school has one pastor or principal, hired above
      // for each one in town; the mix never adds a second.
      const chosen = roleFor(
        workplace,
        resident,
        workplace.roles.filter(
          (entry) =>
            !(workplace.existing && entry.authority === "directs-others"),
        ),
      );
      if (chosen && hire(resident, workplace, chosen)) break;
    }
  }
  if (jobs.length > 0) createWorkRelationships(draft, jobs);
}

/**
 * The town's civic roles held today, counted by title and by the existing
 * organization (a school, a congregation) or the workplace they are held at.
 */
function heldTownRoles(
  draft: OpeningDraft,
  prefix: string,
): Map<string, number> {
  const workplaceOf = new Map<EntityId, string>();
  for (const organization of draft.history.organizations) {
    const match = organization.stableKey.match(/:employer:([a-z-]+):\d+$/);
    if (match && organization.stableKey.startsWith(prefix))
      workplaceOf.set(organization.id, match[1]!);
  }
  const counts = new Map<string, number>();
  const active = new Set<EntityId>();
  const latest = new Map<EntityId, string>();
  for (const row of draft.history.workStatuses)
    if (row.effectiveAt <= draft.currentDate)
      latest.set(row.workRelationshipId, row.status);
  for (const [id, status] of latest) if (status === "active") active.add(id);
  const relationships = new Map(
    draft.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const role of draft.history.workRoles) {
    if (
      !role.stableKey.startsWith(prefix) ||
      !active.has(role.workRelationshipId)
    )
      continue;
    const organizationId = relationships.get(
      role.workRelationshipId,
    )?.organizationId;
    if (!organizationId) continue;
    const key = `${role.title}|${workplaceOf.get(organizationId) ?? organizationId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
