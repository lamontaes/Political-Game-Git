/**
 * School honors (the town paper's side stories): a spelling bee won at the
 * regional level, a senior signing to play at a Division I school. Each honor
 * is a data row (src/core2/data/school/honors.json) with the real calendar
 * day it is decided on, the grades it is open to and the national rate: the
 * winners a year over the students nationally in those grades. Both tiers
 * follow one rule. A place's expected count is its students of those grades
 * times the rate, a counted student standing for as many real students as
 * their household's weight; the students who rank highest clear in order
 * (the school engine's `clearsInOrder`), and the fraction left over carries
 * to the next year, so a small town gets an honor every few years and a
 * large one every year. There is no roll: the rank is the student's own
 * standing (attendance and study traits) plus the honor's own traits.
 *
 * A bee (the local spelling bee) needs no rate: it crowns one winner in
 * every place with students of its grades, the highest-ranked, and a counted
 * winner is one winner, never named.
 *
 * An honor is kept as a row in the school module's `honors` table and
 * recorded as a public `school.honor` event (the press wire takes every
 * public record), naming the full students among those honored; counted
 * students are only counted ("three players"), never named.
 */
import data from "./data/school/honors.json" with { type: "json" };
import schoolDays from "./data/school-days.json" with { type: "json" };
import outcomes from "./data/school/outcomes.json" with { type: "json" };
import { ageOn } from "./counted-groups";
import { countedHouseholdsByPlace } from "./modules/residents";
import { schoolName, schoolOfPlace } from "./past-module";
import { SCHOOL_MODULE_ID } from "./school-measures";
import {
  clearsInOrder,
  schoolStartYear,
  studentsByPlace,
  type Student,
} from "./school-outcomes";
import type { CoreAPI, CoreState, PersonId } from "./types";

export const SCHOOL_HONOR_EVENT = data.event;

/** When an honor is decided: a fixed day of a month, or the nth weekday of a month. */
interface HonorDay {
  readonly month: string;
  readonly date?: string;
  readonly weekday?: number;
  readonly nth?: number;
}

/** What the numbers of an honor rest on: its tag, where they come from and how they were reached. */
interface HonorBasis {
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly source: string;
  readonly derivation: string;
}

/** A national rate: the winners a year over the students nationally in the honor's grades. */
interface HonorRate extends HonorBasis {
  readonly winnersPerYear: number;
  readonly studentsNationally: number;
}

/** A fixed number of winners in every place with students of the honor's grades (a bee always crowns its winner). */
interface HonorWinners extends HonorBasis {
  readonly perPlace: number;
}

/**
 * One honor, as the data file holds it: either a national `rate` (the places'
 * expected counts carry across years) or `winners` per place (a count that
 * needs no rate).
 */
export interface HonorDefinition {
  readonly key: string;
  readonly tier: string;
  readonly grades: readonly number[];
  readonly day: HonorDay;
  readonly rate?: HonorRate;
  readonly winners?: HonorWinners;
  /** The traits (besides the school standing) that rank students for it. */
  readonly traits: readonly string[];
  readonly stopgaps: readonly string[];
}

export const HONORS = data.honors as unknown as readonly HonorDefinition[];

/** One honor kept for one place on one day: who was honored and what the place was owed. */
export interface SchoolHonorRow {
  readonly id: string;
  readonly honor: string;
  readonly tier: string;
  readonly placeId: string;
  readonly schoolId: string;
  readonly date: string;
  readonly startYear: number;
  /** Real students honored: the full students plus the counted students' household weights (a bee's winner is one). */
  readonly count: number;
  /** The full students among them; counted students are only counted. */
  readonly personIds: readonly string[];
  /** Real students of the honor's grades in the place that day. */
  readonly students: number;
  /** A rate honor's national rate. */
  readonly rate?: number;
  /** The place's expected count today: students times the rate, or the winners a place always crowns. */
  readonly expected: number;
  /** A rate honor: what the place was owed (the remainder carried in, plus today's expected) and what it still is after. */
  readonly owedBefore?: number;
  readonly owedAfter?: number;
  readonly eventId: string;
}

const stateOf = (api: CoreAPI) => api.moduleState(SCHOOL_MODULE_ID);

/** The honor's national rate: winners a year over students nationally, per student of its grades. */
export function honorRate(honor: HonorDefinition): number {
  if (!honor.rate)
    throw new Error(`${honor.key} crowns winners per place and has no rate`);
  return honor.rate.winnersPerYear / honor.rate.studentsNationally;
}

/** What an honor's numbers rest on, for the record's source. */
function basisOf(honor: HonorDefinition): HonorBasis {
  const basis = honor.rate ?? honor.winners;
  if (!basis) throw new Error(`${honor.key} has neither a rate nor winners`);
  return basis;
}

/** Whether `date` is the day the honor is decided (the month is checked first, so most days are one comparison). */
export function isHonorDay(date: string, day: HonorDay): boolean {
  if (date.slice(5, 7) !== day.month) return false;
  if (day.date !== undefined) return date.slice(8) === day.date;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const nth =
    Math.floor((Number(date.slice(8)) - 1) / data.calendar.daysPerWeek) + 1;
  return weekday === day.weekday && nth === day.nth;
}

/** The honors decided on this date, if any. */
export function honorsOn(date: string): readonly HonorDefinition[] {
  return HONORS.filter((honor) => isHonorDay(date, honor.day));
}

/** The students ranked by score, highest first; a tie goes to the lower id, so the same world always ranks the same. */
function rankStudents(
  students: readonly Student[],
  score: (student: Student) => number,
): Student[] {
  return [...students].sort(
    (a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1),
  );
}

/**
 * A bee's winners in one place: the highest-ranked students, `winners` of
 * them, whatever the place's students number. A counted student who wins is
 * one winner, not their household's weight. Pure.
 */
export function crownWinners(
  students: readonly Student[],
  score: (student: Student) => number,
  winners: number,
): {
  readonly ranked: readonly Student[];
  readonly crowned: readonly Student[];
  readonly total: number;
} {
  const ranked = rankStudents(students, score);
  return {
    ranked,
    crowned: ranked.slice(0, winners),
    total: ranked.reduce((n, s) => n + s.weight, 0),
  };
}

/**
 * One place's honor for one day. The students rank by score, highest first
 * (ties by id); the owed share (carried remainder plus the expected count) is
 * spent down them in order. Pure: the caller keeps the carry and the records.
 */
export function clearHonor(
  students: readonly Student[],
  score: (student: Student) => number,
  rate: number,
  carried: number,
): {
  readonly ranked: readonly Student[];
  readonly cleared: readonly Student[];
  readonly total: number;
  readonly expected: number;
  readonly owedBefore: number;
  readonly owedAfter: number;
} {
  const ranked = rankStudents(students, score);
  const total = ranked.reduce((n, s) => n + s.weight, 0);
  const expected = total * rate;
  const owedBefore = carried + expected;
  const clears = clearsInOrder(
    ranked.map((s) => s.weight),
    owedBefore,
  );
  const cleared = ranked.filter((_, at) => clears[at]);
  const owedAfter = cleared.reduce((owed, s) => owed - s.weight, owedBefore);
  return { ranked, cleared, total, expected, owedBefore, owedAfter };
}

/** The mean of the listed traits (a trait not recorded counts as none), as the school standing reads its own. */
function traitMean(
  traits: Readonly<Record<string, number>> | undefined,
  keys: readonly string[],
): number {
  if (!keys.length || !traits) return 0;
  return keys.reduce((n, key) => n + (traits[key] ?? 0), 0) / keys.length;
}

/**
 * A student's rank for an honor: the school engine's standing (attendance and
 * the study traits) plus the honor's own traits, averaged and weighted as the
 * standing weighs its traits. An honor with no traits ranks on standing alone.
 */
export function honorScore(
  standing: number,
  traits: Readonly<Record<string, number>> | undefined,
  honor: Pick<HonorDefinition, "traits">,
  traitWeight: number,
): number {
  return standing + traitWeight * traitMean(traits, honor.traits);
}

/**
 * The traits of every counted student of the honor's grades, by id: a counted
 * student is not a person of the world, so the household record holds them.
 */
function countedTraits(
  core: CoreState,
  grades: readonly number[],
  startYear: number,
): Map<string, Readonly<Record<string, number>>> {
  const ages = new Set(grades.map((grade) => outcomes.gradeAgeFirst + grade));
  const sept = `${startYear}-${schoolDays.schoolYear.firstDay}`;
  const byId = new Map<string, Readonly<Record<string, number>>>();
  for (const records of countedHouseholdsByPlace(core).values())
    for (const record of records)
      for (const person of record.people)
        if (ages.has(ageOn(person.birthDate, sept)))
          byId.set(person.id, person.traits);
  return byId;
}

/**
 * Decide the honors due today, if any: for every place, the honor's students
 * of the day (a full student with their attendance, a counted one with their
 * household's weight), cleared in order of rank against the place's owed
 * share. Runs only on an honor's calendar day, so it costs nothing on the
 * other days. Returns the rows written.
 */
export function decideSchoolHonors(
  api: CoreAPI,
  attendanceFor: (
    startYear: number,
  ) => (personId: string) => number | undefined,
): SchoolHonorRow[] {
  const date = api.state.date;
  const due = honorsOn(date);
  const written: SchoolHonorRow[] = [];
  if (!due.length) return written;
  const core = api.state as CoreState;
  const done = stateOf(api).table("done");
  const carry = stateOf(api).table("carry");
  const honors = stateOf(api).table("honors");
  const startYear = schoolStartYear(date, schoolDays.schoolYear.firstDay);
  const attendance = attendanceFor(startYear);
  const traitWeight = api.parameter(data.ranking.traitWeightParameter);
  for (const honor of due) {
    const doneKey = `honors:${honor.key}:${date}`;
    if (done.get(doneKey)) continue;
    done.put({ id: doneKey, date } as never);
    // stopgapId: SG-SCHOOL-honors-no-history (every place opens owing no honors; the school years before the start give none)
    if (honor.rate) api.stopgap(data.stopgaps.noHistory);
    // stopgapId: SG-SCHOOL-honors-athletic-ability (no record gives a student's athletic ability; the honor's traits stand in to rank the seniors)
    // stopgapId: SG-SCHOOL-honors-one-signing-day (every Division I signing of the class is decided on one day, not across the signing periods)
    // stopgapId: SG-SCHOOL-honors-every-district-holds-a-bee (every place's district holds a bee and crowns a winner each year)
    for (const id of honor.stopgaps) api.stopgap(id);
    const byPlace = new Map<string, Student[]>();
    for (const grade of honor.grades)
      for (const [placeId, list] of studentsByPlace(
        api,
        grade,
        startYear,
        attendance,
      ))
        byPlace.set(placeId, [...(byPlace.get(placeId) ?? []), ...list]);
    const counted = honor.traits.length
      ? countedTraits(core, honor.grades, startYear)
      : new Map<string, Readonly<Record<string, number>>>();
    const score = (student: Student) =>
      honorScore(
        student.standing,
        student.full
          ? core.people.get(student.id as PersonId)?.traits
          : counted.get(student.id),
        honor,
        traitWeight,
      );
    const basis = basisOf(honor);
    for (const [placeId, students] of byPlace) {
      let cleared: readonly Student[];
      let count: number;
      let total: number;
      let expected: number;
      let owing: { owedBefore: number; owedAfter: number } | undefined;
      if (honor.winners) {
        // A bee always crowns its winner: the place's highest-ranked student.
        const result = crownWinners(students, score, honor.winners.perPlace);
        cleared = result.crowned;
        count = cleared.length;
        total = result.total;
        expected = honor.winners.perPlace;
      } else {
        const carryId = `honor:${honor.key}:${placeId}`;
        const carried =
          (carry.get(carryId) as unknown as { owed: number } | undefined)
            ?.owed ?? 0;
        const result = clearHonor(students, score, honorRate(honor), carried);
        carry.put({
          id: carryId,
          owed: result.owedAfter,
          date,
          startYear,
          students: result.total,
          expected: result.expected,
        } as never);
        cleared = result.cleared;
        count = cleared.reduce((n, s) => n + s.weight, 0);
        total = result.total;
        expected = result.expected;
        owing = {
          owedBefore: result.owedBefore,
          owedAfter: result.owedAfter,
        };
      }
      if (!cleared.length) continue;
      const id = `${honor.key}:${placeId}:${date}`;
      const eventId = `${SCHOOL_HONOR_EVENT}:${id}`;
      const schoolId = schoolOfPlace(core, placeId);
      const name = schoolName(core, schoolId);
      const personIds = cleared.filter((s) => s.full).map((s) => s.id);
      const row: SchoolHonorRow = {
        id,
        honor: honor.key,
        tier: honor.tier,
        placeId,
        schoolId,
        date,
        startYear,
        count,
        personIds,
        students: total,
        ...(honor.rate ? { rate: honorRate(honor) } : {}),
        expected,
        ...owing,
        eventId,
      };
      honors.put(row as never);
      written.push(row);
      api.emit({
        id: eventId,
        date,
        kind: SCHOOL_HONOR_EVENT,
        personIds: personIds as PersonId[],
        placeId,
        source: {
          tag: basis.tag,
          asOf: date,
          citation: basis.source,
          estimatedFrom: basis.derivation,
        },
        publicRecord: true,
        facts: {
          honor: honor.key,
          tier: honor.tier,
          count: `${count}`,
          record: id,
          ...(name ? { school: name } : {}),
        },
      });
    }
  }
  return written;
}
