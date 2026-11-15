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
import { daysBetweenText } from "./kernel/dates";
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import type {
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Relationship,
} from "./types";

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
  return Math.max(daysBetweenText(from, to), p("zero"));
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

/**
 * How close two people are today: the one closeness read every engine uses
 * (stress audit defect 21). The stored level is closeness as of the last
 * contact; this fades it to today. Zero for people with no tie.
 */
export function closenessBetween(
  core: Pick<CoreState, "data" | "date" | "relationships">,
  a: PersonId,
  b: PersonId,
): number {
  return closenessBetweenAfter(
    core,
    a,
    b,
    parameter("zero", core.data.parameters),
  );
}

/**
 * Hours two people have spent together that no relationship row keeps,
 * read from another engine's record when asked (the sittings two members of
 * one body have shared, `sitting-closeness.ts`), already faded to today.
 * Every engine that keeps such a record registers its reader; the hours add.
 */
type SharedHours = (core: object, a: PersonId, b: PersonId) => number;
const sharedReaders = new Set<SharedHours>();

/**
 * Who a reader's record says a person knows, and when two of them shared
 * time: a reader of shared hours answers from the set it already keeps (the
 * colleagues one knows through a body's sittings), so "who does this person
 * know" and "have these two met" have one answer for every engine and scene.
 */
export interface KnownThrough {
  /** The kind of tie the reader's hours fade as. */
  readonly kind: string;
  /** Everyone the record says this person knows, nearest first by the record's own order. */
  readonly knownTo: (core: object, id: PersonId) => readonly PersonId[];
  /** The first and the last day the two shared time in the record, and the record; null when they have not. */
  readonly together: (
    core: object,
    a: PersonId,
    b: PersonId,
  ) => { first: IsoDate; last: IsoDate; sourceId: string } | null;
}
const knownReaders = new Map<SharedHours, KnownThrough>();

export function registerSharedHours(
  reader: SharedHours,
  known?: KnownThrough,
): void {
  sharedReaders.add(reader);
  if (known) knownReaders.set(reader, known);
}

/**
 * Everyone a person knows: those they have a tie row with, and those a
 * registered reader's record says they know (colleagues they sit with).
 */
export function knownPeople(
  core: Pick<CoreState, "relationships" | "relationshipsByPerson">,
  id: PersonId,
): ReadonlySet<PersonId> {
  const out = new Set<PersonId>(knownThroughRecords(core, id));
  for (const key of core.relationshipsByPerson.get(id) ?? []) {
    const row = core.relationships.get(key);
    if (row) out.add(row.actorId === id ? row.otherId : row.actorId);
  }
  return out;
}

/** The half of `knownPeople` no tie row holds: those a registered reader's record says a person knows, in its order. */
export function knownThroughRecords(
  core: object,
  id: PersonId,
): ReadonlySet<PersonId> {
  const out = new Set<PersonId>();
  for (const known of knownReaders.values())
    for (const other of known.knownTo(core, id)) out.add(other);
  out.delete(id);
  return out;
}

/**
 * Whether, and since when, two people have met: their tie row (its last
 * contact and id), or else the first day a registered reader's record says
 * they shared time (the first sitting of a body both sit on) and that record.
 * Null when neither says so: an act on record with no time together is not a
 * meeting.
 */
export function metThrough(
  core: Pick<CoreState, "relationships">,
  a: PersonId,
  b: PersonId,
): { date: IsoDate; sourceId: string } | null {
  if (a === b) return null;
  const key = a < b ? `${a}:${b}` : `${b}:${a}`;
  const row = core.relationships.get(key);
  if (row) return { date: row.lastContactDate, sourceId: row.id };
  let first: { date: IsoDate; sourceId: string } | null = null;
  for (const known of knownReaders.values()) {
    const met = known.together(core, a, b);
    if (met && (!first || met.first < first.date))
      first = { date: met.first, sourceId: met.sourceId };
  }
  return first;
}

/**
 * The last day two people were together: their row's last contact, or the
 * last sitting of a body both sit on, whichever is later; null when neither
 * says they ever were. The one answer to "when did these two last see each
 * other", for the hours a tie has lost and for whether the player has seen
 * someone lately (calendar.ts).
 */
export function lastTogether(
  core: Pick<CoreState, "relationships">,
  a: PersonId,
  b: PersonId,
): IsoDate | null {
  if (a === b) return null;
  return timeTogether(core, a, b, false).last;
}

function timeTogether(
  core: Pick<CoreState, "relationships">,
  a: PersonId,
  b: PersonId,
  withHours: boolean,
): {
  row: Relationship | undefined;
  last: IsoDate | null;
  shared: { now: number; kind: string }[];
} {
  const row = core.relationships.get(a < b ? `${a}:${b}` : `${b}:${a}`);
  const shared: { now: number; kind: string }[] = [];
  let last: IsoDate | null = row ? row.lastContactDate : null;
  for (const [reader, known] of knownReaders) {
    const met = known.together(core, a, b);
    if (!met) continue;
    if (withHours) shared.push({ now: reader(core, a, b), kind: known.kind });
    if (!last || met.last > last) last = met.last as IsoDate;
  }
  return { row, last, shared };
}

/**
 * The hours a tie has lost since the two were last together, over all its
 * time: the row's own and each reader's shared hours, each at its half-life,
 * since the last day any of them had the two together (the row's last
 * contact, or the last sitting both sat). Two colleagues who sat together
 * yesterday have lost a day, however long ago their row's last contact was.
 * What a person misses about someone they have not seen.
 */
export function tieHoursLost(
  core: Pick<
    CoreState,
    "data" | "date" | "relationships" | "relationshipsByPerson"
  >,
  a: PersonId,
  b: PersonId,
): number {
  const p = lookup(core);
  const { row, last, shared } = timeTogether(core, a, b, true);
  if (!last) return p("zero");
  let lost = p("zero");
  if (row) {
    const hours = hoursFromLevel(p, row.level);
    lost +=
      faded(p, hours, elapsed(p, row.lastContactDate, last), row.kind) -
      faded(p, hours, elapsed(p, row.lastContactDate, core.date), row.kind);
  }
  // The readers' hours are already faded to today; on the last day together
  // they were that much more.
  for (const { now, kind } of shared)
    lost +=
      now *
      (Math.pow(p("two"), elapsed(p, last, core.date) / halfLifeDays(p, kind)) -
        p("one"));
  return lost;
}

/** The hours every registered reader says two people shared, faded to today. */
export function sharedHoursBetween(
  core: object,
  a: PersonId,
  b: PersonId,
): number {
  if (a === b) return 0;
  let hours = 0;
  for (const reader of sharedReaders) hours += reader(core, a, b);
  return hours;
}

/**
 * Strain on a row the row's own hours did not cover (`owedHours`, kept as of
 * its last contact), faded as the tie fades, so it is taken off the shared
 * hours too and wears away as they do.
 */
function owedToday(
  p: Lookup,
  row: Pick<Relationship, "owedHours" | "lastContactDate" | "kind">,
  date: IsoDate,
): number {
  return row.owedHours
    ? faded(p, row.owedHours, elapsed(p, row.lastContactDate, date), row.kind)
    : p("zero");
}

/**
 * How close two people would be after `hours` more together today (negative
 * takes time away): their tie's hours faded to today, less any strain the
 * row owes, plus the hours another engine's record says they shared
 * (`registerSharedHours`). Never below zero. With no tie and nothing shared
 * it is zero; with `hours` zero it is today's closeness.
 */
export function closenessBetweenAfter(
  core: Pick<CoreState, "data" | "date" | "relationships">,
  a: PersonId,
  b: PersonId,
  hours: number,
): number {
  const row = core.relationships.get(a < b ? `${a}:${b}` : `${b}:${a}`);
  const shared = sharedHoursBetween(core, a, b);
  // Nothing shared and nothing added: the tie as it stands (the common read).
  if (!shared && !hours)
    return row
      ? currentCloseness(core, row)
      : parameter("zero", core.data.parameters);
  const p = lookup(core);
  return levelFromHours(p, rowHours(core, p, row) + shared + hours);
}

/** A row's hours faded to today, less the strain it owes; zero with no row. */
function rowHours(
  core: Pick<CoreState, "date">,
  p: Lookup,
  row: Relationship | undefined,
): number {
  return row
    ? faded(
        p,
        hoursFromLevel(p, row.level),
        elapsed(p, row.lastContactDate, core.date),
        row.kind,
      ) - owedToday(p, row, core.date)
    : p("zero");
}

/**
 * The hours a tie stands on today: its row's hours faded to today, less any
 * strain the row owes, plus the hours another engine's record says the two
 * shared (`registerSharedHours`). What a share of the tie is taken from (a
 * lie found out, scene-talk-rules endingStrain trust-lost).
 */
export function tieHoursBetween(
  core: Pick<CoreState, "data" | "date" | "relationships">,
  a: PersonId,
  b: PersonId,
): number {
  const row = core.relationships.get(a < b ? `${a}:${b}` : `${b}:${a}`);
  return rowHours(core, lookup(core), row) + sharedHoursBetween(core, a, b);
}

/**
 * A tie after `hours` more together today (negative is a strain): its level,
 * and the strain its own hours did not cover. The strain beyond the row's
 * own hours is kept only up to the hours the two shared elsewhere
 * (`shared`, read only when the row runs out), so a strain takes off at most
 * the whole tie and closeness never goes below zero; with nothing shared it
 * stops at zero as it always has.
 */
export function tieAfter(
  core: Pick<CoreState, "data" | "date">,
  row:
    | Pick<Relationship, "level" | "lastContactDate" | "kind" | "owedHours">
    | undefined,
  kind: string,
  hours: number,
  shared: () => number,
): { readonly level: number; readonly owedHours: number } {
  stopgap(data.stopgapId);
  const p = lookup(core);
  const net =
    (row
      ? faded(
          p,
          hoursFromLevel(p, row.level),
          elapsed(p, row.lastContactDate, core.date),
          row.kind,
        ) - owedToday(p, row, core.date)
      : p("zero")) + hours;
  if (net >= p("zero"))
    return { level: levelFromHours(p, net), owedHours: p("zero") };
  return {
    level: p("zero"),
    owedHours: Math.min(-net, Math.max(shared(), p("zero"))),
  };
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
  core: Pick<CoreState, "data" | "date" | "people" | "husks">,
  actorId: PersonId,
  otherId: PersonId,
): number {
  stopgap(data.stopgapId);
  const p = lookup(core);
  const actor = core.people.get(actorId)!;
  const other = core.people.get(otherId) ?? core.husks.get(otherId)!;
  const family = actor.familyIds.has(otherId);
  const kind = family ? data.familyKind : data.householdKind;
  const householdRate =
    p(family ? "householdFamilyMinutesPerDay" : "householdOtherMinutesPerDay") /
    p("minutesPerHour");
  if ("householdId" in other && actor.householdId === other.householdId)
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
  const adultDays = p("votingAge") * p("daysPerMeanYear");
  const age = (birthDate: IsoDate) => daysBetweenText(birthDate, core.date);
  let together = p("zero"),
    apart = p("zero");
  if (tie.sharedChildhood === "parent" || tie.sharedChildhood === "child") {
    const child = tie.sharedChildhood === "parent" ? actor : other;
    const childAge =
      child.birthDate === undefined ? undefined : age(child.birthDate);
    if (childAge !== undefined && childAge >= adultDays) {
      together = adultDays;
      apart = childAge - adultDays;
    }
  } else if (
    tie.sharedChildhood === "sibling" &&
    other.birthDate !== undefined
  ) {
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

/** A relative as a person's own records name them: the relation and the fact that records it. */
export interface FamilyFact {
  relation: string;
  factId: string;
}

/**
 * Every relative a person's own past facts name (`family:<relation>` naming
 * the other), each with the latest fact recorded for them, since a
 * partnership that ended is a later fact than the partnership. Former ties
 * stay in, under their own relation (a former partner). The one reader of
 * family facts: the director, the card, the calendar and every scene read
 * relatives through it or `familyRelation`.
 */
export function familyFactsOf(
  person: Pick<PersonState, "pastFacts"> | undefined,
): Map<PersonId, FamilyFact> {
  const out = new Map<PersonId, FamilyFact>();
  for (const fact of person?.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    if (!otherId || !fact.kind.startsWith(data.familyFactPrefix)) continue;
    out.set(otherId as PersonId, {
      relation: fact.kind.slice(data.familyFactPrefix.length),
      factId: fact.id,
    });
  }
  return out;
}

/** Whether a relation names a tie that has ended (a former partner). */
export function formerKin(relation: string): boolean {
  return data.formerKinRelations.includes(relation);
}

/** The relation a person's records hold for a relative today; undefined for none or an ended tie. */
function recordedRelation(
  person: Pick<PersonState, "pastFacts"> | undefined,
  otherId: PersonId,
): string | undefined {
  const relation = familyFactsOf(person).get(otherId)?.relation;
  return relation === undefined || formerKin(relation) ? undefined : relation;
}

/**
 * How two people are family today, from the records: the relation either one
 * records for the other (parent, sibling, partner, aunt-or-uncle and the
 * rest of the opening family, and the partners and children that come after),
 * else the household relation for two people who share a home. Null when
 * nothing joins them. A relative still in the wider population is read from
 * the full person's own facts, so a counted relative counts the same.
 */
export function familyRelation(
  core: Pick<CoreState, "people">,
  a: PersonId,
  b: PersonId,
): string | null {
  if (a === b) return null;
  const left = core.people.get(a),
    right = core.people.get(b);
  const recorded = recordedRelation(left, b) ?? recordedRelation(right, a);
  if (recorded) return recorded;
  return left && right && left.householdId === right.householdId
    ? data.householdRelation
    : null;
}

/**
 * Whether two people are blood relatives by the records (a parent, child,
 * sibling, grandparent, grandchild, aunt or uncle, niece or nephew), as
 * opposed to a partner, a former partner or someone who only shares a home.
 */
export function bloodKin(
  core: Pick<CoreState, "people">,
  a: PersonId,
  b: PersonId,
): boolean {
  const relation = familyRelation(core, a, b);
  return (
    relation !== null &&
    (data.bloodKinRelations as readonly string[]).includes(relation)
  );
}

/**
 * The hours a contact counts for, by the two people's temperaments: time
 * together builds closeness faster between warm, outgoing people and slower
 * between reserved ones (relationships.warm-to), and a falling-out (negative
 * hours) costs more between people who hold on to a quarrel than between
 * people who let it go (relationships.fall-out). The pair's mean lean, less
 * the population's, scales the hours by its weight's exponential, so a pair
 * one standard deviation warmer gains the studied ratio and the average pair
 * keeps the closeness model's hours.
 */
export function temperedHours(
  core: Pick<CoreState, "data">,
  actor: { traits?: PersonState["traits"] } | undefined,
  other: { traits?: PersonState["traits"] } | undefined,
  hours: number,
): number {
  const p = lookup(core);
  // A husk (someone not yet filled in) carries no traits: their time counts as recorded.
  const a = actor?.traits,
    b = other?.traits;
  if (!a || !b || hours === p("zero")) return hours;
  const warm = hours > p("zero");
  const id = warm ? "relationships.warm-to" : "relationships.fall-out";
  const toward = warm ? "warm" : "hold-on",
    over = warm ? "cool" : "let-go";
  const lean =
    (decisionLean(core, { traits: a }, id, toward, over) +
      decisionLean(core, { traits: b }, id, toward, over)) /
    p("two");
  const center = p(
    warm ? "relationshipsWarmToLeanCenter" : "relationshipsFallOutLeanCenter",
  );
  return hours * Math.exp(decisionTraitWeight(core, id) * (lean - center));
}

// Members of a body know each other from the sittings they share: the engine
// that keeps the bodies' calendars registers them through this entry.
export {
  noSittingTie,
  registerSittingCalendar,
  sittingHours,
  sittingHoursByBody,
  type SittingCalendar,
  type SittingDay,
} from "./sitting-closeness";
