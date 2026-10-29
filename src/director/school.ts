/**
 * What the school engine keeps that a scene reads: the school a student
 * attended (its attended table, read through `attendedSchool`), their
 * classmates there, and the year's end
 * (its graduation result, written on the year's last school day for every
 * senior, graduated or not).
 */
import { SCHOOL_MODULE_ID } from "../core2/school-measures";
import { attendedSchool, type AttendedRow } from "../core2/past";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { QueuedRecord } from "./circumstance";

interface ResultRow {
  id: string;
  personId: string;
  measure: string;
  date: string;
  passed: boolean;
  startYear: number;
}

const GRADUATION = "school.graduation-pct";

function school(core: Readonly<CoreState>) {
  return core.modules.has(SCHOOL_MODULE_ID)
    ? coreAPI(core as CoreState).moduleState(SCHOOL_MODULE_ID)
    : undefined;
}

/** The others who attended the same school in the same school year. */
export function classmatesOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): PersonId[] {
  const mine = attendedSchool(core, personId);
  if (!mine) return [];
  return (school(core)!.table("attended").rows() as unknown as AttendedRow[])
    .filter(
      (row) =>
        row.id !== personId &&
        row.schoolId === mine.schoolId &&
        row.year === mine.year,
    )
    .map((row) => row.id as PersonId)
    .sort();
}

/**
 * The person's school year ending today: their graduation result, read the
 * day the school engine writes it, cited by its own id.
 */
export function schoolFinished(
  core: Readonly<CoreState>,
  personId: PersonId,
): QueuedRecord[] {
  const results = school(core)?.table("results");
  if (!results) return [];
  return (results.query("byPerson", [personId]) as unknown as ResultRow[])
    .filter((row) => row.measure === GRADUATION && row.date === core.date)
    .map((row) => ({
      id: row.id,
      kind: "school.finished",
      direct: true as const,
      personIds: [personId],
      witnessIds: [],
      facts: {
        passed: String(row.passed),
        schoolId: attendedSchool(core, personId)?.schoolId ?? "",
      },
    }));
}
