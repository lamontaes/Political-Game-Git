import { makeIsoDate } from "./kernel/dates";
import { corePlaceByJurisdictionId } from "./place-lookup";
import type { EntityId } from "./kernel/brands";
import contentJson from "./data/civic-inputs.json" with { type: "json" };
import { LOCAL_INSTITUTIONS_TABLE } from "./reference/local-institutions";
import { stopgap } from "./stopgaps";
import type {
  CoreInput,
  CoreState,
  JobInput,
  PublicOrganization,
  Source,
} from "./types";

interface DirectoryRow {
  name: string;
  kind: string;
  sourceKey: string;
  sourceId: string;
  asOf: string;
}

export interface CivicDirectory {
  readonly asOf: string;
  readonly places: Readonly<Record<string, unknown>>;
  readonly counties: Readonly<Record<string, unknown>>;
}

interface TargetDefinition {
  id: string;
  kind: string;
  affordances: readonly string[];
  facts: Readonly<Record<string, string>>;
}

export interface CivicInputsData {
  version: string;
  stopgapId: string;
  directoryCitation: string;
  directoryScopes: readonly { scope: string; store: string }[];
  directoryColumns: readonly string[];
  directoryRules: readonly (TargetDefinition & {
    sourceKinds: readonly string[];
  })[];
  organizationRules: readonly (TargetDefinition & {
    classifications: readonly string[];
    classificationPrefixes: readonly string[];
    requiredGovernmentFacts: readonly string[];
  })[];
  staffRules: readonly {
    id: string;
    targetKinds: readonly string[];
    occupations: readonly string[];
    titles: readonly string[];
    source: string;
  }[];
  requiredAffordances: readonly { id: string; gap: string }[];
}

function stringFacts(
  facts: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(facts).filter((entry): entry is [string, string] => {
      const [, value] = entry;
      return value !== undefined;
    }),
  );
}

export const DEFAULT_CIVIC_INPUTS_DATA: CivicInputsData = {
  ...contentJson,
  directoryRules: contentJson.directoryRules.map((row) => ({
    ...row,
    facts: stringFacts(row.facts),
  })),
  organizationRules: contentJson.organizationRules.map((row) => ({
    ...row,
    facts: stringFacts(row.facts),
  })),
};

/** The staff rule that puts a job on an office of this kind, if any. */
function staffRuleFor(
  data: CivicInputsData,
  kind: string,
  job: Pick<JobInput, "occupationClassification" | "title">,
): CivicInputsData["staffRules"][number] | undefined {
  return data.staffRules.find(
    (row) =>
      row.targetKinds.includes(kind) &&
      (!row.occupations.length ||
        (job.occupationClassification !== undefined &&
          row.occupations.includes(job.occupationClassification))) &&
      (!row.titles.length || row.titles.includes(job.title)),
  );
}

/**
 * An employer's public office after a hire or a job's end: its staff are the
 * employer's current jobs a staff rule names for the office's kind, so filing
 * and a resident's callback find who holds the job today. An office not built
 * from its employer's records (a directory listing) keeps its own list.
 */
export function refreshOfficeStaff(
  core: CoreState,
  organizationId: string,
): void {
  const office = core.publicOrganizations.get(organizationId);
  if (office?.facts?.organizationId !== organizationId) return;
  const staff: NonNullable<PublicOrganization["staff"]>[number][] = [];
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ??
    []) {
    const job = core.jobs.get(jobId);
    if (!job || job.endsAt !== undefined || !core.people.has(job.personId))
      continue;
    if (!staffRuleFor(DEFAULT_CIVIC_INPUTS_DATA, office.kind, job)) continue;
    staff.push({
      personId: job.personId,
      jobId: job.id,
      title: job.title,
      source: job.source,
    });
  }
  core.publicOrganizations.set(organizationId, { ...office, staff });
}

// The places corpus's institutions table, through its one reader.
const DIRECTORY = LOCAL_INSTITUTIONS_TABLE;
const DIRECTORY_STORES: Readonly<Record<string, (geoid: string) => unknown>> = {
  places: DIRECTORY.section("places"),
  counties: DIRECTORY.section("counties"),
};

export interface CivicInputsOptions {
  data?: CivicInputsData;
  directory?: CivicDirectory;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function directoryRow(value: unknown, context: string): DirectoryRow {
  if (!isRecord(value))
    throw new Error(`Malformed civic directory row: ${context}`);
  const { name, kind, sourceKey, sourceId, asOf } = value;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof kind !== "string" ||
    !kind.trim() ||
    typeof sourceKey !== "string" ||
    !sourceKey.trim() ||
    typeof sourceId !== "string" ||
    !sourceId.trim() ||
    typeof asOf !== "string"
  )
    throw new Error(`Malformed civic directory identity: ${context}`);
  makeIsoDate(asOf);
  return { name, kind, sourceKey, sourceId, asOf };
}

/** Classify supplied records once. Looking up their public facts is a separate act. */
export function enrichCivicInputs(
  input: CoreInput,
  options: CivicInputsOptions = {},
): CoreInput {
  const data = options.data ?? DEFAULT_CIVIC_INPUTS_DATA;
  const marker = stopgap(data.stopgapId);
  const startedAt = makeIsoDate(input.startedAt);
  const directory = options.directory;
  makeIsoDate(directory?.asOf ?? DIRECTORY.rest<{ asOf: string }>().asOf);
  const stores: Readonly<Record<string, (geoid: string) => unknown>> = directory
    ? {
        places: (geoid) => directory.places[geoid],
        counties: (geoid) => directory.counties[geoid],
      }
    : DIRECTORY_STORES;
  const gapPrefix = `Civic inputs ${data.version}: `;
  const gaps = new Set(input.gaps.filter((gap) => !gap.startsWith(gapPrefix)));
  const publicById = new Map<string, PublicOrganization>();
  for (const row of input.publicOrganizations ?? []) {
    if (publicById.has(row.id))
      throw new Error(`Duplicate supplied public organization: ${row.id}`);
    publicById.set(row.id, row);
  }
  const placeIds = new Set(input.focusPlaceIds);
  for (const person of input.people) {
    placeIds.add(person.placeId);
    if (person.countyId) placeIds.add(person.countyId);
  }
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const jobsByOrganization = new Map<string, JobInput[]>();
  for (const job of input.jobs) {
    const rows = jobsByOrganization.get(job.organizationId) ?? [];
    rows.push(job);
    jobsByOrganization.set(job.organizationId, rows);
  }

  for (const organization of input.organizations) {
    placeIds.add(organization.placeId);
    const existing = publicById.get(organization.id);
    if (existing) {
      if (
        existing.name !== organization.name ||
        existing.placeId !== organization.placeId
      )
        throw new Error(
          `Public identity contradicts the supplied employer: ${organization.id}`,
        );
      for (const [key, value] of Object.entries(
        organization.governmentFacts ?? {},
      ))
        if (
          existing.facts?.[key] !== undefined &&
          existing.facts[key] !== value
        )
          throw new Error(
            `Public government fact contradicts the supplied employer: ${organization.id}:${key}`,
          );
      if (existing.facts?.stopgapId === marker.id && !existing.staff?.length)
        gaps.add(
          `${gapPrefix}${organization.id} has no supplied civic contact-role assignment; no clerk or association contact invented.`,
        );
      continue;
    }
    const classification = organization.classification;
    if (!classification) continue;
    const definition = data.organizationRules.find(
      (row) =>
        row.classifications.includes(classification) ||
        row.classificationPrefixes.some((prefix) =>
          classification.startsWith(prefix),
        ),
    );
    if (!definition) continue;
    const missingGovernment = definition.requiredGovernmentFacts.filter(
      (key) => !organization.governmentFacts?.[key],
    );
    if (missingGovernment.length) {
      gaps.add(
        `${gapPrefix}${organization.id} lacks recorded government facts ${missingGovernment.join(", ")}; no office identity inferred from its name.`,
      );
      continue;
    }
    // The staff are the office's jobs now; the jobs engine keeps the list
    // as people are hired and leave (refreshOfficeStaff).
    const staff: NonNullable<PublicOrganization["staff"]>[number][] = [];
    const staffSources = new Set<string>();
    for (const job of jobsByOrganization.get(organization.id) ?? []) {
      const rule = staffRuleFor(data, definition.kind, job);
      if (!rule) continue;
      if (!peopleById.has(job.personId)) {
        gaps.add(
          `${gapPrefix}${job.id} names an absent staff actor; no replacement contact generated.`,
        );
        continue;
      }
      staff.push({
        personId: job.personId,
        jobId: job.id,
        title: job.title,
        source: job.source,
      });
      staffSources.add(rule.source);
    }
    if (!staff.length)
      gaps.add(
        `${gapPrefix}${organization.id} has no supplied civic contact-role assignment; no clerk or association contact invented.`,
      );
    const source: Source = {
      ...organization.source,
      tag: "ESTIMATED",
      estimatedFrom: `${organization.source.estimatedFrom ?? "Supplied organization profile."} Civic inquiry classification ${definition.id} uses recorded classification ${classification}; no personal acquaintance, admission, room permission, official approval, or legal powers inferred.`,
    };
    publicById.set(organization.id, {
      id: organization.id,
      placeId: organization.placeId,
      name: organization.name,
      kind: definition.kind,
      source,
      affordances: [...definition.affordances],
      facts: {
        ...definition.facts,
        ...organization.governmentFacts,
        organizationId: organization.id,
        classification,
        identitySourceCitation: organization.source.citation,
        identitySourceAsOf: organization.source.asOf,
        ...(organization.topic ? { topic: organization.topic } : {}),
        staffAvailability: "not-established",
        staffKnowledge: "not-inferred",
        ...(staffSources.size
          ? { staffAssignmentSource: [...staffSources].join(" ") }
          : {}),
        stopgapId: marker.id,
      },
      ...(staff.length ? { staff } : {}),
    });
  }

  for (const placeId of [...placeIds].sort()) {
    const place = corePlaceByJurisdictionId(placeId as EntityId);
    const scope = place
      ? data.directoryScopes.find((row) => row.scope === place.scope)
      : undefined;
    if (!place?.sourceGeoid || !scope) {
      gaps.add(
        `${gapPrefix}${placeId} has no indexed locality/county identity for a directory lookup; no institution name invented.`,
      );
      continue;
    }
    const store = stores[scope.store];
    if (!store)
      throw new Error(`Unavailable civic directory store: ${scope.store}`);
    const group = store(place.sourceGeoid);
    if (group === undefined) continue;
    if (!isRecord(group))
      throw new Error(`Malformed civic directory group: ${placeId}`);
    for (const column of data.directoryColumns) {
      const rows = group[column];
      if (rows === undefined) continue;
      if (!Array.isArray(rows))
        throw new Error(
          `Malformed civic directory column: ${placeId}:${column}`,
        );
      for (const raw of rows) {
        const row = directoryRow(raw, `${placeId}:${column}`);
        const definition = data.directoryRules.find((entry) =>
          entry.sourceKinds.includes(row.kind),
        );
        if (!definition) continue;
        const id = `public-directory:${placeId}:${row.sourceKey}:${row.sourceId}`;
        if (publicById.has(id)) continue;
        const vintage = makeIsoDate(row.asOf);
        const backdated = startedAt < vintage;
        const source: Source = {
          tag: "ESTIMATED",
          citation: `${data.directoryCitation} ${row.sourceKey}:${row.sourceId}, directory as of ${row.asOf}.`,
          asOf: row.asOf,
          estimatedFrom: `${backdated ? "Later directory identity used as an opening proxy; historical name and existence are not verified." : "Recorded directory identity; current operation beyond the directory vintage is not verified."} Classification ${definition.id} supplies only a public inquiry destination; no meeting access, room, schedule, membership admission, staffing, or approval inferred.`,
        };
        publicById.set(id, {
          id,
          placeId,
          name: row.name,
          kind: definition.kind,
          source,
          affordances: [...definition.affordances],
          facts: {
            ...definition.facts,
            sourceKind: row.kind,
            sourceKey: row.sourceKey,
            sourceId: row.sourceId,
            directoryAsOf: row.asOf,
            placeName: place.displayName,
            placeGeoid: place.sourceGeoid,
            geographyScope: place.scope,
            identityStatus: backdated
              ? "opening-identity-proxy"
              : "directory-identity",
            exactAddress: "not-imported",
            stopgapId: marker.id,
          },
        });
      }
    }
  }

  const affordancesByPlace = new Map<string, Set<string>>();
  for (const row of publicById.values()) {
    const values = affordancesByPlace.get(row.placeId) ?? new Set<string>();
    for (const value of row.affordances ?? []) values.add(value);
    affordancesByPlace.set(row.placeId, values);
  }
  for (const placeId of [...placeIds].sort())
    for (const requirement of data.requiredAffordances)
      if (!affordancesByPlace.get(placeId)?.has(requirement.id))
        gaps.add(`${gapPrefix}${placeId}: ${requirement.gap}`);

  return {
    ...input,
    publicOrganizations: [...publicById.values()],
    gaps: [...gaps],
  };
}
