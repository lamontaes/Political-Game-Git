/**
 * P15 closeness: how close two people are follows the time they have spent
 * together. Hours together build toward full closeness without reaching it
 * (closeness = hours / (hours + the hours at half closeness), Hall 2019), and
 * fade without contact by a half-life that is longer between relatives.
 *
 * A relationship row keeps closeness as of its last contact; the current
 * value is that closeness faded by the days since. Nothing here rolls a die:
 * closeness changes only when people spend time together or time passes.
 */
import data from "./data/closeness.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreState, IsoDate, PersonId, Relationship } from "./types";

export const CLOSENESS = data;

type Lookup = (key: string) => number;
type TieRow = { row: string; extended: boolean; sharedChildhood?: string };

const lookup =
  (core: Pick<CoreState, "data">): Lookup =>
  (key) =>
    parameter(key, core.data.parameters);

export function halfLifeDays(p: Lookup, kind: string): number {
  return kind === data.familyKind
    ? p("closenessKinHalfLifeDays")
    : p("closenessOtherHalfLifeDays");
}

/** Hours of time together that a closeness level stands for. */
export function hoursFromLevel(p: Lookup, level: number): number {
  const bounded = Math.min(
    Math.max(level, p("zero")),
    p("one") - Number.EPSILON,
  );
  return (p("closenessHoursAtHalf") * bounded) / (p("one") - bounded);
}

export function levelFromHours(p: Lookup, hours: number): number {
  const bounded = Math.max(hours, p("zero"));
  return bounded / (bounded + p("closenessHoursAtHalf"));
}

function faded(p: Lookup, hours: number, days: number, kind: string): number {
  return hours * Math.pow(p("two"), -days / halfLifeDays(p, kind));
}

function elapsed(p: Lookup, from: IsoDate, to: IsoDate): number {
  return Math.max(daysBetween(makeIsoDate(from), makeIsoDate(to)), p("zero"));
}

/** Closeness today: the closeness at the last contact, faded since. */
export function currentCloseness(
  core: Pick<CoreState, "data" | "date">,
  row: Pick<Relationship, "level" | "lastContactDate" | "kind">,
  date: IsoDate = core.date,
): number {
  const p = lookup(core);
  return levelFromHours(
    p,
    faded(
      p,
      hoursFromLevel(p, row.level),
      elapsed(p, row.lastContactDate, date),
      row.kind,
    ),
  );
}

/** Hours of time together the tie has lost since its last contact. */
export function hoursLost(
  core: Pick<CoreState, "data" | "date">,
  row: Pick<Relationship, "level" | "lastContactDate" | "kind">,
): number {
  const p = lookup(core);
  const hours = hoursFromLevel(p, row.level);
  return (
    hours -
    faded(p, hours, elapsed(p, row.lastContactDate, core.date), row.kind)
  );
}

/** Closeness after spending `hours` together today (negative hours take time away). */
export function closenessAfter(
  core: Pick<CoreState, "data" | "date">,
  row: Pick<Relationship, "level" | "lastContactDate" | "kind"> | undefined,
  kind: string,
  hours: number,
): number {
  stopgap(data.stopgapId);
  const p = lookup(core);
  const before = row
    ? faded(
        p,
        hoursFromLevel(p, row.level),
        elapsed(p, row.lastContactDate, core.date),
        row.kind,
      )
    : p("zero");
  return levelFromHours(p, before + hours);
}

/** Hours together that settle in when people meet at a steady rate (hours per day). */
function steadyHours(p: Lookup, hoursPerDay: number, kind: string): number {
  return (hoursPerDay * halfLifeDays(p, kind)) / Math.LN2;
}

/** Hours after `days` of a steady rate, starting from `start` hours. */
function towardSteady(
  p: Lookup,
  start: number,
  hoursPerDay: number,
  days: number,
  kind: string,
): number {
  const steady = steadyHours(p, hoursPerDay, kind);
  return (
    steady +
    (start - steady) * Math.pow(p("two"), -days / halfLifeDays(p, kind))
  );
}

function meanVisitsPerYear(p: Lookup, row: readonly number[]): number {
  const weights = data.visitsPerYearByCategory.values;
  let visits = p("zero"),
    share = p("zero");
  row.forEach((percent, index) => {
    visits += percent * weights[index]!;
    share += percent;
  });
  return share > p("zero") ? visits / share : p("zero");
}

/**
 * Opening closeness, in hours of time together, between two people at the
 * start of the world: the steady state of how often their kind of tie meets,
 * plus the childhood they shared at home, faded since one of them left.
 */
export function openingClosenessHours(
  core: Pick<CoreState, "data" | "date" | "people">,
  actorId: PersonId,
  otherId: PersonId,
): number {
  stopgap(data.stopgapId);
  const p = lookup(core);
  const actor = core.people.get(actorId)!;
  const other = core.people.get(otherId)!;
  const family = actor.familyIds.has(otherId);
  const kind = family ? data.familyKind : data.householdKind;
  const householdRate =
    p(family ? "householdFamilyMinutesPerDay" : "householdOtherMinutesPerDay") /
    p("minutesPerHour");
  if (actor.householdId === other.householdId)
    return steadyHours(p, householdRate, kind);

  const fact = actor.pastFacts?.find(
    (row) => row.id === `${actorId}${data.kinFactMarker}${otherId}`,
  );
  const relation = fact?.kind.startsWith(data.familyFactPrefix)
    ? fact.kind.slice(data.familyFactPrefix.length)
    : undefined;
  const tie: TieRow | undefined = relation
    ? (data.tieRows as Record<string, TieRow>)[relation]
    : undefined;
  if (!family || !tie) return p("zero");

  const near =
    other.placeId === actor.placeId ||
    (other.countyId !== undefined && other.countyId === actor.countyId);
  const visits =
    meanVisitsPerYear(
      p,
      (data.gss.rows as Record<string, number[]>)[tie.row]!,
    ) *
    (tie.extended ? p("extendedKinVisitShare") : p("one")) *
    (near ? p("one") : p("farKinContactShare"));
  const rate = (visits * p("socialHours")) / p("daysPerMeanYear");

  // Childhood at home together, then the years apart since the elder left.
  const adultDays = p("benchmarkAdultMinimumAge") * p("daysPerMeanYear");
  const age = (birthDate: IsoDate) =>
    daysBetween(makeIsoDate(birthDate), makeIsoDate(core.date));
  let together = p("zero"),
    apart = p("zero");
  if (tie.sharedChildhood === "parent" || tie.sharedChildhood === "child") {
    const child = tie.sharedChildhood === "parent" ? actor : other;
    const childAge = age(child.birthDate);
    if (childAge >= adultDays) {
      together = adultDays;
      apart = childAge - adultDays;
    }
  } else if (tie.sharedChildhood === "sibling") {
    const ages = [age(actor.birthDate), age(other.birthDate)].sort(
      (a, b) => b - a,
    );
    const gap = ages[p("zero")]! - ages[p("one")]!;
    if (ages[p("zero")]! >= adultDays && gap < adultDays) {
      together = adultDays - gap;
      apart = ages[p("zero")]! - adultDays;
    }
  }
  const atParting = towardSteady(p, p("zero"), householdRate, together, kind);
  return together > p("zero")
    ? towardSteady(p, atParting, rate, apart, kind)
    : steadyHours(p, rate, kind);
}
