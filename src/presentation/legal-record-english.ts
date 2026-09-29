/**
 * The sentences the Legal tab of the player's own record says about where
 * they stand with the courts, from what the court's records show.
 */

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
] as const;

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/**
 * One sentence on the player's standing: a sentence they are serving first,
 * then a clean record, then charges waiting for a plea. Null when none of
 * those holds (every charge answered, nothing being served).
 */
export function legalStandingSentence(input: {
  readonly serving: "jail" | "probation" | null;
  readonly cases: number;
  readonly awaitingPlea: number;
}): string | null {
  if (input.serving === "jail") return "You are serving a jail term.";
  if (input.serving === "probation") return "You are on probation.";
  if (input.cases === 0) return "No one has charged you with a crime.";
  if (input.awaitingPlea === 0) return null;
  const charges = input.awaitingPlea === 1 ? "charge" : "charges";
  const verb = input.awaitingPlea === 1 ? "is" : "are";
  return `${countWord(input.awaitingPlea)} ${charges} against you ${verb} waiting for your plea.`;
}

/** What the Legal tab says under Cases when the court holds none. */
export const NO_CASES_ON_RECORD = "No charges on record.";

/** What the Legal tab says under Sentences when none was ever imposed. */
export const NO_SENTENCES_ON_RECORD = "No sentences on record.";
