import type {
  StateExecutiveTermRule,
  TermCommencementRule,
} from "../simulation";

/**
 * The office's calendar as the player needs it: how long a term is, how often
 * the election comes round and when a winner takes office. It says what the
 * rules are, never where they were compiled from; that is a record for the
 * repository, not a sentence for a player.
 */

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
];
const ORDINALS = ["", "first", "second", "third", "fourth"];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function count(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

function yearsWord(value: number): string {
  return value === 1 ? "every year" : `every ${count(value)} years`;
}

function commencement(rule: TermCommencementRule): string {
  if (rule.kind === "january-first-following-election")
    return "on January 1 after the election";
  if (rule.kind === "january-fixed-day-following-election")
    return `on January ${rule.day} after the election`;
  const month =
    rule.kind === "december-weekday-of-election-year" ? "December" : "January";
  const anchor = `the ${ORDINALS[rule.ordinal]} ${WEEKDAYS[rule.weekday]} of ${month}`;
  if (rule.offsetDays === 0) return `on ${anchor} after the election`;
  const later = (rule.weekday + rule.offsetDays) % 7;
  if (rule.offsetDays > 0 && rule.offsetDays < 7)
    return `on the ${WEEKDAYS[later]} after ${anchor} following the election`;
  return `${count(rule.offsetDays)} days after ${anchor} following the election`;
}

export function describeStateExecutiveTerm(
  rule: Pick<StateExecutiveTermRule, "termYears" | "commencement" | "election">,
): string {
  return (
    `A term here lasts ${count(rule.termYears)} years. ` +
    `The general election is held in November ${yearsWord(rule.election.cycleYears)}, ` +
    `on the first Tuesday after the first Monday, and the winner takes office ${commencement(rule.commencement)}.`
  );
}
