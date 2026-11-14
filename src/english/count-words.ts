/**
 * A count of votes or a sum of money as people say it in talk
 * (`data/english/count-words.json`): "7 votes", "about 60 votes", "about
 * $400", never the exact tally of a large count or a sum to the cent.
 */
import data from "../../data/english/count-words.json" with { type: "json" };
import filedWords from "../../data/english/filed-words.json" with { type: "json" };

type Step = { below: number | null; step: number };

const stepFor = (steps: readonly Step[], value: number) =>
  steps.find((row) => row.below === null || value < row.below)!.step;

const fill = (template: string, count: number) =>
  template.replace("{count}", count.toLocaleString("en-US"));

/** A count of votes: exact when close, rounded as people round it when not. */
export function votesSaid(votes: number): string {
  const count = Math.max(1, Math.round(votes));
  if (count < data.exactVotesBelow.value)
    return fill(count === 1 ? data.vote : data.votes, count);
  const step = stepFor(data.voteSteps, count);
  return fill(data.aboutVotes, Math.round(count / step) * step);
}

/** A sum of money, given in cents, as people round it. */
export function moneySaid(minor: number): string {
  const dollars = minor / 100;
  const step = stepFor(data.moneySteps, dollars);
  return fill(
    data.aboutMoney,
    Math.max(step, Math.round(dollars / step) * step),
  );
}

/** How long rent has gone unpaid, in days, as people say it: "about two months". */
export function lateSaid(days: number): string {
  const rows = data.lateSteps.rows as readonly {
    below: number | null;
    said: string;
  }[];
  return rows.find((row) => row.below === null || days < row.below)!.said;
}

/**
 * The days a number of months of rent stand for, so a household that owes
 * two months of rent has been behind about two months whatever day its first
 * payment was missed.
 */
export function monthsOfRentDays(months: number): number {
  return Math.round(months * data.lateSteps.daysPerMonth);
}

/**
 * How many others have filed for an office, as a clerk says it ("two other
 * candidates"), from `data/english/filed-words.json`; empty for none.
 */
export function filedSaid(count: number): string {
  if (count < 1) return "";
  return filedWords.others[count - 1] ?? filedWords.many;
}

/**
 * How many have filed for an office so far, said before the player has filed
 * ("two candidates"): "other" and "before you" are only true once they have
 * (Fable A, Nov 13, rule 1).
 */
export function filedSoFarSaid(count: number): string {
  if (count < 1) return "";
  return filedWords.soFar[count - 1] ?? filedWords.manySoFar;
}
