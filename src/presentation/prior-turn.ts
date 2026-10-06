/**
 * What the turn before a reply was about, read from the words it was spoken
 * in, so the reply can answer that content instead of echoing it.
 *
 * Conversation research (07 Speech and Dialogue Corpus, adjacency pairs): a
 * second turn takes up the specific thing the first turn named, usually with a
 * short reaction token and a follow-up about that thing ("Oh yeah? Learn
 * what?"). The follow-up is built from the prior turn's own topic word and a
 * question word; nothing else of the prior turn is repeated.
 */

/** The parsed content of a prior turn that told the listener a plan. */
export interface PriorTurnContent {
  readonly act: "tell-plan";
  /** The one word of the prior turn the reply may repeat. */
  readonly topicWord: string;
  /** A question about the topic, built from the topic word. */
  readonly followup: string;
}

const INDEFINITE_QUESTION: Readonly<Record<string, string>> = {
  something: "what",
  someone: "who",
  somebody: "who",
  somewhere: "where",
};

const REFLEXIVE = /^(myself|yourself|himself|herself|themselves|ourselves)$/;

function capitalize(word: string): string {
  return word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1);
}

/**
 * Reads a plan stated as "make time to <verb> <object>" or "make time for
 * <noun phrase>". Returns null for any other shape, so a caller words nothing
 * it did not understand.
 */
export function parsePlanTurn(text: string): PriorTurnContent | null {
  const words = text
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  const time = words.indexOf("time");
  if (time < 0) return null;
  const link = words[time + 1];
  const rest = words.slice(time + 2);
  if (link === "to" && rest.length >= 1) {
    const verb = rest[0]!;
    const question = INDEFINITE_QUESTION[rest[1] ?? ""];
    if (question)
      return {
        act: "tell-plan",
        topicWord: verb,
        followup: `${capitalize(verb)} ${question}?`,
      };
    return null;
  }
  if (link === "for" && rest.length >= 1) {
    const head = rest[0]!;
    if (REFLEXIVE.test(head))
      return {
        act: "tell-plan",
        topicWord: "time",
        followup: "Time to do what?",
      };
    return {
      act: "tell-plan",
      topicWord: head,
      followup: `Which ${head}?`,
    };
  }
  return null;
}
