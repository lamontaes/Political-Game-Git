/** The facts of what a talk says once, marked where the talk has already said it. */
export function withOnceSaid(
  facts: Facts,
  speakerId: PersonId,
  recentPartKeys: readonly string[],
): Facts {
  const onceSaid = SAID_ONCE_FACTS.filter((fact) =>
    recentPartKeys.some((key) => piecesSaidOnce(fact).has(key)),
  );
  return onceSaid.length
    ? {
        ...facts,
        ...Object.fromEntries(
          onceSaid.map((fact) => [
            fact,
            { text: "yes", sourceRecordIds: [speakerId] },
          ]),
        ),
      }
    : facts;
}

/**
 * A line the English engine composes from parts, for a subject whose lines are
 * made that way, said against what the player has already heard. Moved out of
 * `conversation.ts` so the exchange engine can word a home family's answer
 * itself (talk merge plan, slice 2); the words and the picks are as they were.
 */
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import {
  composeConversationLine,
  piecesSaidOnce,
  SAID_ONCE_FACTS,
  type Fact,
  type Said as WordedLine,
} from "../english/conversation-words";
import { SAID_AS_DATA as saidAsData, sentenceStarts } from "../english/said-as";
import { heardNow, heardOrderFor } from "./talk-heard";

const zero = P.zero;
const one = P.one;
type Facts = Record<string, Fact>;

/** A line as said, with the mined sentence that said it. */
export type Said = Omit<WordedLine, "asks" | "afterPlain">;

/** The short forms of a question's act once the line has named it (said-as questionAgain). */
const QUESTION_AGAIN = (
  saidAsData as unknown as {
    questionAgain: Readonly<Record<"against" | "to", string>>;
  }
).questionAgain;

/**
 * A question named once in a line is said short after (lead, Nov 12: "say no
 * to raising the debt limit only with spending cuts to match" right after the
 * opener named it): where the question's own words (`about`) come first, a
 * later act in full (`against`, `to`) becomes its short form.
 */
function shortAfterFirst(text: string, facts: Facts): string {
  const about = facts.about?.text;
  const at = about ? text.indexOf(about) : -one;
  if (at < zero) return text;
  const from = at + about!.length;
  let rest = text.slice(from);
  for (const key of ["against", "to"] as const) {
    const full = facts[key]?.text;
    if (full && rest.includes(full))
      rest = rest.replace(full, QUESTION_AGAIN[key]);
  }
  return text.slice(zero, from) + rest;
}

/**
 * A line the English engine composes from parts (opener, core, reason,
 * closer), for a subject whose lines are made that way: the hearer's point of
 * the address and their answer to the player's reply. Null when no core can
 * be said from the facts given.
 */
export function composedLine(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  subject: string,
  facts: Facts,
  stage: string,
  momentKey: string,
  recentPartKeys: readonly string[] = [],
): Said | null {
  // What is said once in a talk (how long they have held a stand; being
  // glad to hear the player's voice) is not said again in it (lead, Nov 13;
  // Words lead, Nov 14).
  const line = composeConversationLine({
    seed: core.seed,
    subject,
    speakerId,
    traits: core.people.get(speakerId)?.traits ?? {},
    facts: withOnceSaid(facts, speakerId, recentPartKeys),
    stage,
    momentKey,
    // Oldest first: what the player heard on earlier days, then today, then
    // this talk, so a wording heard longest ago is the one said again.
    said: [...heardOrderFor(speakerId), ...heardNow, ...recentPartKeys],
  });
  if (!line) return null;
  const { asks, afterPlain, ...said } = line;
  void asks;
  void afterPlain;
  return { ...said, text: sentenceStarts(shortAfterFirst(said.text, facts)) };
}
