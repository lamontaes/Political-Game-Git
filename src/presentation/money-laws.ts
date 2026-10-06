import type {
  EntityId,
  LawExposureChannel,
  LawExposureRecord,
  World,
} from "../simulation";
import { moneyText } from "../simulation/money-text";
import { lawExposureSentence } from "./law-exposure-lines";
import { proseDate } from "./prose-dates";

/**
 * Money and property: what laws enacted in play did to money, for the player
 * and for the town they live in. Every line is read from the law exposures
 * the lanes write when a law actually reaches a person's paycheck, taxes,
 * benefits or rent (`../simulation/law-exposure.ts`); nothing here is
 * estimated or added. Each line names the law so the screen can open it.
 */

export interface MoneyLawLine {
  readonly key: string;
  readonly measureId: EntityId;
  /** "Raise the Federal Minimum Wage Act of 2027 (H.R. 3)". */
  readonly lawLabel: string;
  readonly text: string;
  /** "May 7, 2027" for the player's own lines; null for the town's. */
  readonly dateLabel: string | null;
}

export interface MoneyLaws {
  readonly placeName: string;
  /** The player's own, their family's, and what friends told them. */
  readonly yours: readonly MoneyLawLine[];
  /** Each law's reach across the town, largest first. */
  readonly town: readonly MoneyLawLine[];
  /** Said when neither list has a line. */
  readonly empty: string | null;
}

/** The player's most recent lines shown; older ones stay in the Journal. */
const MOST_OWN_LINES = 5;

type Direction = LawExposureRecord["direction"];

/** What a law did through a channel to a group, with or without a sum. */
const TOWN_WORDS: Record<
  LawExposureChannel,
  Record<Direction, (who: string, sum: string) => string>
> = {
  paycheck: {
    gain: (who, sum) => `added ${sum} to the pay of ${who}`,
    cost: (who, sum) => `took ${sum} from the pay of ${who}`,
    none: (who) => `changed the pay of ${who}`,
  },
  "tax-payment": {
    gain: (who, sum) => `returned ${sum} in taxes to ${who}`,
    cost: (who, sum) => `cost ${who} ${sum} in taxes`,
    none: (who) => `changed the taxes paid by ${who}`,
  },
  benefit: {
    gain: (who, sum) => `paid ${who} ${sum} in benefits`,
    cost: (who, sum) => `cut ${sum} from benefits paid to ${who}`,
    none: (who) => `changed benefits paid to ${who}`,
  },
  "job-rule": {
    gain: (who, sum) => `gained ${who} ${sum} at work`,
    cost: (who, sum) => `cost ${who} ${sum} at work`,
    none: (who) => `changed the rules at work for ${who}`,
  },
  "business-rule": {
    gain: (who, sum) => `saved the businesses of ${who} ${sum}`,
    cost: (who, sum) => `cost the businesses of ${who} ${sum}`,
    none: (who) => `changed the rules for the businesses of ${who}`,
  },
  "public-service": {
    gain: (who, sum) => `saved ${who} ${sum} on public services`,
    cost: (who, sum) => `cost ${who} ${sum} for public services`,
    none: (who) => `changed public services used by ${who}`,
  },
  "outcome-web": {
    gain: (who) => `recorded an environmental exposure for ${who}`,
    cost: (who) => `recorded an environmental exposure for ${who}`,
    none: (who) => `recorded a monthly place measure for ${who}`,
  },
  rent: {
    gain: (who, sum) => `lowered the rent of ${who} by ${sum}`,
    cost: (who, sum) => `raised the rent of ${who} by ${sum}`,
    none: (who) => `changed the rent rules for ${who}`,
  },
};

/**
 * The total a group's exposures add up to: "$1,407.45 a month" when every
 * amount is monthly in one currency, "$300" when every one is one-time, and
 * null when amounts are missing or mixed, so no sum is claimed.
 */
function totalText(rows: readonly LawExposureRecord[]): string | null {
  const first = rows[0]?.amount;
  if (!first) return null;
  const cadence = rows[0]!.cadence;
  let minorUnits = 0;
  for (const row of rows) {
    if (
      !row.amount ||
      row.amount.currency !== first.currency ||
      row.cadence !== cadence
    )
      return null;
    minorUnits += row.amount.minorUnits;
  }
  const money = moneyText({ minorUnits, currency: first.currency });
  return cadence === "monthly" ? `${money} a month` : money;
}

function lawLabel(world: World, measureId: EntityId): string | null {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  const title = measure?.shortTitle?.trim();
  if (!measure || !title) return null;
  return `${title} (${measure.designation})`;
}

function leadingThe(label: string): string {
  return /^the\s/i.test(label) ? label : `The ${label}`;
}

export function projectMoneyLaws(
  world: World,
  personId: EntityId,
): MoneyLaws | null {
  const person = world.people[personId];
  if (!person) return null;
  const home = person.homeJurisdictionId;
  const placeName = world.jurisdictions[home]?.name ?? "this place";
  const exposures = (world.history.lawExposures ?? []).filter(
    (row) =>
      row.channel !== "outcome-web" && row.recordedAt <= world.currentDate,
  );

  const yours: MoneyLawLine[] = [];
  const mine = exposures
    .filter((row) => row.personId === personId)
    .sort(
      (left, right) =>
        right.recordedAt.localeCompare(left.recordedAt) ||
        right.sequence - left.sequence,
    );
  for (const row of mine) {
    if (yours.length >= MOST_OWN_LINES) break;
    const text = lawExposureSentence(world, personId, row);
    const label = lawLabel(world, row.measureId);
    if (!text || !label) continue;
    yours.push({
      key: `yours:${row.id}`,
      measureId: row.measureId,
      lawLabel: label,
      text,
      dateLabel: proseDate(row.recordedAt),
    });
  }

  // The town: each person's own exposure once, the latest, for people who
  // live here now. A law that reached one person twice counts them once.
  const groups = new Map<string, Map<EntityId, LawExposureRecord>>();
  for (const row of exposures) {
    if (row.relation !== "own") continue;
    if (world.people[row.personId]?.homeJurisdictionId !== home) continue;
    const direction: Direction = row.amount === null ? "none" : row.direction;
    const key = `${row.measureId}|${row.channel}|${direction}`;
    const byPerson = groups.get(key) ?? new Map();
    const held = byPerson.get(row.personId);
    if (!held || held.recordedAt <= row.recordedAt)
      byPerson.set(row.personId, row);
    groups.set(key, byPerson);
  }
  const town = [...groups.entries()]
    .flatMap(([key, byPerson]) => {
      const rows = [...byPerson.values()];
      const first = rows[0]!;
      const label = lawLabel(world, first.measureId);
      if (!label) return [];
      const people = rows.length;
      const who = `${people} ${people === 1 ? "person" : "people"} in ${placeName}`;
      const direction: Direction =
        first.amount === null ? "none" : first.direction;
      const sum = direction === "none" ? null : totalText(rows);
      const words = TOWN_WORDS[first.channel][sum ? direction : "none"](
        who,
        sum ?? "",
      );
      return [
        {
          people,
          line: {
            key: `town:${key}`,
            measureId: first.measureId,
            lawLabel: label,
            text: `${leadingThe(label)} ${words}.`,
            dateLabel: null,
          },
        },
      ];
    })
    .sort(
      (left, right) =>
        right.people - left.people ||
        left.line.lawLabel.localeCompare(right.line.lawLabel),
    )
    .map((row) => row.line);

  return {
    placeName,
    yours,
    town,
    empty:
      yours.length === 0 && town.length === 0
        ? `No new law has reached anyone's money in ${placeName} yet.`
        : null,
  };
}
