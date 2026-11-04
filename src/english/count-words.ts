/**
 * A count of votes or a sum of money as people say it in talk
 * (`data/english/count-words.json`): "7 votes", "about 60 votes", "about
 * $400", never the exact tally of a large count or a sum to the cent.
 */
import data from "../../data/english/count-words.json" with { type: "json" };

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
