/**
 * School outcomes (each school year, every place). In the testing month every
 * enrolled student of a tested grade gets a math and a reading record, and on
 * the last day of the school year every senior a graduation record. Both
 * tiers follow one rule: the place's expected share is its base (the web's
 * 2024 state base) times the web's factor for the student's income fifth,
 * spread over the fifths by the researched gradient; within a fifth the
 * count is filled from the top by each student's own standing (attendance
 * and study traits), a counted student standing for as many real students as
 * their household's weight, and the fraction left over carries to next year.
 * There is no roll. A full student keeps a result record; counted students
 * are kept as group counts, and their results are read the same way by every
 * engine that reads the place's measures (schoolMeasure).
 */
import data from "./data/school/outcomes.json" with { type: "json" };
import { ageOn } from "./counted-groups";
import {
  countedHouseholdsByPlace,
  groupKeyOf,
  incomeBandOf,
  residentsRuntime,
} from "./modules/residents";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./modules/budgets";
import { placeOutcome } from "./modules/outcome-web";
import { baseOf } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import type { CoreAPI, CoreState } from "./types";

export type SchoolKind = "math" | "reading" | "graduation";

/** The outcomes the engine decides (and, for spending, records), by name. */
export const SCHOOL_MEASURE = {
  math: "school.math-proficient-pct",
  reading: "school.reading-proficient-pct",
  graduation: "school.graduation-pct",
  spending: "school.spending-per-student",
} as const;

interface Student {
  readonly id: string;
  readonly weight: number;
  readonly fifth: number;
  readonly standing: number;
  readonly full: boolean;
}

/** A full student's result record. */
export interface SchoolResultRow {
  readonly id: string;
  readonly personId: string;
  readonly placeId: string;
  readonly measure: string;
  readonly startYear: number;
  readonly date: string;
  /** Proficient (a test) or graduated (a senior's year). */
  readonly passed: boolean;
  readonly incomeFifth: number;
  readonly factor: number;
  readonly webRecordId: string | null;
  readonly measureId: string;
}

/** The counted (and full) students of one income fifth in one place, as counts. */
export interface SchoolGroupRow {
  readonly id: string;
  readonly placeId: string;
  readonly measure: string;
  readonly startYear: number;
  readonly incomeFifth: number;
  readonly students: number;
  readonly passed: number;
  readonly expected: number;
  readonly factor: number;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(SCHOOL_MODULE_ID).table(name);

/** The year the school year began in (its first day is September 1). */
export function schoolStartYear(date: string, firstDay: string): number {
  const year = Number(date.slice(0, 4));
  return date.slice(5) >= firstDay ? year : year - 1;
}

/** Students of one grade today, by place; full people with their attendance, counted people with their household's weight. */
function collect(
  api: CoreAPI,
  grade: number,
  startYear: number,
  attendance: (personId: string) => number | undefined,
): Map<string, Student[]> {
  const core = api.state as CoreState;
  const date = core.date;
  const sept = `${startYear}-09-01`;
  const age = data.gradeAgeFirst + grade;
  const wAttend = api.parameter(data.standing.attendanceWeightParameter);
  const wTrait = api.parameter(data.standing.traitWeightParameter);
  const traitMean = (traits: Readonly<Record<string, number>>) => {
    let sum = 0;
    for (const key of data.standing.traits) sum += traits[key] ?? 0;
    return sum / data.standing.traits.length;
  };
  const byPlace = new Map<string, Student[]>();
  const add = (placeId: string, student: Student) => {
    const list = byPlace.get(placeId);
    if (list) list.push(student);
    else byPlace.set(placeId, [student]);
  };
  const inactive = new Set(
    core.data.tiers
      .filter((tier) => tier.cadence === "inactive")
      .map((tier) => tier.id),
  );
  const wageYear = api.parameter("daysPerMeanYear");
  // Full students: the household's wages are its income.
  const fullShares: number[] = [];
  const fullStudents: {
    placeId: string;
    id: string;
    fifth: number;
    trait: number;
    attended: number | undefined;
  }[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || inactive.has(person.tier)) continue;
    if (ageOn(person.birthDate, sept) !== age) continue;
    const home = core.households.get(person.householdId);
    let wages = 0;
    for (const memberId of home?.memberIds ?? []) {
      const jobId = core.people.get(memberId)?.jobId;
      const job = jobId ? core.jobs.get(jobId) : undefined;
      if (job && job.endsAt === undefined) wages += job.wageDailyMinor;
    }
    const attended = attendance(person.id);
    if (attended !== undefined) fullShares.push(attended);
    fullStudents.push({
      placeId: person.placeId,
      id: person.id,
      fifth: incomeBandOf(wages * wageYear),
      trait: traitMean(person.traits),
      attended,
    });
  }
  // A counted student attends as the place's full students do on average.
  const meanAttendance = fullShares.length
    ? fullShares.reduce((n, v) => n + v, 0) / fullShares.length
    : api.parameter("one");
  for (const s of fullStudents)
    add(s.placeId, {
      id: s.id,
      weight: 1,
      fifth: s.fifth,
      standing: wAttend * (s.attended ?? meanAttendance) + wTrait * s.trait,
      full: true,
    });
  const rt = residentsRuntime(core);
  if (rt)
    for (const [placeId, records] of countedHouseholdsByPlace(core)) {
      for (const record of records) {
        const kids = record.people.filter(
          (person) => ageOn(person.birthDate, sept) === age,
        );
        if (!kids.length) continue;
        const at = rt.store.householdOf.get(record.household.id);
        if (at === undefined) continue;
        const h = rt.store.households[at]!;
        const weight = rt.store.weightOf(h);
        const fifth = groupKeyOf(rt, h, date).incomeBand;
        for (const kid of kids)
          add(placeId, {
            id: kid.id,
            weight,
            fifth,
            standing: wAttend * meanAttendance + wTrait * traitMean(kid.traits),
            full: false,
          });
      }
    }
  return byPlace;
}

/** How much more likely a student of this income fifth is to clear the line, before scaling to the place. */
function gradientOf(kind: SchoolKind, fifth: number): number {
  const rows = data.gradient[kind];
  const share = data.gradient.eligibleShareByIncomeFifth[fifth] ?? 0;
  return share * rows.eligible + (1 - share) * rows.notEligible;
}

/** A place's base for a measure: the latest web month's own base (its state's 2024 level), else the median of the places the research reports. */
function baseFor(
  api: CoreAPI,
  placeId: string,
  measure: string,
): { base: number; recordId: string | null } {
  const record = placeOutcome(api, placeId, measure);
  return record?.base !== undefined
    ? { base: record.base, recordId: record.recordId }
    : { base: baseOf(measure, "").value, recordId: null };
}

/**
 * Decide one outcome for every student of its grade in every place, and keep
 * the records. Returns the measure rows written.
 */
export function decideSchoolOutcome(
  api: CoreAPI,
  kind: SchoolKind,
  startYear: number,
  attendance: (personId: string) => number | undefined,
): SchoolMeasureRow[] {
  const measure = SCHOOL_MEASURE[kind];
  const date = api.state.date;
  // stopgapId: SG-SCHOOL-college-completion (no engine decides who completes college; that measure stays the web's ledger)
  if (kind === "graduation") api.stopgap(data.stopgaps.collegeCompletion);
  // stopgapId: SG-SCHOOL-hispanic-enrollment (no enrollment by ethnicity; that measure stays the web's ledger)
  api.stopgap("SG-SCHOOL-hispanic-enrollment");
  // stopgapId: SG-SCHOOL-links-not-running (thirteen links into school outcomes lack a size, a recorded cause or a per-student exposure record)
  api.stopgap("SG-SCHOOL-links-not-running");
  const written: SchoolMeasureRow[] = [];
  const carry = table(api, "carry");
  for (const [placeId, students] of collect(
    api,
    data.tested[kind],
    startYear,
    attendance,
  )) {
    // Only a place the web follows is decided here; the coarser places
    // around it have no conditions recorded to read.
    if (!placeOutcome(api, placeId, measure)) continue;
    const { base, recordId } = baseFor(api, placeId, measure);
    const total = students.reduce((n, s) => n + s.weight, 0);
    const byFifth = new Map<number, Student[]>();
    for (const s of students) {
      const list = byFifth.get(s.fifth);
      if (list) list.push(s);
      else byFifth.set(s.fifth, [s]);
    }
    // Scale the researched gradient so the place's mean is its own level.
    let norm = 0;
    for (const [fifth, list] of byFifth)
      norm +=
        (list.reduce((n, s) => n + s.weight, 0) / total) *
        gradientOf(kind, fifth);
    const measureId = `${placeId}:${measure}:${startYear}`;
    let passedAll = 0,
      expectedAll = 0;
    for (const fifth of [...byFifth.keys()].sort((a, b) => a - b)) {
      const list = byFifth.get(fifth)!;
      const weight = list.reduce((n, s) => n + s.weight, 0);
      const factor = webReach(api, placeId, measure, {
        incomeFifth: fifth,
      }).factor;
      const share = Math.min(
        1,
        (base / 100) * (gradientOf(kind, fifth) / norm) * factor,
      );
      const expected = share * weight;
      const carryId = `${placeId}:${measure}:${fifth}`;
      let owed =
        ((carry.get(carryId) as unknown as { owed: number } | undefined)
          ?.owed ?? 0) + expected;
      list.sort((a, b) => b.standing - a.standing || (a.id < b.id ? -1 : 1));
      let passed = 0;
      for (const s of list) {
        const clears = owed + 1e-9 >= s.weight;
        if (clears) {
          owed -= s.weight;
          passed += s.weight;
        }
        if (s.full)
          table(api, "results").put({
            id: `${measure}:${s.id}:${startYear}`,
            personId: s.id,
            placeId,
            measure,
            startYear,
            date,
            passed: clears,
            incomeFifth: fifth,
            factor,
            webRecordId: recordId,
            measureId,
          } satisfies SchoolResultRow as never);
      }
      carry.put({ id: carryId, owed } as never);
      table(api, "groups").put({
        id: `${measureId}:${fifth}`,
        placeId,
        measure,
        startYear,
        incomeFifth: fifth,
        students: weight,
        passed,
        expected,
        factor,
      } satisfies SchoolGroupRow as never);
      passedAll += passed;
      expectedAll += expected;
    }
    const row: SchoolMeasureRow = {
      id: measureId,
      placeId,
      startYear,
      date,
      measure,
      value: total ? (passedAll / total) * 100 : base,
      students: total,
      passed: passedAll,
      expected: expectedAll,
      webRecordId: recordId,
    };
    table(api, "measures").put(row as never);
    written.push(row);
  }
  return written;
}

/** Real students aged 5 to 17 at the start of the school year, and all residents, by place (full people and counted weights). */
function populationByPlace(
  api: CoreAPI,
  startYear: number,
): Map<string, { students: number; residents: number }> {
  const core = api.state as CoreState;
  const sept = `${startYear}-09-01`;
  const first = api.parameter("openingSchoolAgeFirst");
  const last = api.parameter("openingSchoolAgeLast");
  const inRange = (birthDate: string) => {
    const age = ageOn(birthDate, sept);
    return age >= first && age <= last;
  };
  const count = new Map<string, { students: number; residents: number }>();
  const add = (placeId: string, students: number, residents: number) => {
    const row = count.get(placeId) ?? { students: 0, residents: 0 };
    row.students += students;
    row.residents += residents;
    count.set(placeId, row);
  };
  for (const person of core.people.values())
    if (person.alive) add(person.placeId, inRange(person.birthDate) ? 1 : 0, 1);
  const rt = residentsRuntime(core);
  if (rt)
    for (const [placeId, records] of countedHouseholdsByPlace(core))
      for (const record of records) {
        const at = rt.store.householdOf.get(record.household.id);
        if (at === undefined) continue;
        const weight = rt.store.weightOf(rt.store.households[at]!);
        add(
          placeId,
          record.people.filter((p) => inRange(p.birthDate)).length * weight,
          record.people.length * weight,
        );
      }
  return count;
}

/**
 * Spending per student: what the town's city and county spend on schools per
 * resident (the schools line of the budget in force over the government's
 * residents), times the town's residents, over the students enrolled. The
 * town is the place the web follows with the most students. Recorded once a
 * year with the tests.
 */
export function recordSchoolSpending(
  api: CoreAPI,
  startYear: number,
): SchoolMeasureRow | null {
  const core = api.state as CoreState;
  if (!core.modules.has(BUDGETS_MODULE_ID)) return null;
  const measure = SCHOOL_MEASURE.spending;
  const town = [...populationByPlace(api, startYear)]
    .filter(([placeId]) => placeOutcome(api, placeId, measure))
    .sort((a, b) => b[1].students - a[1].students || (a[0] < b[0] ? -1 : 1))[0];
  if (!town || town[1].students <= 0) return null;
  const [placeId, { students, residents }] = town;
  let perResident = 0;
  const lines: string[] = [];
  for (const gov of governments(api)) {
    if ((gov.level !== "city" && gov.level !== "county") || !gov.residents)
      continue;
    const budget = [...budgetsOf(api, gov.id)]
      .filter((row) => row.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    const line = budget?.spendingMinor["schools"];
    if (!budget || !line) continue;
    perResident += line / gov.residents;
    lines.push(budget.id);
  }
  if (!perResident) return null;
  // stopgapId: SG-SCHOOL-equalized-funding-budget (no handler moves the schools line for the equalized-funding law)
  api.stopgap(data.stopgaps.equalizedFunding);
  const row: SchoolMeasureRow = {
    id: `${placeId}:${measure}:${startYear}`,
    placeId,
    startYear,
    date: core.date,
    measure,
    value: (perResident * residents) / 100 / students,
    students,
    passed: 0,
    expected: 0,
    webRecordId: placeOutcome(api, placeId, measure)?.recordId ?? null,
    budgetIds: lines,
  };
  table(api, "measures").put(row as never);
  return row;
}
