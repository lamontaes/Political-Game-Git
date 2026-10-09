import { lawInForce } from "../governing/law-in-force";
import { latestLawPermission } from "../law-consequences/permission-records";
import { personName } from "../people";
import { APPEAL_DECIDED_EVENT } from "./appeals";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_LIFE_TAG,
  SENTENCE_MONTHS_TAG,
  eventsOfType,
  sentencedPersonOf,
  sentencesOf,
} from "./jail-terms";

/**
 * A person's vote after a felony sentence. The court's saved jail sentence
 * is the cause: a term over a year, or for life, is a felony sentence in
 * every state, so the vote is suspended while the sentence runs. Whether it
 * returns when the sentence ends is the state's law in force on the day
 * asked, read from `restore-voting-after-sentence`; a pardon returns it.
 *
 * Suspension while serving is assumed everywhere (ESTIMATED FROM AVERAGE: a
 * handful of places never suspend it, and the question catalog holds only the
 * after-sentence rule).
 */

export const VOTING_RIGHT_EVENT = "justice.voting-right-set";
export const VOTING_RIGHT_FOR_TAG = "justice.voting-right-for:";
export const RESTORE_VOTING_QUESTION_KEY =
  "us-policy-positions:justice-public-safety.restore-voting-after-sentence";

/** More than a year is a felony sentence. */
const FELONY_MONTHS = 12;

export function isFelonySentence(sentenced: HistoricalEvent): boolean {
  if (sentenced.type !== PROSECUTION_SENTENCED_EVENT) return false;
  if (sentenced.tags.includes(SENTENCE_LIFE_TAG)) return true;
  const months = Number(
    sentenced.tags
      .find((tag) => tag.startsWith(SENTENCE_MONTHS_TAG))
      ?.slice(SENTENCE_MONTHS_TAG.length) ?? "0",
  );
  return months > FELONY_MONTHS;
}

export type VotingStanding =
  | { readonly standing: "votes" }
  | {
      readonly standing: "suspended-serving" | "withheld-after-sentence";
      readonly sentenceEventId: EntityId;
    }
  | { readonly standing: "restored"; readonly sentenceEventId: EntityId };

function restoreQuestionId(world: World): EntityId | null {
  return (
    Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === RESTORE_VOTING_QUESTION_KEY,
    )?.id ?? null
  );
}

function restoredByPolicyOn(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId | null,
  questionId: EntityId | null,
  date: IsoDate,
): boolean {
  const law =
    questionId && jurisdictionId
      ? lawInForce(world, jurisdictionId, questionId, date)
      : null;
  const permission = latestLawPermission(
    world,
    { kind: "person", id: personId },
    RESTORE_VOTING_QUESTION_KEY,
    date,
  );
  return permission ? permission.status === "permitted" : law?.answer === "yes";
}

/**
 * Writes the record of a felony sentence suspending the defendant's vote.
 * Nothing is written for a shorter sentence, for a sentence not saved today,
 * or twice for one sentence.
 */
export function recordVotingRightForSentence(
  world: World,
  sentenceEventId: EntityId,
): World {
  const sentenced = world.history.events.find(
    (row) => row.id === sentenceEventId,
  );
  if (!sentenced || !isFelonySentence(sentenced)) return world;
  const personId = sentencedPersonOf(sentenced);
  if (!personId || !world.people[personId]) return world;
  const tag = `${VOTING_RIGHT_FOR_TAG}${sentenced.id}`;
  if (
    eventsOfType(world, VOTING_RIGHT_EVENT).some((row) =>
      row.tags.includes(tag),
    )
  )
    return world;
  const name = personName(world.people[personId]!);
  return recordWorldEvent(world, {
    stableKey: `${VOTING_RIGHT_EVENT}:${sentenced.id}`,
    type: VOTING_RIGHT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: sentenced.jurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:defendant", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: [tag, "justice.felony-sentence"],
    summary: `${name} cannot vote while serving the felony sentence.`,
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation:
        "A jail term over a year is a felony sentence, and the vote is suspended while it runs.",
      immediateReaction: null,
    },
  });
}

/**
 * Whether a person may vote on `date`, from their felony sentences and the
 * law in force that day. Read-only.
 */
export function votingStandingOn(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): VotingStanding {
  const questionId = restoreQuestionId(world);
  let worst: VotingStanding = { standing: "votes" };
  const rank = {
    votes: 0,
    restored: 1,
    "withheld-after-sentence": 2,
    "suspended-serving": 3,
  };
  for (const sentence of sentencesOf(world, personId)) {
    const sentenced = world.history.events.find(
      (row) => row.id === sentence.sentencedEventId,
    );
    if (!sentenced || !isFelonySentence(sentenced) || sentence.from > date)
      continue;
    const serving = sentence.until === null || date < sentence.until;
    let next: VotingStanding;
    if (serving)
      next = { standing: "suspended-serving", sentenceEventId: sentenced.id };
    else if (sentence.clemency?.kind === "pardon")
      next = { standing: "restored", sentenceEventId: sentenced.id };
    else
      next = restoredByPolicyOn(
        world,
        personId,
        sentenced.jurisdictionId,
        questionId,
        date,
      )
        ? { standing: "restored", sentenceEventId: sentenced.id }
        : {
            standing: "withheld-after-sentence",
            sentenceEventId: sentenced.id,
          };
    if (rank[next.standing] > rank[worst.standing]) worst = next;
  }
  return worst;
}

/**
 * Whether a person has a recorded felony sentence whose vote is restored by
 * the governing post-sentence law in the specified jurisdiction. Pardons and
 * reversed convictions are excluded because neither is a policy restoration.
 */
export function hasPolicyRestoredVotingRightOn(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  date: IsoDate = world.currentDate,
): boolean {
  if (votingStandingOn(world, personId, date).standing !== "restored")
    return false;

  const reversedSentenceIds = new Set(
    eventsOfType(world, APPEAL_DECIDED_EVENT)
      .filter(
        (event) =>
          event.occurredAt <= date && event.tags.includes("outcome:reverse"),
      )
      .flatMap((event) =>
        event.tags
          .filter((tag) => tag.startsWith("judgment:"))
          .map((tag) => tag.slice("judgment:".length)),
      ),
  );
  const questionId = restoreQuestionId(world);

  return sentencesOf(world, personId).some((sentence) => {
    if (
      sentence.from > date ||
      sentence.until === null ||
      sentence.until > date ||
      sentence.clemency?.kind === "pardon" ||
      reversedSentenceIds.has(sentence.sentencedEventId)
    )
      return false;

    const sentenced = world.history.events.find(
      (row) => row.id === sentence.sentencedEventId,
    );
    if (
      !sentenced ||
      sentenced.jurisdictionId !== jurisdictionId ||
      !isFelonySentence(sentenced)
    )
      return false;
    return restoredByPolicyOn(
      world,
      personId,
      jurisdictionId,
      questionId,
      date,
    );
  });
}
