/**
 * The school years (owner, Oct 28, 2026: "simulate to the birth year...
 * general to make the game flow"): the one school calendar every child
 * shares, the school engine's rule for which school a child of a place
 * attends, its run of the years before the start, and the reader every
 * screen and scene uses for where a person went to school.
 */
import data from "./data/school-days.json" with { type: "json" };
import { makeIsoDate } from "./kernel/dates";
import {
  kindergartenYear,
  onCalendar,
  SCHOOL_STAGE_CALENDAR,
} from "./past-school-calendar";
import {
  ownWindowOf,
  preStartHistory,
  recordPreStartLater,
  wholePastOnce,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartWindow,
} from "./pre-start";
import { ownPastKind } from "./own-past-kinds";
import { residenceOn } from "./past-moves";
import { elsewhereSchoolName } from "./places-elsewhere";
import {
  collegeYearsOf,
  educationLevelOf,
  highSchoolEndOf,
  schoolingEndsOf,
} from "./past-work";
import { hasModuleState } from "./module-state";
import { coreAPI } from "./state";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState, PersonId, PersonState } from "./types";

/** The school engine's id: its table of who attended which school in play (src/core2/modules/school.ts). */
const SCHOOL_MODULE_ID = data.version;
/** Relatives living elsewhere: inactive until the game simulates them (src/core2/data/opening-kin.json). */
const KIN_TIER = "husk";

/** Each place's school district, found once per world (a cache). */
const schools = new WeakMap<object, Map<string, string | undefined>>();

/** The school a child of a place attends: its public school district, else the place's schools as the place itself. */
export function schoolOfPlace(
  core: Readonly<CoreState>,
  placeId: string,
): string {
  let byPlace = schools.get(core);
  if (!byPlace) schools.set(core, (byPlace = new Map()));
  if (!byPlace.has(placeId)) {
    let found: string | undefined;
    for (const org of core.organizations.values())
      if (
        org.placeId === placeId &&
        org.classification === data.schoolClassification
      ) {
        found = org.id;
        break;
      }
    byPlace.set(placeId, found);
  }
  // No district record yet (a world opened without the core's public-school
  // step, or a place the world does not keep): the place's schools stand as
  // the place itself.
  return byPlace.get(placeId) ?? `${data.placeTargetPrefix}${placeId}`;
}

/** A school's name, from its organization's own record; a place's schools with no record have none. */
export function schoolName(
  core: Readonly<CoreState>,
  schoolId: string,
): string | undefined {
  // A place the world keeps no district for: its schools named from the place.
  const name =
    core.organizations.get(schoolId)?.name ?? elsewhereSchoolName(schoolId);
  if (!name) stopgap("SG-HIST-school-elsewhere-unnamed");
  return name;
}

export const SCHOOL_STARTED = ownPastKind("school.started");
/** The end of high school before the start: the diploma's day, the school it was from. */
export const SCHOOL_FINISHED = ownPastKind("school.finished");
/** The fall after high school, for someone whose schooling went on to college. */
export const COLLEGE_STARTED = ownPastKind("school.college-started");
/** The end of college: a bachelor's for `college`, the years of `some-college` without one. */
export const COLLEGE_ENDED = ownPastKind("school.college-ended");
/** The past's school kinds a person's own run writes, restated together. */
const OWN_SCHOOL_KINDS = [
  SCHOOL_STARTED,
  SCHOOL_FINISHED,
  COLLEGE_STARTED,
  COLLEGE_ENDED,
] as const;

/**
 * The years after kindergarten each stage starts, from the parameter table
 * (ESTIMATED from the CPS October 2024 modal ages by grade).
 */
const STAGE_STARTS = [
  ["elementary", "zero"],
  ["middle", "deepPastMiddleSchoolOffsetYears"],
  ["high", "deepPastHighSchoolOffsetYears"],
] as const;
type Stage = (typeof STAGE_STARTS)[number][0];
/** The stage a grade is in (0 is kindergarten). */
function stageOf(core: Readonly<CoreState>, grade: number): Stage {
  const api = coreAPI(core as CoreState);
  let stage: Stage = STAGE_STARTS[0][0];
  for (const [row, key] of STAGE_STARTS)
    if (api.parameter(key) <= grade) stage = row;
  return stage;
}

/**
 * The school years before the start (owner, Oct 28, 2026: "simulate to the
 * birth year... general"), a year at a step: each school year a full person
 * was of school age inside the run, they attended the school this engine
 * gives a child of the place they lived that year (`schoolOfPlace`, the same
 * rule as a school day in play), at the stage the one school calendar puts
 * them in. A record is written when the stage or the school changes: the
 * first year at each school. Nothing is drawn.
 */
function schoolRecords(
  core: Readonly<CoreState>,
  people: readonly Readonly<PersonState>[],
  window: PreStartWindow,
): Omit<HistoryRecord, "moduleId">[] {
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  for (const person of people) {
    const kindergarten = kindergartenYear(makeIsoDate(person.birthDate));
    let last: string | undefined;
    for (
      let grade = 0;
      grade < SCHOOL_STAGE_CALENDAR.endsAfterYears.high;
      grade += 1
    ) {
      const year = kindergarten + grade;
      const date = onCalendar(year, "starts");
      if (date > window.through) break;
      if (date < window.from) continue;
      const stage = stageOf(core, grade);
      const lived = residenceOn(core, person, date);
      const schoolId = schoolOfPlace(core, lived.placeId);
      const key = `${stage}:${schoolId}`;
      if (key === last) continue;
      last = key;
      rows.push({
        id: `${SCHOOL_STARTED}:${person.id}:${year}`,
        date,
        kind: SCHOOL_STARTED,
        placeId: lived.placeId,
        personIds: [person.id],
        facts: {
          personId: person.id,
          schoolId,
          stage,
          grade,
          schoolYear: year,
          residenceRecordId: lived.recordId,
        },
        publicRecord: false,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation:
            "The school engine's own rule (the public school district of the place the child lived that school year) on the one school calendar (src/core2/past-school-calendar.ts).",
          estimatedFrom:
            "The person's birth date and the place their records put them that year (src/core2/past-moves.ts).",
        },
      });
    }
    rows.push(...schoolEndRecords(core, person, window));
  }
  return rows;
}

/**
 * The end of school before the start (gap sheet, Nov 12, row 15): the day
 * high school ended, from the school they were at, and for a person whose
 * level is `some-college` or `college`, the fall they started college and the
 * day it ended, by the level's usual length (the same years the work pass
 * waits before a first job, so the two never disagree). Nothing is drawn: the
 * level is the opening profile's, the days are the one calendar's.
 */
function schoolEndRecords(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  window: PreStartWindow,
): Omit<HistoryRecord, "moduleId">[] {
  // A relative elsewhere is read on the opening day, as the work pass reads
  // them, so their past is the same whenever their card is opened.
  const on = person.tier === KIN_TIER ? core.startedAt : core.date;
  const level = educationLevelOf(core, person, on);
  if (!level) return [];
  const api = coreAPI(core as CoreState);
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  const inside = (date: string) =>
    date >= window.from && date <= window.through;
  const source = (estimatedFrom: string) => ({
    tag: "ESTIMATED" as const,
    asOf: core.date,
    citation:
      "The one school calendar (src/core2/past-school-calendar.ts) and the IPEDS program lengths (pastWorkCollegeYears, pastWorkSomeCollegeYears in src/core2/data/parameters.json).",
    estimatedFrom,
  });
  const graduated = highSchoolEndOf(person);
  // Every adult the profile gives a level finished high school: the CES
  // levels fold the adults without a diploma into `no-college`.
  // stopgapId: SG-HIST-past-no-college-all-graduated
  stopgap("SG-HIST-past-no-college-all-graduated", core as CoreState);
  if (inside(graduated)) {
    const lived = residenceOn(core, person, graduated);
    const last = preStartHistory(core as CoreState, {
      kind: SCHOOL_STARTED,
      personId: person.id,
    }).at(-1);
    rows.push({
      id: `${SCHOOL_FINISHED}:${person.id}`,
      date: makeIsoDate(graduated),
      kind: SCHOOL_FINISHED,
      placeId: lived.placeId,
      personIds: [person.id],
      facts: {
        personId: person.id,
        schoolId: String(
          last?.facts.schoolId ?? schoolOfPlace(core, lived.placeId),
        ),
        stage: "high",
        passed: "true",
        level,
        residenceRecordId: lived.recordId,
      },
      publicRecord: false,
      source: source(
        "The person's birth date (the class they were in) and their schooling level (profile:education).",
      ),
    });
  }
  const years = collegeYearsOf(api, level);
  if (!years) return rows;
  const began = onCalendar(
    kindergartenYear(makeIsoDate(person.birthDate)) +
      SCHOOL_STAGE_CALENDAR.endsAfterYears.high,
    "starts",
  );
  const ended = schoolingEndsOf(core, person, on);
  const lived = residenceOn(core, person, began);
  for (const [kind, date] of [
    [COLLEGE_STARTED, began],
    [COLLEGE_ENDED, ended],
  ] as const) {
    if (!inside(date)) continue;
    rows.push({
      id: `${kind}:${person.id}`,
      date: makeIsoDate(date),
      kind,
      placeId: lived.placeId,
      personIds: [person.id],
      facts: {
        personId: person.id,
        level,
        years,
        degree: level === "college" ? "bachelor" : "",
      },
      publicRecord: false,
      source: source(
        `The person's schooling level (${level}) and its usual length, ${years} years from the fall after high school.`,
      ),
    });
  }
  return rows;
}

/**
 * Everyone the school years before the start are run for: the full people
 * alive at the opening. A relative living elsewhere is run when their card is
 * first opened (`openWholePast`, src/core2/modules/people.ts).
 */
function schoolPeople(core: Readonly<CoreState>) {
  return [...core.people.values()].filter(
    (person) => person.alive && person.tier !== KIN_TIER,
  );
}

export function schoolHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
): void {
  for (const row of schoolRecords(api.state, schoolPeople(api.state), window))
    history.record(row);
}

/**
 * A person's school years over their own life, once (the owner's ruling,
 * Nov 9, 2026): the same rule as the run, over the window from their birth.
 * A full person's clipped records are restated, not kept beside it.
 */
export function schoolHistoryFor(
  core: CoreState,
  people: readonly Readonly<PersonState>[],
): void {
  for (const person of people) {
    const window = ownWindowOf(core, person);
    if (!window || !wholePastOnce(core, person.id, "school")) continue;
    const held = OWN_SCHOOL_KINDS.flatMap((kind) =>
      preStartHistory(core, { kind, personId: person.id }).map((row) => row.id),
    );
    recordPreStartLater(
      core,
      SCHOOL_MODULE_ID,
      schoolRecords(core, [person], window),
      { person: person.id, drop: held },
    );
  }
}

/** A school a person attended: where, from when, at what stage, by its record. */
export interface SchoolAttended {
  recordId: string;
  schoolId: string;
  name?: string;
  stage: string;
  /** The first grade there: 0 is kindergarten. */
  grade: number;
  date: string;
}

/** The school a person attends in play, from the school engine's own table, where the engine keeps one. */
function attendedNow(
  core: Readonly<CoreState>,
  personId: string,
): { schoolId?: string; date?: string } | undefined {
  if (!hasModuleState(core as CoreState, SCHOOL_MODULE_ID)) return undefined;
  return coreAPI(core as CoreState)
    .moduleState(SCHOOL_MODULE_ID)
    .table("attended")
    .get(personId) as unknown as
    { schoolId?: string; date?: string } | undefined;
}

/**
 * The schools a person attended, oldest first: the run's records before the
 * start, then the school they attend in play where it is a new one.
 */
export function schoolsAttended(
  core: Readonly<CoreState>,
  personId: string,
): SchoolAttended[] {
  const rows: SchoolAttended[] = preStartHistory(core as CoreState, {
    kind: SCHOOL_STARTED,
    personId: personId as PersonId,
  }).map((row) => {
    const schoolId = String(row.facts.schoolId);
    const name = schoolName(core, schoolId);
    return {
      recordId: row.id,
      schoolId,
      ...(name ? { name } : {}),
      stage: String(row.facts.stage),
      grade: Number(row.facts.grade),
      date: row.date,
    };
  });
  const now = attendedNow(core, personId);
  if (now?.schoolId && now.schoolId !== rows.at(-1)?.schoolId) {
    const name = schoolName(core, now.schoolId);
    const person = core.people.get(personId as PersonId);
    const grade = person
      ? (now.date!.slice(5) >= data.schoolYear.firstDay
          ? Number(now.date!.slice(0, 4))
          : Number(now.date!.slice(0, 4)) - 1) -
        kindergartenYear(makeIsoDate(person.birthDate))
      : 0;
    rows.push({
      recordId: `${SCHOOL_MODULE_ID}:attended:${personId}`,
      schoolId: now.schoolId,
      ...(name ? { name } : {}),
      stage: stageOf(core, grade),
      grade,
      date: now.date!,
    });
  }
  return rows;
}

/** A run of school years at one school: its first and last school year (by calendar year the year starts in), and the record it opens on. */
export interface SchoolSpan {
  schoolId: string;
  from: number;
  to: number;
  recordId: string;
  /** The run ends with the person's last school year (they graduate from it). */
  final?: boolean;
}

/**
 * The school years a person spent at each school, read from their school
 * records: a record opens a run at its school, and the run lasts until the
 * next record or, for the last one, until the person's last school year or
 * today's school year, whichever comes first.
 */
export function schoolSpans(
  core: Readonly<CoreState>,
  personId: string,
): SchoolSpan[] {
  const person = core.people.get(personId as PersonId);
  if (!person) return [];
  const rows = schoolsAttended(core, personId);
  if (!rows.length) return [];
  const kindergarten = kindergartenYear(makeIsoDate(person.birthDate));
  const today = Number(core.date.slice(0, 4));
  const thisYear =
    core.date.slice(5) >= data.schoolYear.firstDay ? today : today - 1;
  const lastYear = Math.min(
    kindergarten + SCHOOL_STAGE_CALENDAR.endsAfterYears.high - 1,
    thisYear,
  );
  return rows.map((row, index) => {
    const from = kindergarten + row.grade;
    const next = rows[index + 1];
    const graduation =
      kindergarten + SCHOOL_STAGE_CALENDAR.endsAfterYears.high - 1;
    const to = next ? kindergarten + next.grade - 1 : lastYear;
    return {
      schoolId: row.schoolId,
      from,
      to,
      recordId: row.recordId,
      ...(!next && to === graduation ? { final: true } : {}),
    };
  });
}
