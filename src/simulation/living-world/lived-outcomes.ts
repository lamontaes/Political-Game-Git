import { schoolYearMovesOf } from "../childhood-record";
import { currentGovernorOf } from "../crisis/offices";
import { eventById } from "../event-index";
import { NON_MONEY_FELT_SIZE, type LawExposureFeltSize } from "../law-exposure";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import { childrenOf } from "../people-family";
import { localHeadOfGovernment } from "./local-government-seats";
import { jobsLostBy } from "./town-labor-market";

/**
 * What happened to a person that an official answers for, read from the
 * records the producers already write (Fable audit, Part 5, Social: belief
 * factors from lived outcomes). Each kind is read by the one reader its
 * producer owns, the same reader the principles a life forms use
 * (`principles-from-life.ts`, card P1):
 *
 * - a job lost by layoff or closing: `jobsLostBy` (town-labor-market.ts);
 * - a child of theirs who had to leave school in the middle of a school
 *   year when the family moved: `schoolYearMovesOf` (childhood-record.ts).
 *
 * Nothing is invented: an outcome with no record is not here.
 *
 * Adding a kind takes four things, and no second pipeline: the kind and its
 * answering office below (`LIVED_OUTCOME_ANSWERED_BY`), its summary, a reader
 * in `LIVED_OUTCOME_READERS` over the producer's own reader, and a call to
 * `scheduleLivedOutcomeReflection(world, personId, sourceRecordId)`
 * (law-exposure.ts, beside the law-effect reflection it shares) where the
 * producer writes the record. The reflection, the belief pipeline, the vote
 * count and the talk line read every kind the same way.
 */

export type LivedOutcomeKind = "job-lost" | "school-move";

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
  // PLACEHOLDER (same research request): a child pulled out of school in the
  // middle of a year is held against the head of the family's local
  // government, where they live now.
  "school-move": "local-executive",
};

/** What the person thought over, in the words of their reflection event. */
export const LIVED_OUTCOME_SUMMARY: Readonly<Record<LivedOutcomeKind, string>> =
  {
    "job-lost": "losing a job they did not choose to leave",
    "school-move":
      "their child having to leave school in the middle of the year",
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
  // A child's school-year move, felt by each parent who moved with them. It
  // moves no money, so it is felt as any non-money loss is
  // (NON_MONEY_FELT_SIZE, PLACEHOLDER).
  (world, personId, through) =>
    childrenOf(world, personId).flatMap((childId) =>
      schoolYearMovesOf(world, childId, through)
        .filter((entry) =>
          eventById(world, entry.sourceRecordId)?.involvedEntityIds.includes(
            personId,
          ),
        )
        .map((entry) => ({
          kind: "school-move" as const,
          at: entry.effectiveAt,
          sourceRecordId: entry.id,
          direction: "cost" as const,
          felt: { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true },
        })),
    ),
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
  // A town names its state; a home recorded as the state itself is that state.
  const jurisdiction = home ? world.jurisdictions[home] : undefined;
  const stateKey = home
    ? (lifePlaceByJurisdictionId(home)?.stateJurisdictionKey ??
      (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null))
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
