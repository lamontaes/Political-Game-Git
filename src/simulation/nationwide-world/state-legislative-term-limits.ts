/**
 * STATE LEGISLATIVE TERM LIMITS — whether a sitting state legislator MAY
 * stand for another term, under the law in force in their state.
 *
 * The law is the policy question "Should state legislators be limited in how
 * many terms they may serve?" (`government-operations.legislative-term-limits`),
 * read through `lawInForce`: the law each state began with (the starting-law
 * file, 16 states say yes on 1/1/2026), or one enacted in play. A repeal lifts
 * the limit and an enactment imposes one, from the day it takes effect.
 *
 * What the limit is comes from the state's own constitution or statute where
 * the state began with one (the table below, from the starting-law rows'
 * citations). A state whose limit is enacted in play takes the most common
 * real rule among the 16: eight years in each chamber, counted consecutively
 * (Arizona, Colorado, Florida, Maine, Nebraska, Ohio and South Dakota).
 *
 * Whether a member who MAY stand WANTS to is their own decision
 * (`careers/another-term`); this module only says when the law forbids it.
 */
import { addDays, makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { createStableId } from "../ids";
import { legislativeTermForRelationship } from "../legislative-office-terms";
import { stateJurisdictionForKey } from "../life-places";
import { workStatusHistory } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import {
  STATE_LEGISLATURE_KEYS,
  seatTenureMatch,
} from "./state-legislature-opening";

export const LEGISLATIVE_TERM_LIMIT_QUESTION =
  "us-policy-positions:government-operations.legislative-term-limits";

/** One state's limit, as its law states it. */
export interface LegislativeTermLimitRule {
  /** Years a member may serve in one chamber; null where the law sets none. */
  readonly perChamberYears: number | null;
  /** Years a member may serve in the legislature as a whole; null where none. */
  readonly totalYears: number | null;
  /**
   * `consecutive`: counted over unbroken service, so a member may return
   * after a break. `lifetime`: every year ever served counts. `within-period`:
   * the years served inside a rolling window (`periodYears`).
   */
  readonly counting: "consecutive" | "lifetime" | "within-period";
  readonly periodYears?: number;
  /** Service before this date does not count (a limit adopted recently). */
  readonly countsFrom?: IsoDate;
  readonly cite: string;
}

const CONSECUTIVE_EIGHT_PER_CHAMBER = (
  cite: string,
): LegislativeTermLimitRule => ({
  perChamberYears: 8,
  totalYears: null,
  counting: "consecutive",
  cite,
});

/**
 * The limits the 16 term-limited states had on 1/1/2026, from the citations
 * in `data/research/laws/starting-law-2026.json`.
 */
export const RESEARCHED_LEGISLATIVE_TERM_LIMITS: Readonly<
  Record<string, LegislativeTermLimitRule>
> = {
  AR: {
    perChamberYears: null,
    totalYears: 12,
    counting: "consecutive",
    cite: "Ark. Const. amend. 73, § 2",
  },
  AZ: CONSECUTIVE_EIGHT_PER_CHAMBER("Ariz. Const. art. 4, pt. 2, § 21"),
  CA: {
    perChamberYears: null,
    totalYears: 12,
    counting: "lifetime",
    cite: "Cal. Const. art. IV, § 2(a)",
  },
  CO: CONSECUTIVE_EIGHT_PER_CHAMBER("Colo. Const. art. V, § 3"),
  FL: CONSECUTIVE_EIGHT_PER_CHAMBER("Fla. Const. art. VI, § 4(b)"),
  LA: {
    perChamberYears: 12,
    totalYears: null,
    counting: "consecutive",
    cite: "La. Const. art. III, § 4(E)",
  },
  ME: CONSECUTIVE_EIGHT_PER_CHAMBER("Me. Rev. Stat. tit. 21-A, § 553"),
  MI: {
    perChamberYears: null,
    totalYears: 12,
    counting: "lifetime",
    cite: "Mich. Const. art. IV, § 54",
  },
  MO: {
    perChamberYears: 8,
    totalYears: 16,
    counting: "lifetime",
    cite: "Mo. Const. art. III, § 8",
  },
  MT: {
    perChamberYears: 8,
    totalYears: null,
    counting: "within-period",
    periodYears: 16,
    cite: "Mont. Const. art. IV, § 8",
  },
  ND: {
    perChamberYears: 8,
    totalYears: 16,
    counting: "lifetime",
    countsFrom: makeIsoDate("2023-01-01"),
    cite: "N.D. Const. art. XV",
  },
  NE: CONSECUTIVE_EIGHT_PER_CHAMBER("Neb. Const. art. III, § 12"),
  NV: {
    perChamberYears: 12,
    totalYears: null,
    counting: "lifetime",
    cite: "Nev. Const. art. 4, §§ 3, 4",
  },
  OH: CONSECUTIVE_EIGHT_PER_CHAMBER("Ohio Const. art. II, § 2"),
  OK: {
    perChamberYears: null,
    totalYears: 12,
    counting: "lifetime",
    cite: "Okla. Const. art. V, § 17A",
  },
  SD: CONSECUTIVE_EIGHT_PER_CHAMBER("S.D. Const. art. III, § 6"),
};

/**
 * The limit a state takes when a law enacted in play imposes one and the
 * state had none to read: the most common real rule among the 16 states
 * (7 of them). ESTIMATED FROM AVERAGE: the most common rule, not this state's.
 */
export const MOST_COMMON_LEGISLATIVE_TERM_LIMIT: LegislativeTermLimitRule =
  CONSECUTIVE_EIGHT_PER_CHAMBER(
    "The most common rule among the 16 term-limited states (Ariz., Colo., Fla., Me., Neb., Ohio, S.D.).",
  );

/** The limit in force for a state's legislators on `onDate`, or null for none. */
export function legislativeTermLimitInForce(
  world: World,
  stateUsps: string,
  onDate: IsoDate,
): LegislativeTermLimitRule | null {
  const state = stateJurisdictionForKey(`US-${stateUsps}`);
  if (!state) return null;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === LEGISLATIVE_TERM_LIMIT_QUESTION,
  );
  if (!proposition) return null;
  const law = lawInForce(world, state.id, proposition.id, onDate);
  if (law?.answer !== "yes") return null;
  return (
    RESEARCHED_LEGISLATIVE_TERM_LIMITS[stateUsps] ??
    MOST_COMMON_LEGISLATIVE_TERM_LIMIT
  );
}

interface Service {
  readonly officeKey: string;
  readonly from: IsoDate;
  readonly until: IsoDate;
}

/** Every stretch a person served in a state legislature, oldest first. */
function legislativeService(
  world: World,
  packId: string,
  personId: EntityId,
  onDate: IsoDate,
): readonly Service[] {
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const service: Service[] = [];
  for (const work of world.history.workRelationships) {
    if (
      work.personId !== personId ||
      work.organizationId !== bodyId ||
      work.kind !== "employment:legislative-member"
    )
      continue;
    if (work.startedAt >= onDate) continue;
    // A seat the opening filled names its chamber in its key; a seat won in
    // a campaign names it through the contest that elected its holder.
    const officeKey =
      seatTenureMatch(work.stableKey)?.[1] ??
      legislativeTermForRelationship(world, work.id)?.contest.office.officeKey;
    if (!officeKey) continue;
    const ended = workStatusHistory(world, work.id).find(
      (status) => status.status === "ended" && status.effectiveAt <= onDate,
    );
    service.push({
      officeKey,
      from: work.startedAt,
      until: ended?.effectiveAt ?? onDate,
    });
  }
  return service.sort((a, b) => a.from.localeCompare(b.from));
}

const DAY_MS = 86_400_000;

function yearsBetween(from: IsoDate, until: IsoDate): number {
  return Math.max(
    0,
    (Date.parse(`${until}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      DAY_MS /
      365.25,
  );
}

/**
 * The years that count toward a limit: the latest unbroken stretch for a
 * consecutive limit (a gap of more than a month breaks it), every year for a
 * lifetime one, the years inside the window for a rolling one.
 */
function countedYears(
  stretches: readonly Service[],
  rule: LegislativeTermLimitRule,
  windowStart: IsoDate | null,
): number {
  const floor = rule.countsFrom ?? null;
  const clip = (service: Service) => {
    const from = [service.from, floor, windowStart]
      .filter((date): date is IsoDate => date !== null)
      .reduce((latest, date) => (date > latest ? date : latest));
    return yearsBetween(from, service.until);
  };
  if (rule.counting !== "consecutive")
    return stretches.reduce((sum, service) => sum + clip(service), 0);
  let total = 0;
  let lastEnd: IsoDate | null = null;
  for (const service of stretches) {
    if (lastEnd !== null && service.from > addDays(lastEnd, 31)) total = 0;
    total += clip(service);
    lastEnd = service.until;
  }
  return total;
}

/**
 * Why the law bars this person from another term in `officeKey` starting
 * `termStartsAt` and ending `termEndsAt`, or null when it does not. A member
 * is barred when the years already served plus the new term would pass the
 * limit (years are rounded to the nearest whole year, since terms begin and
 * end on dates a few days apart).
 */
export function legislativeTermLimitBar(
  world: World,
  input: {
    readonly stateUsps: string;
    readonly packId: string;
    readonly officeKey: string;
    readonly personId: EntityId;
    readonly termStartsAt: IsoDate;
    readonly termEndsAt: IsoDate;
  },
): string | null {
  const rule = legislativeTermLimitInForce(
    world,
    input.stateUsps,
    input.termStartsAt,
  );
  if (!rule) return null;
  const termYears = Math.round(
    yearsBetween(input.termStartsAt, input.termEndsAt),
  );
  const windowStart =
    rule.counting === "within-period" && rule.periodYears
      ? addDays(input.termEndsAt, -Math.round(rule.periodYears * 365.25))
      : null;
  const all = legislativeService(
    world,
    input.packId,
    input.personId,
    input.termStartsAt,
  );
  if (rule.perChamberYears !== null) {
    const served = Math.round(
      countedYears(
        all.filter((service) => service.officeKey === input.officeKey),
        rule,
        windowStart,
      ),
    );
    if (served + termYears > rule.perChamberYears)
      return `they have served ${served} years in this chamber, and the state's limit is ${rule.perChamberYears} (${rule.cite}).`;
  }
  if (rule.totalYears !== null) {
    const served = Math.round(countedYears(all, rule, windowStart));
    if (served + termYears > rule.totalYears)
      return `they have served ${served} years in the legislature, and the state's limit is ${rule.totalYears} (${rule.cite}).`;
  }
  return null;
}
