import { electionContestResult } from "../simulation/election-contests";
import {
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "../simulation/life-queries";
import type { EntityId, IsoDate, World } from "../simulation/types";

/**
 * EVERY OFFICE A PERSON HELD OR RAN FOR, WITH ITS PLACE AND DATES.
 *
 * Read from two kinds of record and nothing else:
 *
 *   - the offices the person held: work relationships whose kind is an
 *     office (a legislator's seat, an executive office, a judgeship, an
 *     elected service), placed by the role's recorded jurisdiction;
 *   - the races the person stood in: election contests naming them as a
 *     candidate, placed by the contest's jurisdiction, with the result when
 *     one is recorded.
 *
 * Staff, clerks and the people who clean the chamber hold jobs in the same
 * buildings, and are not office holders; their kinds are excluded by name.
 * A job with no recorded place is left out rather than placed where the
 * person lives: an office's place is a fact about the office.
 */

export type CareerEntryKind = "held" | "ran";

export interface CareerEntry {
  readonly kind: CareerEntryKind;
  readonly jurisdictionId: EntityId;
  /** "Governor", "State Senator, District 12", "Mayor". */
  readonly title: string;
  readonly from: IsoDate;
  /** Null while the office is held, or for a race that is still ahead. */
  readonly to: IsoDate | null;
  /** For a race: whether the person won, when the count is recorded. */
  readonly won: boolean | null;
  /** The record this entry was read from. */
  readonly sourceId: EntityId;
}

/** Work kinds that are an office, not a job near one. */
const OFFICE_KIND =
  /^(employment:(legislative-member|congress-member|executive-office(holder)?|vice-presidential-officeholder|judicial-office(-practice)?)|service:.+)$/;
const NOT_AN_OFFICE = /staff|janitor|assistant|aide|clerk|intern/;

export function isOfficeWorkKind(kind: string): boolean {
  return OFFICE_KIND.test(kind) && !NOT_AN_OFFICE.test(kind);
}

/** The person's career, newest first by the date each entry began. */
export function careerEntries(
  world: World,
  personId: EntityId,
): readonly CareerEntry[] {
  const entries: CareerEntry[] = [];

  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (!isOfficeWorkKind(work.kind)) continue;
    const role = workRoleHistory(world, work.id).at(-1);
    const jurisdictionId = role?.locationJurisdictionId ?? null;
    if (!role || jurisdictionId === null) continue;
    const ended = workStatusHistory(world, work.id).find(
      (status) => status.status === "ended",
    );
    entries.push({
      kind: "held",
      jurisdictionId,
      title: role.title,
      from: work.startedAt,
      to: ended?.effectiveAt ?? null,
      won: null,
      sourceId: work.id,
    });
  }

  for (const contest of world.history.electionContests ?? []) {
    if (!contest.candidatePersonIds.includes(personId)) continue;
    const result = electionContestResult(world, contest.id);
    entries.push({
      kind: "ran",
      jurisdictionId: contest.jurisdictionId,
      title: contest.office.title,
      from: contest.electionDate,
      to: result?.resolvedAt ?? null,
      won: result ? result.winnerPersonId === personId : null,
      sourceId: contest.id,
    });
  }

  return entries.sort(
    (a, b) =>
      b.from.localeCompare(a.from) || a.sourceId.localeCompare(b.sourceId),
  );
}
