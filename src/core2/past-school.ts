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
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartWindow,
} from "./pre-start";
import { residenceOn } from "./past-moves";
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
  const name = core.organizations.get(schoolId)?.name;
  if (!name) stopgap("SG-HIST-school-elsewhere-unnamed");
  return name;
}

export const SCHOOL_STARTED = "school.started";
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
  }
  return rows;
}

/**
 * Everyone the school years before the start are run for: the full people
 * alive at the opening. Relatives living elsewhere are run when the game
 * first simulates them (SG-P15-kin-light-past).
 */
function schoolPeople(core: Readonly<CoreState>) {
  stopgap("SG-P15-kin-light-past");
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

/** The school years of people filled in after the run, by the same rule. */
export function schoolHistoryFor(
  core: CoreState,
  people: readonly Readonly<PersonState>[],
): void {
  const window = preStartWindowOf(core);
  if (!window) return;
  const fresh = people.filter(
    (person) =>
      !preStartHistory(core, { kind: SCHOOL_STARTED, personId: person.id })
        .length,
  );
  recordPreStartLater(
    core,
    SCHOOL_MODULE_ID,
    schoolRecords(core, fresh, window),
  );
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
