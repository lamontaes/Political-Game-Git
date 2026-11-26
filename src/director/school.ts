/**
 * What the school engine keeps that a scene reads: the school a student
 * attended (its attended table, read through `attendedSchool`), their
 * classmates there, and the year's end
 * (its graduation result, written on the year's last school day for every
 * senior, graduated or not, read through the one history reader).
 */
import { SCHOOL_MODULE_ID } from "../core2/school-measures";
import {
  attendedSchool,
  historyEvent,
  historyOf,
  type AttendedRow,
  type HistoryEvent,
} from "../core2/past";
import { GRADUATION_RESULT } from "../core2/modules/school";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { QueuedRecord } from "./circumstance";

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
  return graduationsOf(core, personId)
    .filter((event) => event.date === core.date)
    .map((event) => ({
      id: event.id,
      kind: "school.finished",
      direct: true as const,
      personIds: [personId],
      witnessIds: [],
      facts: {
        passed: String(event.facts?.passed === "yes"),
        schoolId: attendedSchool(core, personId)?.schoolId ?? "",
      },
    }));
}

/** A person's graduation results from the one history reader, oldest first. */
function graduationsOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): HistoryEvent[] {
  // A copy of the core that carries no module stores (a fixture's) holds no
  // results to read.
  try {
    return historyOf(
      core as CoreState,
      { person: personId },
      { kinds: [GRADUATION_RESULT] },
    ).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

/**
 * The graduation results the school engine has written for a person (a
 * school year's end, passed or not), oldest first, each cited by its own id.
 */
export function graduationResults(
  core: Readonly<CoreState>,
  personId: PersonId,
): { id: string; date: string; passed: boolean }[] {
  return graduationsOf(core, personId).map((event) => ({
    id: event.id,
    date: event.date,
    passed: event.facts?.passed === "yes",
  }));
}

/**
 * One graduation result by its id, as the school engine wrote it: whether
 * the senior passed and the school they attended. The Journal tells the
 * school year's end from it.
 */
export function schoolResult(
  core: Readonly<CoreState>,
  id: string,
):
  | { passed: boolean; schoolId: string | undefined; personId: PersonId }
  | undefined {
  const event = historyEvent(core as CoreState, id);
  const personId = event?.personIds[0];
  if (!event || event.record !== GRADUATION_RESULT || !personId)
    return undefined;
  return {
    passed: event.facts?.passed === "yes",
    schoolId: attendedSchool(core, personId)?.schoolId,
    personId,
  };
}
