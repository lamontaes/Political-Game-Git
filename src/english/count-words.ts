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
  const unit = data.moneyUnits.rows.find((row) => dollars >= row.atLeast);
  if (unit) {
    const count = dollars / unit.divisor;
    const said =
      count < data.moneyUnits.decimalBelow
        ? String(Math.round(count * 10) / 10)
        : Math.round(count).toLocaleString("en-US");
    return data.aboutMoney.replace("{count}", `${said} ${unit.word}`);
  }
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

/** A percent as people say it: "about 9 percent", "about 4.5 percent". */
function percentSaid(value: number): string {
  const words = data.percentWords;
  const count =
    Math.abs(value) < words.decimalBelow.value
      ? Math.round(value * 10) / 10
      : Math.round(value);
  return words.percent.replace("{count}", count.toLocaleString("en-US"));
}

/**
 * How far a measure moved, as a speech says it (`percentWords`): a share by
 * where it stood and where it stands ("from about 12 percent to about 14
 * percent"), any other measure by how far it moved against where it stood
 * ("by about 9 percent"). Null when the move rounds to nothing.
 */
export function changeSaid(
  from: number,
  to: number,
  share: boolean,
): string | null {
  const words = data.percentWords;
  if (share) {
    const [was, now] = [percentSaid(from), percentSaid(to)];
    return was === now
      ? null
      : words.fromTo.replace("{from}", was).replace("{to}", now);
  }
  if (!from) return null;
  const moved = Math.abs((to - from) / from) * 100;
  const said = percentSaid(moved);
  return said === percentSaid(0) ? null : words.by.replace("{change}", said);
}

/** A whole count as people say it: below ten in words ("two years"), else in digits. */
export function countSaid(count: number): string {
  const word = data.smallCounts.words[count];
  return word && Number.isInteger(count) ? word : count.toLocaleString("en-US");
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

const MINUTES_PER_HOUR = 60;
const HOURS_ON_A_CLOCK = 12;
const HOURS_IN_A_DAY = 24;

/**
 * A minute of the day as people say it in talk (`data/english/count-words.json`
 * clock): "seven", "seven-thirty", "noon", rounded to the quarter hour.
 */
export function clockSaid(minuteOfDay: number): string {
  const step = data.clock.stepMinutes.value;
  const rounded = Math.round(minuteOfDay / step) * step;
  const hour = Math.floor(rounded / MINUTES_PER_HOUR) % HOURS_IN_A_DAY;
  const minute = rounded % MINUTES_PER_HOUR;
  if (!minute && hour === HOURS_ON_A_CLOCK) return data.clock.noon;
  if (!minute && !hour) return data.clock.midnight;
  const word = data.clock.numbers[hour % HOURS_ON_A_CLOCK]!;
  const quarter = (data.clock.quarters as Readonly<Record<string, string>>)[
    String(minute)
  ];
  return quarter ? quarter.replace("{hour}", word) : word;
}

/** A span of work as people say it: "an hour", "eight hours". */
export function hoursSaid(minutes: number): string {
  const count = Math.max(1, Math.round(minutes / MINUTES_PER_HOUR));
  if (count === 1) return data.clock.hour;
  return data.clock.hours.replace(
    "{count}",
    data.clock.numbers[count] && count <= HOURS_ON_A_CLOCK
      ? data.clock.numbers[count]!
      : String(count),
  );
}

/** A term of office in years as people say it: "four years". */
export function termSaid(years: number): string {
  const count = Math.max(1, Math.round(years));
  if (count === 1) return data.term.year;
  return data.term.years.replace(
    "{count}",
    data.clock.numbers[count] && count <= HOURS_ON_A_CLOCK
      ? data.clock.numbers[count]!
      : String(count),
  );
}

/** Days from today as people say them: "today", "tomorrow", "in three days". */
export function daysSaid(days: number): string {
  const said = data.clock.days as Readonly<Record<string, string>>;
  if (said[String(days)]) return said[String(days)]!;
  return said.more!.replace(
    "{count}",
    days <= HOURS_ON_A_CLOCK ? data.clock.numbers[days]! : String(days),
  );
}
