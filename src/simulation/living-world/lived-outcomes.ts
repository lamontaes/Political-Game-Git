import { currentGovernorOf } from "../crisis/offices";
import type { LawExposureFeltSize } from "../law-exposure";
import { lifePlaceByJurisdictionId } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import { localHeadOfGovernment } from "./local-government-seats";
import { jobsLostBy } from "./town-labor-market";

/**
 * What happened to a person that an official answers for, read from the
 * records the producers already write (Fable audit, Part 5, Social: belief
 * factors from lived outcomes). Each kind is read by the one reader its
 * producer owns, the same reader the principles a life forms use
 * (`principles-from-life.ts`, card P1):
 *
 * - a job lost by layoff or closing: `jobsLostBy` (town-labor-market.ts).
 *
 * Nothing is invented: an outcome with no record is not here.
 *
 * Adding a kind takes four things, and no second pipeline: the kind and its
 * answering office below (`LIVED_OUTCOME_ANSWERED_BY`), its summary, a reader
 * in `LIVED_OUTCOME_READERS` over the producer's own reader, and a call to
 * `scheduleLivedOutcomeReflection(world, personId, sourceRecordId)` where the
 * producer writes the record. The reflection, the belief pipeline, the vote
 * count and the talk line read every kind the same way.
 */

export type LivedOutcomeKind = "job-lost";

export interface LivedOutcome {
  readonly kind: LivedOutcomeKind;
  readonly at: IsoDate;
  /** The record that shows it happened. */
  readonly sourceRecordId: EntityId;
  readonly direction: "cost" | "gain";
  /** How big it was next to the person's month's pay. */
  readonly felt: Exclude<LawExposureFeltSize, null>;
}

/**
 * Which office answers for each kind of outcome: the governor of the
 * person's state or territory, or the head of their local government (with
 * the governor where no local government is seated).
 */
export type AnsweringOffice = "state-executive" | "local-executive";

/**
 * PLACEHOLDER (research: who-answers-for-what-happened-to-me): a lost job is
 * held against the governor. Voters hold governors to account for their
 * state's economy (Wolfers, 2002, "Are Voters Rational? Evidence from
 * Gubernatorial Elections"; Ebeid and Rodden, 2006, "Economic Geography and
 * Economic Voting", British Journal of Political Science), which sets the
 * office, not how much one person's own lost job moves their view of it.
 */
export const LIVED_OUTCOME_ANSWERED_BY: Readonly<
  Record<LivedOutcomeKind, AnsweringOffice>
> = {
  "job-lost": "state-executive",
};

/** What the person thought over, in the words of their reflection event. */
export const LIVED_OUTCOME_SUMMARY: Readonly<Record<LivedOutcomeKind, string>> =
  {
    "job-lost": "losing a job they did not choose to leave",
  };

/**
 * One reader per kind, each a thin adapter over the reader its producer
 * owns. The writer of each record schedules the reflection on it
 * (`scheduleLivedOutcomeReflection`).
 */
type LivedOutcomeReader = (
  world: World,
  personId: EntityId,
  through: IsoDate,
) => readonly LivedOutcome[];

const LIVED_OUTCOME_READERS: readonly LivedOutcomeReader[] = [
  // A lost job takes all of that job's pay: the whole of a month's pay.
  (world, personId, through) =>
    jobsLostBy(world, personId, through).map((status) => ({
      kind: "job-lost",
      at: status.effectiveAt,
      sourceRecordId: status.id,
      direction: "cost",
      felt: { share: 1, estimated: false },
    })),
];

/** Everything recorded as happening to `personId`, oldest first. */
export function livedOutcomesOf(
  world: World,
  personId: EntityId,
  through = world.currentDate,
): readonly LivedOutcome[] {
  return LIVED_OUTCOME_READERS.flatMap((read) =>
    read(world, personId, through),
  ).sort((a, b) => a.at.localeCompare(b.at));
}

/** Who holds the office that answers for an outcome where `personId` lives. */
export function officialAnsweringFor(
  world: World,
  personId: EntityId,
  office: AnsweringOffice,
): EntityId | null {
  const home = world.people[personId]?.homeJurisdictionId;
  const stateKey = home
    ? lifePlaceByJurisdictionId(home)?.stateJurisdictionKey
    : null;
  const governor = stateKey
    ? (currentGovernorOf(world, stateKey.slice(3))?.personId ?? null)
    : null;
  switch (office) {
    case "state-executive":
      return governor;
    case "local-executive":
      return localHeadOfGovernment(world, personId) ?? governor;
  }
}
