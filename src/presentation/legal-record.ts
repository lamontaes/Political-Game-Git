import {
  answersTo,
  CLEMENCY_PETITION_EVENT,
  petitionerOf,
  tagValue,
} from "../simulation/justice/clemency-records";
import {
  clemencyPetitionStatus,
  fileClemencyPetition,
  type ClemencyPetitionStatus,
} from "../simulation/justice/clemency";
import {
  courtCasesOf,
  enterPlea,
  sentencesOf,
  type EnteredPlea,
} from "../simulation/justice/prosecution";
import {
  CLEMENCY_SENTENCE_TAG,
  type SentenceKind,
} from "../simulation/justice/jail-terms";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { proseDate } from "./prose-dates";

/**
 * A person's own court cases, sentences and clemency requests, as the Legal
 * tab of their dossier shows them. Read-only: it spends no game time and
 * records nothing. Whether the player may act is asked of the same actions the
 * tab's buttons call (`enterPlea`, `fileClemencyPetition`), so the tab never
 * offers a step those actions would refuse, and a refusal comes back in the
 * actions' own words.
 */

export interface LegalCaseLine {
  readonly referralId: EntityId;
  readonly offense: string;
  readonly chargedOn: IsoDate;
  readonly chargedOnLabel: string;
  /** Where the case stands, in one plain sentence. */
  readonly status: string;
  readonly enteredPlea: EnteredPlea | null;
  /** True while a plea can still be entered before the hearing. */
  readonly canEnterPlea: boolean;
}

export interface ClemencyRequestLine {
  readonly petitionId: EntityId;
  readonly askedOn: IsoDate;
  readonly askedOnLabel: string;
  readonly status: ClemencyPetitionStatus;
  /** Each answer given so far, as recorded, oldest first. */
  readonly answers: readonly string[];
}

export interface SentenceLine {
  readonly sentencedEventId: EntityId;
  readonly kind: SentenceKind;
  /** The term, in one plain sentence. */
  readonly term: string;
  /** True while the term is being served today. */
  readonly servingNow: boolean;
  readonly requests: readonly ClemencyRequestLine[];
  readonly canAskForClemency: boolean;
  /** Why a request cannot be made now, in the action's own words. */
  readonly whyNoRequest: string | null;
}

export interface LegalRecord {
  readonly cases: readonly LegalCaseLine[];
  readonly sentences: readonly SentenceLine[];
}

const OUTCOME_LINE = {
  plea: "Ended in a guilty plea",
  convicted: "Ended in a conviction",
  acquitted: "Ended in an acquittal",
  dismissed: "Dismissed",
} as const;

function caseStatus(record: ReturnType<typeof courtCasesOf>[number]): string {
  if (record.outcome && record.endedOn)
    return `${OUTCOME_LINE[record.outcome]} on ${proseDate(record.endedOn)}.`;
  const hearing = record.hearingOn ? proseDate(record.hearingOn) : null;
  if (record.enteredPlea === "guilty")
    return hearing
      ? `You will plead guilty at the hearing on ${hearing}.`
      : "You will plead guilty at the hearing.";
  if (record.mistrials > 0)
    return hearing
      ? `The jury could not agree. The retrial is set for ${hearing}.`
      : "The jury could not agree. A retrial is coming.";
  const pleaded =
    record.enteredPlea === "not-guilty" ? "You pleaded not guilty. " : "";
  return hearing
    ? `${pleaded}The hearing is set for ${hearing}.`
    : `${pleaded}The hearing has not been set.`;
}

function requestsOn(
  world: World,
  personId: EntityId,
  sentencedEventId: EntityId,
): readonly ClemencyRequestLine[] {
  return world.history.events.flatMap((event) => {
    if (event.type !== CLEMENCY_PETITION_EVENT) return [];
    if (petitionerOf(event) !== personId) return [];
    if (tagValue(event, CLEMENCY_SENTENCE_TAG) !== sentencedEventId) return [];
    return [
      {
        petitionId: event.id,
        askedOn: event.occurredAt,
        askedOnLabel: proseDate(event.occurredAt),
        status: clemencyPetitionStatus(world, event.id),
        answers: answersTo(world, event.id).map(
          (answer) => answer.event.summary,
        ),
      },
    ];
  });
}

function termLine(
  kind: SentenceKind,
  months: number | null,
  from: IsoDate,
  until: IsoDate | null,
  cutShort: boolean,
): string {
  const what =
    months === null
      ? "life imprisonment"
      : kind === "jail"
        ? `${months} months in jail`
        : `${months} months of probation`;
  const ends =
    until === null
      ? "with no fixed end date"
      : cutShort
        ? `cut short by clemency on ${proseDate(until)}`
        : `until ${proseDate(until)}`;
  return `${what}, from ${proseDate(from)} ${ends}.`;
}

export function projectLegalRecord(
  world: World,
  personId: EntityId,
): LegalRecord {
  const cases = courtCasesOf(world, personId).map((record) => ({
    referralId: record.referralId,
    offense: record.offenseLabel,
    chargedOn: record.chargedOn,
    chargedOnLabel: proseDate(record.chargedOn),
    status: caseStatus(record),
    enteredPlea: record.enteredPlea,
    canEnterPlea: enterPlea(world, {
      personId,
      referralId: record.referralId,
      plea: "not-guilty",
    }).ok,
  }));
  const sentences = sentencesOf(world, personId).map((sentence) => {
    const asked = fileClemencyPetition(world, {
      personId,
      sentencedEventId: sentence.sentencedEventId,
    });
    return {
      sentencedEventId: sentence.sentencedEventId,
      kind: sentence.kind,
      term: termLine(
        sentence.kind,
        sentence.months,
        sentence.from,
        sentence.until,
        sentence.clemency !== null,
      ),
      servingNow:
        sentence.from <= world.currentDate &&
        (sentence.until === null || world.currentDate < sentence.until),
      requests: requestsOn(world, personId, sentence.sentencedEventId),
      canAskForClemency: asked.ok,
      whyNoRequest: asked.ok ? null : asked.reason,
    };
  });
  return { cases, sentences };
}
