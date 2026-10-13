import { OPENING_KIN } from "./opening-kin";
import { addOpeningFallingOuts } from "./opening-falling-outs";
import { addOpeningFavors } from "./opening-favors";
import firstYearsJson from "./data/school-first-years.json" with { type: "json" };
import {
  buildOpeningPeerContacts,
  DEFAULT_OPENING_PEER_DATA,
  type OpeningPeerData,
} from "./opening-peer-network";
import schoolsJson from "./data/opening-schools.json" with { type: "json" };
import privateSchoolsJson from "./data/opening-private-schools.json" with { type: "json" };
import { profileFor } from "./opening-profile";
import { ageOnDate, daysBetween, makeIsoDate } from "../simulation/dates";
import { countyGeoidsForPlace } from "../simulation/government-units";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { stableHash } from "../simulation/ids";
import { SeededRng } from "../simulation/rng";
import { kindergartenYear, onCalendar } from "../simulation/school-calendar";
import { SCHOOL_NAMES_V3 } from "../simulation/school-names";
import type { EntityId } from "../simulation/types";
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
const SCHOOLS = schoolsJson as unknown as {
  stopgapId: string;
  asOf: string;
  citation: string;
  byGeoid: Readonly<Record<string, readonly SchoolRow[]>>;
  placesByCounty: Readonly<Record<string, readonly string[]>>;
  bucketsByState: Readonly<Record<string, readonly string[]>>;
};

/** NCES PSS private schools by county, with each state's private share. */
const PRIVATE_SCHOOLS = privateSchoolsJson as unknown as {
  asOf: string;
  citation: string;
  shareCitation: string;
  byCounty: Readonly<
    Record<string, readonly (readonly [...SchoolRow, orientation: string])[]>
  >;
  shareByState: Readonly<Record<string, number>>;
};

/** Each private school's affiliation (Catholic, other religious, nonsectarian). */
const PRIVATE_ORIENTATION = new Map(
  Object.values(PRIVATE_SCHOOLS.byCounty).flatMap((rows) =>
    rows.map((row) => [row[0], row[5]] as const),
  ),
);

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
const FIRST_YEARS = firstYearsJson as unknown as {
  snapshots: readonly number[];
  firstYear: Readonly<Record<string, number>>;
  source: { citation: string };
};

/**
 * Whether the directory lists a school by a cohort's year: listed in the
 * first snapshot counts for any earlier year (it may be older); a school in
 * no snapshot opened after the last one.
 */
export function schoolOpenBy(id: string, year: number): boolean {
  const [earliest, next] = FIRST_YEARS.snapshots as [number, number];
  const latest = Math.max(...FIRST_YEARS.snapshots);
  const first = FIRST_YEARS.firstYear[id] ?? latest + (next - earliest);
  return first <= Math.max(year, earliest);
}

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
    const place = lifePlaceByJurisdictionId(placeId as EntityId);
    const county = countyId
      ? lifePlaceByJurisdictionId(countyId as EntityId)
      : null;
    const teaching = (geoids: readonly string[]) =>
      geoids.flatMap((geoid) =>
        (SCHOOLS.byGeoid[geoid] ?? []).filter(([, , lowest, highest]) => {
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
            (county) => SCHOOLS.placesByCounty[county] ?? [],
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
        : teaching(SCHOOLS.bucketsByState[state] ?? []);
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
    const geoid = lifePlaceByJurisdictionId(placeId as EntityId)?.sourceGeoid;
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

  // P15: which households with children at home send them to private school.
  // Their own means decide who (household earnings and savings, each ranked
  // among the state's households with children in this town); the state's
  // private share (NCES) sets how many, among households whose county has a
  // private school.
  const countyGeoidsOf = (placeId: string, countyId?: string) => {
    const county = countyId
      ? lifePlaceByJurisdictionId(countyId as EntityId)
      : null;
    const place = lifePlaceByJurisdictionId(placeId as EntityId);
    return county?.sourceGeoid
      ? [county.sourceGeoid]
      : place?.sourceGeoid
        ? countyGeoidsForPlace(place.sourceGeoid)
        : [];
  };
  const privateHouseholds = new Set<string>();
  {
    const childAge = p("benchmarkAdultMinimumAge");
    const households = new Map<
      string,
      { state: string; earnings: number; savings: number }
    >();
    const withChildren = new Set(
      input.people
        .filter(
          (person) =>
            person.tier !== OPENING_KIN.kinTier &&
            ageOnDate(makeIsoDate(person.birthDate), opening) < childAge,
        )
        .map((person) => person.householdId),
    );
    for (const person of input.people) {
      if (
        person.tier === OPENING_KIN.kinTier ||
        !withChildren.has(person.householdId)
      )
        continue;
      const state = lifePlaceByJurisdictionId(person.placeId as EntityId)
        ?.stateJurisdictionKey?.split("-")
        .at(-p("one"));
      const hasPrivate = countyGeoidsOf(person.placeId, person.countyId).some(
        (geoid) => PRIVATE_SCHOOLS.byCounty[geoid]?.length,
      );
      if (!state || !hasPrivate) continue;
      const row = households.get(person.householdId) ?? {
        state,
        earnings: p("zero"),
        savings: p("zero"),
      };
      const job = person.jobId ? jobById.get(person.jobId) : undefined;
      row.earnings += job?.wageDailyMinor ?? p("zero");
      row.savings += person.liquidMinor ?? p("zero");
      households.set(person.householdId, row);
    }
    const byState = new Map<string, string[]>();
    for (const [id, row] of households)
      byState.set(row.state, [...(byState.get(row.state) ?? []), id]);
    for (const [state, ids] of byState) {
      const rank = (field: "earnings" | "savings") => {
        const sorted = [...ids].sort(
          (a, b) =>
            households.get(a)![field] - households.get(b)![field] ||
            a.localeCompare(b),
        );
        return new Map(sorted.map((id, at) => [id, at]));
      };
      const earnings = rank("earnings");
      const savings = rank("savings");
      const count = Math.round(
        (PRIVATE_SCHOOLS.shareByState[state] ?? p("zero")) * ids.length,
      );
      [...ids]
        .sort(
          (a, b) =>
            earnings.get(b)! +
              savings.get(b)! -
              (earnings.get(a)! + savings.get(a)!) || a.localeCompare(b),
        )
        .slice(p("zero"), count)
        .forEach((id) => privateHouseholds.add(id));
    }
  }
  // A family's faith picks the kind of private school: a Catholic family's
  // child goes to a Catholic school, another faith's to a religious one, a
  // family with none to a nonsectarian one, where the county has one.
  const householdFaith = new Map<string, string>();
  for (const person of [...input.people].sort(
    (a, b) =>
      a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
  )) {
    if (householdFaith.has(person.householdId)) continue;
    const faith = profileFor(person, input.seed, input.startedAt)?.faith;
    if (faith) householdFaith.set(person.householdId, faith);
  }
  const ORIENTATION_BY_FAITH: Readonly<Record<string, string>> = {
    catholic: "catholic",
    none: "nonsectarian",
  };
  const privateRows = (
    placeId: string,
    countyId: string | undefined,
    entryGrade: string,
    faith: string | undefined,
  ): readonly SchoolRow[] => {
    const entry = grade(entryGrade)!;
    const want = faith
      ? (ORIENTATION_BY_FAITH[faith] ?? "other-religious")
      : undefined;
    const teaching = countyGeoidsOf(placeId, countyId).flatMap((geoid) =>
      (PRIVATE_SCHOOLS.byCounty[geoid] ?? []).filter(
        ([, , lowest, highest]) => {
          const low = grade(lowest);
          const high = grade(highest);
          return (
            low !== undefined &&
            high !== undefined &&
            low <= entry &&
            entry <= high
          );
        },
      ),
    );
    const matching = teaching.filter((row) => row[5] === want);
    return (matching.length ? matching : teaching).map(
      ([id, name, lowest, highest, enrollment]) =>
        [id, name, lowest, highest, enrollment] as const,
    );
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
        stopgap(SCHOOLS.stopgapId);
        const rng = new SeededRng(input.seed).fork(
          `${data.version}:${placeId}:${stage.id}:school-identity`,
        );
        // Only a school the national directory lists by the year this cohort
        // started there (audit 1: no 2015 campus for a 1960s class).
        // A child whose household chose private school attends one in the
        // county teaching their grade, where one is listed.
        const privateOpen =
          privateHouseholds.has(person.householdId) &&
          ageOnDate(birth, opening) < p("benchmarkAdultMinimumAge")
            ? privateRows(
                placeId,
                countyId,
                stage.entryGrade,
                householdFaith.get(person.householdId),
              )
            : [];
        const isPrivate = privateOpen.length > p("zero");
        const listed = schoolRows(placeId, countyId, stage.entryGrade);
        const opened = listed.filter(([id]) => schoolOpenBy(id, year));
        const open = isPrivate
          ? privateOpen
          : broadLists.has(listed)
            ? catchment(opened, placeId)
            : opened;
        const school = schoolFor(
          open,
          `${data.version}:${ageOnDate(birth, opening) < p("benchmarkAdultMinimumAge") ? person.householdId : person.id}:${placeId}:${stage.id}:campus`,
        );
        const [campusId, campusName] = school ?? [];
        const schoolName =
          campusName ??
          `${rng.pick(SCHOOL_NAMES_V3.features)} ${stage.nameSuffix}`;
        const source: Source = {
          tag: "ESTIMATED",
          asOf: input.startedAt,
          citation: `${data.schools.source}${
            school && isPrivate
              ? ` ${PRIVATE_SCHOOLS.citation} NCES-PSS:${campusId}, ${campusName}. ${PRIVATE_SCHOOLS.shareCitation}`
              : school
                ? ` ${SCHOOLS.citation} NCES-CCD:${campusId}, ${campusName}. ${FIRST_YEARS.source.citation}`
                : " No public school teaching this grade is recorded as open in that year for the place or its county; generated landscape name."
          }`,
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
            ...(school
              ? {
                  institutionSourceId: campusId!,
                  institutionSourceKey: isPrivate ? "NCES-PSS" : "NCES-CCD",
                  ...(isPrivate
                    ? {
                        schoolControl: "private",
                        schoolAffiliation:
                          PRIVATE_ORIENTATION.get(campusId!) ?? "",
                      }
                    : {}),
                  institutionName: campusName!,
                  institutionKind: stage.id,
                  directoryAsOf: isPrivate
                    ? PRIVATE_SCHOOLS.asOf
                    : SCHOOLS.asOf,
                }
              : {}),
            campusIdentity: school ? "historical-name-proxy" : "generated",
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
  // P15 part 3: pairs who shared a class or workgroup may have fallen out.
  withPast = addOpeningFallingOuts(withPast);
  // P15 part 3: at a recorded move, people the mover knew may have helped.
  withPast = addOpeningFavors(withPast);
  const result: CoreInput & {
    priorFactsSource: readonly DeepPastFieldSource[];
  } = { ...withPast, priorFactsSource: reports };
  return result;
}
