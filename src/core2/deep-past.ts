import { OPENING_KIN } from "./opening-kin";
import { buildOpeningPeerContacts } from "./opening-peer-network";
import institutionsJson from "../../data/research/places/local-institutions.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { countyGeoidsForPlace } from "../simulation/government-units";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import type {
  LocalInstitutionRow,
  LocalInstitutionsCorpus,
} from "../simulation/local-institutions-data";
import { SeededRng } from "../simulation/rng";
import { kindergartenYear, onCalendar } from "../simulation/school-calendar";
import { SCHOOL_NAMES_V3 } from "../simulation/school-names";
import type { EntityId } from "../simulation/types";
import contentJson from "./data/deep-past.json" with { type: "json" };
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, PersonInput, Source } from "./types";

type PriorFact = NonNullable<PersonInput["pastFacts"]>[number] & {
  facts?: Readonly<Record<string, string>>;
};

export interface DeepPastFieldSource {
  personId: string;
  field: string;
  status: "filled" | "preserved" | "unresolved";
  factIds: readonly string[];
  source?: Source;
  reason: string;
  stopgapId?: string;
}

export interface DeepPastData {
  version: string;
  stopgapId: string;
  throughExclusive: string;
  birth: { kind: string; label: string; establishedKinds: readonly string[] };
  schools: {
    field: string;
    kind: string;
    establishedKindPrefixes: readonly string[];
    locationKindPrefixes: readonly string[];
    birthplaceKinds: readonly string[];
    source: string;
    stages: readonly {
      id: string;
      label: string;
      nameSuffix: string;
      startOffsetParameter: string;
      institutionColumn: string;
      namedCampus: boolean;
    }[];
  };
  work: {
    field: string;
    kind: string;
    label: string;
    startKinds: readonly string[];
    source: string;
  };
  preservedFields: readonly {
    field: string;
    kindPrefixes: readonly string[];
    gap: string;
  }[];
  eras: readonly {
    id: string;
    date: string;
    kind: string;
    title: string;
    facts: Readonly<Record<string, string>>;
    source: Source;
  }[];
}

export const DEFAULT_DEEP_PAST_DATA: DeepPastData = {
  ...contentJson,
  eras: contentJson.eras.map((era) => {
    const source = era.source;
    if (source.tag !== "SOURCED" && source.tag !== "ESTIMATED")
      throw new Error(`Invalid deep-past source tag: ${era.id}`);
    return {
      ...era,
      facts: Object.fromEntries(
        Object.entries(era.facts).filter((entry): entry is [string, string] => {
          const [, value] = entry;
          return value !== undefined;
        }),
      ),
      source: { ...source, tag: source.tag },
    };
  }),
};

export interface DeepPastOptions {
  data?: DeepPastData;
  parameters?: Readonly<Record<string, Parameter>>;
  institutions?: LocalInstitutionsCorpus;
}

type ReportedInput = CoreInput & {
  priorFactsSource?: readonly DeepPastFieldSource[];
};

function hasPrefix(kind: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => kind.startsWith(prefix));
}

/** One-time augmentation of a supplied life, never a historical clock run. */
export function buildDeepPast(
  input: CoreInput,
  options: DeepPastOptions = {},
): CoreInput {
  const data = options.data ?? DEFAULT_DEEP_PAST_DATA;
  const p = (key: string) => parameter(key, options.parameters ?? PARAMETERS);
  const marker = stopgap(data.stopgapId);
  stopgap("SG-P8-shared-past-history");
  const opening = makeIsoDate(input.startedAt);
  const boundary = makeIsoDate(data.throughExclusive);
  const cutoff = opening < boundary ? opening : boundary;
  const institutions =
    options.institutions ?? (institutionsJson as LocalInstitutionsCorpus);
  const gapPrefix = `Deep past ${data.version} `;
  const gaps = new Set(input.gaps.filter((gap) => !gap.startsWith(gapPrefix)));
  const activePersonIds = new Set(input.people.map((person) => person.id));
  const ownedFields = new Set([
    "birth",
    "era-context",
    data.schools.field,
    data.work.field,
    ...data.preservedFields.map((field) => field.field),
  ]);
  const reports = ((input as ReportedInput).priorFactsSource ?? []).filter(
    (row) =>
      !activePersonIds.has(row.personId) ||
      (!ownedFields.has(row.field) &&
        !row.field.startsWith(`${data.schools.field}:`)),
  );
  const reportIndexes = new Map(
    reports.map((row, index) => [`${row.personId}:${row.field}`, index]),
  );
  const unresolved = new Map<string, number>();
  const institutionCache = new Map<string, readonly LocalInstitutionRow[]>();
  const jobById = new Map(input.jobs.map((job) => [job.id, job]));

  const report = (row: DeepPastFieldSource): void => {
    const key = `${row.personId}:${row.field}`;
    const index = reportIndexes.get(key);
    if (index === undefined) {
      reportIndexes.set(key, reports.length);
      reports.push(row);
    } else reports[index] = row;
    if (row.status === "unresolved")
      unresolved.set(
        row.field,
        (unresolved.get(row.field) ?? p("zero")) + p("one"),
      );
  };

  const localRows = (
    placeId: string,
    countyId: string | undefined,
    column: string,
  ): readonly LocalInstitutionRow[] => {
    const key = `${placeId}:${countyId ?? ""}:${column}`;
    const cached = institutionCache.get(key);
    if (cached) return cached;
    const place = lifePlaceByJurisdictionId(placeId as EntityId);
    const county = countyId
      ? lifePlaceByJurisdictionId(countyId as EntityId)
      : null;
    const group = place?.sourceGeoid
      ? institutions.places[place.sourceGeoid]
      : undefined;
    const placeColumns: Readonly<
      Record<string, readonly LocalInstitutionRow[] | undefined>
    > = { ...group };
    const direct = placeColumns[column] ?? [];
    const countyGeoids = county?.sourceGeoid
      ? [county.sourceGeoid]
      : place?.sourceGeoid
        ? countyGeoidsForPlace(place.sourceGeoid)
        : [];
    const rows = new Map(
      direct.map((row) => [`${row.sourceKey}:${row.sourceId}`, row]),
    );
    for (const geoid of countyGeoids) {
      const countyColumns: Readonly<
        Record<string, readonly LocalInstitutionRow[] | undefined>
      > = { ...institutions.counties[geoid] };
      const countyRows = countyColumns[column] ?? [];
      for (const row of countyRows)
        rows.set(`${row.sourceKey}:${row.sourceId}`, row);
    }
    const result = [...rows.values()];
    institutionCache.set(key, result);
    return result;
  };

  const people = input.people.map((person): PersonInput => {
    const birth = makeIsoDate(person.birthDate);
    if (birth > opening)
      throw new Error(`Deep past cannot precede birth: ${person.id}`);
    const original: readonly PriorFact[] = person.pastFacts ?? [];
    const ids = new Set<string>();
    for (const fact of original) {
      makeIsoDate(fact.date);
      if (ids.has(fact.id))
        throw new Error(`Duplicate established past fact: ${fact.id}`);
      ids.add(fact.id);
    }
    const added: PriorFact[] = [];
    const prefix = `${person.id}:${data.version}:`;
    const add = (fact: PriorFact): void => {
      if (fact.date < birth || fact.date >= cutoff) return;
      if (!ids.has(fact.id)) {
        ids.add(fact.id);
        added.push(fact);
      }
    };
    const record = (
      field: string,
      facts: readonly PriorFact[],
      reason: string,
    ): void =>
      report({
        personId: person.id,
        field,
        status: facts.length
          ? facts.some((fact) => fact.id.startsWith(prefix))
            ? "filled"
            : "preserved"
          : "unresolved",
        factIds: facts.map((fact) => fact.id),
        ...(facts[p("zero")] ? { source: facts[p("zero")]!.source } : {}),
        reason,
        ...(facts.some((fact) => fact.source.tag === "ESTIMATED") ||
        !facts.length
          ? { stopgapId: marker.id }
          : {}),
      });

    const establishedBirth = original.filter((fact) =>
      data.birth.establishedKinds.includes(fact.kind),
    );
    for (const fact of establishedBirth)
      if (fact.date !== birth)
        throw new Error(
          `Established birth date contradicts identity: ${person.id}`,
        );
    if (!establishedBirth.length)
      add({
        id: `${prefix}birth`,
        date: birth,
        kind: data.birth.kind,
        summary: data.birth.label,
        source: person.source,
        facts: { birthDate: birth },
      });
    record(
      "birth",
      [
        ...establishedBirth,
        ...added.filter((fact) => fact.kind === data.birth.kind),
      ],
      "Preserved identity date; no parent, birthplace, or household invented.",
    );

    const existingSchools = original.filter((fact) =>
      hasPrefix(fact.kind, data.schools.establishedKindPrefixes),
    );
    const suppliedSchools = existingSchools.filter(
      (fact) => !fact.id.startsWith(prefix),
    );
    let schoolGap =
      "No schooling cohort begins before the historical boundary.";
    if (!suppliedSchools.length) {
      const stageIds = new Set<string>();
      const kgYear = kindergartenYear(birth);
      for (const stage of data.schools.stages) {
        if (stageIds.has(stage.id))
          throw new Error(`Duplicate deep-past school stage: ${stage.id}`);
        stageIds.add(stage.id);
        const offset = p(stage.startOffsetParameter);
        if (!Number.isInteger(offset) || offset < p("zero"))
          throw new Error(`Invalid school cohort offset: ${stage.id}`);
        const year = kgYear + offset;
        const date = onCalendar(year, "starts");
        if (date < birth || date >= cutoff) continue;
        if (ids.has(`${prefix}school:${stage.id}`)) continue;
        const priorLocationFacts = original.filter(
          (fact) =>
            fact.date <= date &&
            hasPrefix(fact.kind, data.schools.locationKindPrefixes),
        );
        const locationFacts = priorLocationFacts.filter(
          (fact) =>
            !fact.facts?.endedAt || makeIsoDate(fact.facts.endedAt) > date,
        );
        if (priorLocationFacts.length && !locationFacts.length) {
          schoolGap =
            "Established residence ended before this school cohort; no later address inferred.";
          record(`${data.schools.field}:${stage.id}`, [], schoolGap);
          continue;
        }
        const missingLocation = locationFacts.some(
          (fact) => !fact.facts?.placeId,
        );
        if (missingLocation) {
          schoolGap =
            "Established residence history lacks a location key; no competing school place inferred.";
          record(`${data.schools.field}:${stage.id}`, [], schoolGap);
          continue;
        }
        const located = locationFacts
          .filter((fact) => fact.facts?.placeId)
          .sort((left, right) => left.date.localeCompare(right.date))
          .at(-p("one"));
        const birthplace = original.find(
          (fact) =>
            data.schools.birthplaceKinds.includes(fact.kind) &&
            fact.facts?.placeId,
        );
        const laterMobility = original.some(
          (fact) =>
            fact.date < cutoff &&
            hasPrefix(fact.kind, data.schools.locationKindPrefixes) &&
            fact.date > date,
        );
        if (!located && !birthplace && laterMobility) {
          schoolGap =
            "Known mobility does not establish the earlier school location; no current town backdated.";
          record(`${data.schools.field}:${stage.id}`, [], schoolGap);
          continue;
        }
        const placeId =
          located?.facts?.placeId ??
          birthplace?.facts?.placeId ??
          person.placeId;
        const countyId =
          located?.facts?.countyId ??
          birthplace?.facts?.countyId ??
          (placeId === person.placeId ? person.countyId : undefined);
        const rng = new SeededRng(input.seed).fork(
          `${data.version}:${placeId}:${stage.id}:school-identity`,
        );
        const choices = localRows(placeId, countyId, stage.institutionColumn);
        const institution = choices.length ? rng.pick(choices) : undefined;
        const schoolName =
          stage.namedCampus && institution
            ? institution.name
            : `${rng.pick(SCHOOL_NAMES_V3.features)} ${stage.nameSuffix}`;
        const source: Source = {
          tag: "ESTIMATED",
          asOf: input.startedAt,
          citation: `${data.schools.source}${institution ? ` ${institution.sourceKey}:${institution.sourceId}, ${institution.name}, directory as of ${institution.asOf}.` : " No indexed campus identity; generated landscape name."}`,
          estimatedFrom: `Birth cohort calendar; ${located ? "recorded residence" : birthplace ? "recorded birthplace used as a schooling-location proxy" : "opening locality used as a schooling-location proxy"}. Historical attendance and historical name/existence are not verified; no qualification or graduation inferred.`,
        };
        add({
          id: `${prefix}school:${stage.id}`,
          date,
          kind: data.schools.kind,
          summary: stage.label,
          source,
          facts: {
            stage: stage.id,
            cohortYear: String(year),
            placeId,
            schoolName,
            ...(countyId ? { countyId } : {}),
            ...(institution
              ? {
                  institutionSourceId: institution.sourceId,
                  institutionSourceKey: institution.sourceKey,
                  institutionName: institution.name,
                  institutionKind: institution.kind,
                  directoryAsOf: institution.asOf,
                }
              : {}),
            campusIdentity:
              stage.namedCampus && institution
                ? "historical-name-proxy"
                : "generated",
            attendance: "cohort-estimate",
            qualification: "not-inferred",
            stopgapId: marker.id,
          },
        });
      }
    }
    const schoolRecords = [
      ...existingSchools,
      ...added.filter((fact) => fact.kind === data.schools.kind),
    ];
    record(
      data.schools.field,
      schoolRecords,
      suppliedSchools.length
        ? "Preserved supplied schooling; no extra attendance path imposed."
        : schoolRecords.length
          ? "Estimated dated school cohorts; campus identity, attendance, and earlier locality remain source-limited proxies."
          : schoolGap,
    );

    const job = person.jobId ? jobById.get(person.jobId) : undefined;
    const existingTenure = original.filter(
      (fact) => fact.kind === data.work.kind,
    );
    const starts = job
      ? original.filter(
          (fact) =>
            data.work.startKinds.includes(fact.kind) &&
            fact.date >= birth &&
            fact.date < cutoff &&
            (fact.facts?.jobId === job.id || fact.id.startsWith(`${job.id}:`)),
        )
      : [];
    const unambiguousStart =
      new Set(starts.map((fact) => fact.date)).size === p("one");
    if (job && !existingTenure.length && unambiguousStart) {
      const start = starts[p("zero")]!;
      add({
        id: `${prefix}job:${job.id}`,
        date: start.date,
        kind: data.work.kind,
        summary: data.work.label,
        source: start.source,
        facts: {
          jobId: job.id,
          organizationId: job.organizationId,
          title: job.title,
          startedAt: start.date,
          tenureDaysAtOpening: String(
            daysBetween(makeIsoDate(start.date), opening),
          ),
          earnings: "not-reconstructed",
          sourceFactId: start.id,
          stopgapId: marker.id,
        },
      });
    }
    record(
      data.work.field,
      [
        ...existingTenure,
        ...added.filter((fact) => fact.kind === data.work.kind),
      ],
      starts.length && !unambiguousStart && !existingTenure.length
        ? "Supplied opening-job start dates conflict; no date selected or tenure inferred."
        : "Only a supplied start of the opening job supports tenure; no median assigned to a missing personal job history.",
    );

    for (const field of data.preservedFields) {
      const facts = original.filter(
        (fact) =>
          fact.date < cutoff && hasPrefix(fact.kind, field.kindPrefixes),
      );
      record(
        field.field,
        facts,
        facts.length ? "Preserved supplied dated personal records." : field.gap,
      );
    }
    for (const era of data.eras) {
      const date = makeIsoDate(era.date);
      if (date < birth || date >= cutoff) continue;
      add({
        id: `${prefix}era:${era.id}`,
        date,
        kind: era.kind,
        summary: era.title,
        source: era.source,
        facts: {
          ...era.facts,
          eraId: era.id,
          cohortRelation: "alive-on-context-date",
          birthDateSource: person.source.citation,
          knowledge: "not-inferred",
          stopgapId: marker.id,
        },
      });
    }
    record(
      "era-context",
      [
        ...original.filter((fact) => fact.id.startsWith(`${prefix}era:`)),
        ...added.filter((fact) => fact.id.startsWith(`${prefix}era:`)),
      ],
      "Dated public context intersecting the supplied lifetime; no personal memory, belief, loss, infection, or decision inferred.",
    );
    return added.length
      ? {
          ...person,
          pastFacts: [
            ...original,
            ...added.sort(
              (left, right) =>
                left.date.localeCompare(right.date) ||
                left.id.localeCompare(right.id),
            ),
          ],
        }
      : person;
  });

  for (const [field, count] of unresolved)
    gaps.add(
      `${gapPrefix}${field}: ${count} people retain an unresolved personal-history field; consult priorFactsSource for the constraint.`,
    );
  // P15: every resident gets remembered acquaintances from their own school
  // context, by the same rule the benchmark player had.
  const withPast: CoreInput = { ...input, people, gaps: [...gaps] };
  const result: CoreInput & {
    priorFactsSource: readonly DeepPastFieldSource[];
  } = {
    ...buildOpeningPeerContacts(withPast, {
      personIds: people
        .filter((person) => person.tier !== OPENING_KIN.kinTier)
        .map((person) => person.id),
    }).input,
    priorFactsSource: reports,
  };
  return result;
}
