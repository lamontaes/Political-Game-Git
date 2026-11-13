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

/** Days from today as people say them: "today", "tomorrow", "in three days". */
export function daysSaid(days: number): string {
  const said = data.clock.days as Readonly<Record<string, string>>;
  if (said[String(days)]) return said[String(days)]!;
  return said.more!.replace(
    "{count}",
    days <= HOURS_ON_A_CLOCK ? data.clock.numbers[days]! : String(days),
  );
}

const TEN = 10;
const HUNDRED = 100;
const TWENTY = 20;

/** A whole number under a thousand in words ("sixty-two"). */
function numberWords(count: number): string {
  const words = data.roll;
  if (count < TWENTY) return words.ones[count]!;
  if (count < HUNDRED) {
    const ones = count % TEN;
    const tens = words.tens[Math.floor(count / TEN)]!;
    return ones ? `${tens}-${words.ones[ones]}` : tens;
  }
  const hundred = words.hundred.replace(
    "{count}",
    words.ones[Math.floor(count / HUNDRED)]!,
  );
  const rest = count % HUNDRED;
  return rest
    ? words.hundredAnd
        .replace("{hundred}", hundred)
        .replace("{rest}", numberWords(rest))
    : hundred;
}

/**
 * A floor count as people say it ("five to nothing", "three to two"): yes to
 * no, each in words, none as "nothing" (data/english/count-words.json roll).
 */
export function rollSaid(yes: number, no: number): string {
  const say = (count: number) =>
    count <= 0 ? data.roll.none : numberWords(Math.round(count));
  return data.roll.said.replace("{yes}", say(yes)).replace("{no}", say(no));
}
