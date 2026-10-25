import { OPENING_KIN } from "./opening-kin";
import { addFamilyHistories } from "./past-family";
import {
  buildOpeningPeerContacts,
  DEFAULT_OPENING_PEER_DATA,
  type OpeningPeerData,
} from "./opening-peer-network";
import { groupedJsonTable } from "./reference/lazy-data";
import { ageOnDate, daysBetween, makeIsoDate } from "./kernel/dates";
import { countyGeoidsForPlace } from "./reference/government-units";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { stableHash } from "./kernel/ids";
import { SeededRng } from "./kernel/rng";
import { kindergartenYear, onCalendar } from "./school-calendar";
import SCHOOL_NAMES from "./data/names/school-name-features.json" with { type: "json" };
import type { EntityId } from "./kernel/brands";
import contentJson from "./data/deep-past.json" with { type: "json" };
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import coworkerJson from "./data/opening-coworkers.json" with { type: "json" };
import type { CoreInput, PersonInput, Source } from "./types";

type PriorFact = NonNullable<PersonInput["pastFacts"]>[number] & {
  facts?: Readonly<Record<string, string>>;
};

type SchoolRow = readonly [
  id: string,
  name: string,
  lowestGrade: string,
  highestGrade: string,
  enrollment: number,
];
// Read on first use, only for the states a world asks about.
const SCHOOL_TABLE = groupedJsonTable(
  new URL("./data/opening-schools.json", import.meta.url),
  ["byGeoid"],
);
const schoolsAt = SCHOOL_TABLE.section<readonly SchoolRow[]>("byGeoid");
const SCHOOLS = SCHOOL_TABLE.rest.bind(SCHOOL_TABLE) as () => {
  stopgapId: string;
  asOf: string;
  citation: string;
  placesByCounty: Readonly<Record<string, readonly string[]>>;
  bucketsByState: Readonly<Record<string, readonly string[]>>;
};

const OPENING_COWORKER_DATA = coworkerJson as OpeningPeerData;

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
    /** Grade codes before grade 1, as the CCD writes them. */
    gradesBeforeFirst: Readonly<Record<string, number>>;
    /**
     * The directory's shortened name endings ("H S", "EL", "SCH") and the
     * words they stand for, read from the end of a campus name backward.
     */
    directoryAbbreviations: Readonly<Record<string, string>>;
    /** A name ending in a bare stage word ("Anson Middle") takes the suffix. */
    bareStageNames: { words: readonly string[]; suffix: string };
    stages: readonly {
      id: string;
      label: string;
      nameSuffix: string;
      startOffsetParameter: string;
      entryGrade: string;
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
  /**
   * The two-level population: the records' count of people in a class or
   * workplace (by circle version and context), so people filled in later
   * join the same peer groups as in a fully built town.
   */
  peerCohortSize?: (
    circle: string,
    contextKey: string,
    present: number,
  ) => number;
}

type ReportedInput = CoreInput & {
  priorFactsSource?: readonly DeepPastFieldSource[];
};

function hasPrefix(kind: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => kind.startsWith(prefix));
}

/** One-time augmentation of a supplied life, never a historical clock run. */
const FIRST_YEAR_TABLE = groupedJsonTable(
  new URL("./data/school-first-years.json", import.meta.url),
  ["firstYear"],
);
const firstYearOf = FIRST_YEAR_TABLE.section<number>("firstYear");
const FIRST_YEARS = FIRST_YEAR_TABLE.rest.bind(FIRST_YEAR_TABLE) as () => {
  snapshots: readonly number[];
  source: { citation: string };
};

/**
 * Whether the directory lists a school by a cohort's year: listed in the
 * first snapshot counts for any earlier year (it may be older); a school in
 * no snapshot opened after the last one.
 */
export function schoolOpenBy(id: string, year: number): boolean {
  const { snapshots } = FIRST_YEARS();
  const [earliest, next] = snapshots as [number, number];
  const latest = Math.max(...snapshots);
  const first = firstYearOf(id) ?? latest + (next - earliest);
  return first <= Math.max(year, earliest);
}

/**
 * A campus's name as people say it: the directory's shortened endings
 * written out from the end backward, in the name's own case ("ANSON H S" is
 * "ANSON HIGH SCHOOL", "Wexford El Sch" is "Wexford Elementary School"), and
 * a bare stage word finished ("ANSON MIDDLE" is "ANSON MIDDLE SCHOOL").
 */
export function campusSpokenName(
  name: string,
  schools: Pick<
    DeepPastData["schools"],
    "directoryAbbreviations" | "bareStageNames"
  >,
): string {
  const loud = name === name.toUpperCase();
  const cased = (words: string) => (loud ? words.toUpperCase() : words);
  const key = (word: string) => word.toUpperCase().replace(/\.$/, "");
  const words = name.trim().split(/\s+/);
  const written: string[] = [];
  while (words.length) {
    const pair =
      words.length > 1
        ? schools.directoryAbbreviations[
            `${key(words.at(-2)!)} ${key(words.at(-1)!)}`
          ]
        : undefined;
    const full = pair ?? schools.directoryAbbreviations[key(words.at(-1)!)];
    if (!full) break;
    words.splice(words.length - (pair ? 2 : 1));
    written.unshift(cased(full));
  }
  const spoken = [...words, ...written].join(" ");
  const last = key(spoken.split(" ").at(-1)!);
  return schools.bareStageNames.words.includes(last)
    ? `${spoken} ${cased(schools.bareStageNames.suffix)}`
    : spoken;
}

export function buildDeepPast(
  input: CoreInput,
  options: DeepPastOptions = {},
): CoreInput {
  const data = options.data ?? DEFAULT_DEEP_PAST_DATA;
  const p = (key: string) => parameter(key, options.parameters ?? PARAMETERS);
  const marker = stopgap(data.stopgapId);
  const opening = makeIsoDate(input.startedAt);
  const boundary = makeIsoDate(data.throughExclusive);
  const cutoff = opening < boundary ? opening : boundary;
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
  const schoolCache = new Map<string, readonly SchoolRow[]>();
  // Lists read from the county or territory rather than the place itself.
  const broadLists = new Set<readonly SchoolRow[]>();
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

  const grade = (code: string): number | undefined =>
    data.schools.gradesBeforeFirst[code] ??
    (/^\d+$/.test(code) ? Number(code) : undefined);
  // P15 part 3: the public schools of the place teaching this grade, else of
  // its county or counties and the places in them (NCES CCD by P12).
  const schoolRows = (
    placeId: string,
    countyId: string | undefined,
    entryGrade: string,
  ): readonly SchoolRow[] => {
    const key = `${placeId}:${countyId ?? ""}:${entryGrade}`;
    const cached = schoolCache.get(key);
    if (cached) return cached;
    const entry = grade(entryGrade)!;
    const place = corePlaceByJurisdictionId(placeId as EntityId);
    const county = countyId
      ? corePlaceByJurisdictionId(countyId as EntityId)
      : null;
    const teaching = (geoids: readonly string[]) =>
      geoids.flatMap((geoid) =>
        (schoolsAt(geoid) ?? []).filter(([, , lowest, highest]) => {
          const low = grade(lowest);
          const high = grade(highest);
          return (
            low !== undefined &&
            high !== undefined &&
            low <= entry &&
            entry <= high
          );
        }),
      );
    const countyGeoids = county?.sourceGeoid
      ? [county.sourceGeoid]
      : place?.sourceGeoid
        ? countyGeoidsForPlace(place.sourceGeoid)
        : [];
    // Territory places are keyed by name in the school files.
    const placeKey = place?.sourceGeoid ?? place?.key;
    const own = placeKey ? teaching([placeKey]) : [];
    const near = own.length
      ? own
      : teaching([
          ...countyGeoids,
          ...countyGeoids.flatMap(
            (county) => SCHOOLS().placesByCounty[county] ?? [],
          ),
        ]);
    // A place the county geography does not cover (territories, Puerto
    // Rico) reads its whole state or territory.
    const state = place?.stateJurisdictionKey?.split("-").at(-p("one"));
    const covered =
      !!place?.sourceGeoid &&
      countyGeoidsForPlace(place.sourceGeoid).length > p("zero");
    const result =
      near.length || covered || !state
        ? near
        : teaching(SCHOOLS().bucketsByState[state] ?? []);
    if (!own.length) broadLists.add(result);
    schoolCache.set(key, result);
    return result;
  };
  // A place whose own schools are not recorded sends its children to a few
  // schools nearby, not to every school in the county or territory: its
  // catchment is a stable set of the listed schools whose students per grade
  // cover the place's children per grade (its population times the share in
  // one year of age).
  const catchment = (
    rows: readonly SchoolRow[],
    placeId: string,
  ): readonly SchoolRow[] => {
    const geoid = corePlaceByJurisdictionId(placeId as EntityId)?.sourceGeoid;
    const population = geoid
      ? Number(placeReferencePopulation(geoid)?.value)
      : Number.NaN;
    if (!(population > p("zero"))) return rows;
    const children = population * p("schoolCohortPopulationShare");
    const order = rows
      .map((row) => ({
        row,
        at: stableHash(`${input.seed}:${placeId}:${row[0]}`),
      }))
      .sort((a, b) => a.at.localeCompare(b.at))
      .map(({ row }) => row);
    const chosen: SchoolRow[] = [];
    let seats = p("zero");
    for (const row of order) {
      chosen.push(row);
      const [, , lowest, highest, enrollment] = row;
      seats +=
        Math.max(enrollment, p("zero")) /
        (grade(highest)! - grade(lowest)! + p("one"));
      if (seats >= children) break;
    }
    return chosen;
  };
  // Children who live together share a campus, adults each had their own;
  // each school counts by its students per grade.
  const schoolFor = (
    rows: readonly SchoolRow[],
    key: string,
  ): SchoolRow | undefined => {
    const weights = rows.map(([, , lowest, highest, enrollment]) => {
      const grades = grade(highest)! - grade(lowest)! + p("one");
      return Math.max(enrollment, p("zero")) / grades;
    });
    const total = weights.reduce((sum, value) => sum + value, p("zero"));
    const rng = new SeededRng(input.seed).fork(key);
    if (!(total > p("zero"))) return rows.length ? rng.pick(rows) : undefined;
    let point = rng.next() * total;
    for (let i = p("zero"); i < rows.length; i += p("one")) {
      point -= weights[i]!;
      if (point < p("zero")) return rows[i];
    }
    return rows.at(-p("one"));
  };

  const people = input.people.map((person): PersonInput => {
    // Relatives living elsewhere never act, so their own schooling and era
    // history is left until the game simulates them; they keep their family
    // and move facts (SG-P15-kin-light-past).
    if (person.tier === OPENING_KIN.kinTier) {
      stopgap("SG-P15-kin-light-past");
      return person;
    }
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
    const add = (fact: PriorFact, until = cutoff): void => {
      if (fact.date < birth || fact.date >= until) return;
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
        // A cohort that began before the opening is the past even after the
        // deep past's boundary: a 17-year-old started high school in the fall
        // of 2021 (play-stop-08-no-high-school-at-seventeen).
        if (date < birth || date >= opening) continue;
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
            fact.date < opening &&
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
        stopgap(SCHOOLS().stopgapId);
        const rng = new SeededRng(input.seed).fork(
          `${data.version}:${placeId}:${stage.id}:school-identity`,
        );
        // Only a school the national directory lists by the year this cohort
        // started there (audit 1: no 2015 campus for a 1960s class).
        const listed = schoolRows(placeId, countyId, stage.entryGrade);
        const opened = listed.filter(([id]) => schoolOpenBy(id, year));
        const open = broadLists.has(listed)
          ? catchment(opened, placeId)
          : opened;
        const school = schoolFor(
          open,
          `${data.version}:${ageOnDate(birth, opening) < p("benchmarkAdultMinimumAge") ? person.householdId : person.id}:${placeId}:${stage.id}:campus`,
        );
        const [campusId, campusName] = school ?? [];
        const spokenCampus = campusName
          ? campusSpokenName(campusName, data.schools)
          : undefined;
        const schoolName =
          spokenCampus ??
          `${rng.pick(SCHOOL_NAMES.features)} ${stage.nameSuffix}`;
        const source: Source = {
          tag: "ESTIMATED",
          asOf: input.startedAt,
          citation: `${data.schools.source}${school ? ` ${SCHOOLS().citation} NCES-CCD:${campusId}, ${campusName}. ${FIRST_YEARS().source.citation}` : " No public school teaching this grade is recorded as open in that year for the place or its county; generated landscape name."}`,
          estimatedFrom: `Birth cohort calendar; ${located ? "recorded residence" : birthplace ? "recorded birthplace used as a schooling-location proxy" : "opening locality used as a schooling-location proxy"}. Historical attendance and historical name/existence are not verified; no qualification or graduation inferred.`,
        };
        add(
          {
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
              ...(school
                ? {
                    institutionSourceId: campusId!,
                    institutionSourceKey: "NCES-CCD",
                    institutionName: campusName!,
                    institutionKind: stage.id,
                    directoryAsOf: SCHOOLS().asOf,
                  }
                : {}),
              campusIdentity: school ? "historical-name-proxy" : "generated",
              attendance: "cohort-estimate",
              qualification: "not-inferred",
              stopgapId: marker.id,
            },
          },
          opening,
        );
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
  // context, by the same rule the benchmark player had, and knows the
  // coworkers of their workgroup since the later of their start dates.
  const circles = [DEFAULT_OPENING_PEER_DATA, OPENING_COWORKER_DATA];
  const residentIds = people
    .filter((person) => person.tier !== OPENING_KIN.kinTier)
    .map((person) => person.id);
  let withPast: CoreInput = {
    ...input,
    people,
    // The circle steps append their own gaps; keep them last on every rebuild.
    gaps: [...gaps].filter(
      (gap) => !circles.some((circle) => circle.scopeGap === gap),
    ),
  };
  // A coworker's context is their opening job: employer and title come from
  // the job record the work:opening fact belongs to.
  const jobContext = (
    person: PersonInput,
    fact: PriorFact,
  ): Readonly<Record<string, string>> | undefined => {
    const job = person.jobId ? jobById.get(person.jobId) : undefined;
    return job && fact.id.startsWith(`${job.id}:`)
      ? { organizationId: job.organizationId, title: job.title }
      : undefined;
  };
  // The world has a past: each household's shared history and the moments
  // its members remember (owner, Oct 14, 2026).
  withPast = addFamilyHistories(withPast, OPENING_KIN.kinTier, data.version);
  for (const circle of circles)
    withPast = buildOpeningPeerContacts(withPast, {
      personIds: residentIds,
      data: circle,
      ...(options.peerCohortSize
        ? {
            cohortSize: (contextKey: string, present: number) =>
              options.peerCohortSize!(circle.version, contextKey, present),
          }
        : {}),
      ...(circle === OPENING_COWORKER_DATA
        ? { contextValues: jobContext }
        : {}),
    }).input;
  const result: CoreInput & {
    priorFactsSource: readonly DeepPastFieldSource[];
  } = { ...withPast, priorFactsSource: reports };
  return result;
}
