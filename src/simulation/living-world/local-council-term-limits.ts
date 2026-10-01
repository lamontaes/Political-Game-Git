/**
 * COUNCIL TERM LIMITS — whether a sitting council member MAY stand for
 * another term, under the law in force in their town.
 *
 * The law is the policy question "Should members of the city council be
 * limited in how many terms they may serve?"
 * (`government-operations.council-term-limits`), a county and city question
 * a council answers for itself, read through `lawInForce`. An ordinance that
 * says yes imposes the limit from the day it takes effect; one that says no
 * lifts it.
 *
 * The limit is the most common real rule among the cities that limit their
 * councils: two consecutive full terms (New York City, San Diego, San Jose and
 * Houston, among others). ESTIMATED FROM AVERAGE: the most common rule, not
 * the town's own, since the ordinance in play carries no count of its own.
 *
 * Whether a member who MAY stand WANTS to is their own decision
 * (`careers/another-term`); this module only says when the law forbids it.
 */
import { addDays } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { organizationParticipationStateHistory } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";

export const COUNCIL_TERM_LIMIT_QUESTION =
  "us-policy-positions:government-operations.council-term-limits";

/** Consecutive full terms a member may serve on the council. */
export const MOST_COMMON_COUNCIL_TERM_LIMIT = {
  consecutiveTerms: 2,
  cite: "The most common rule among cities that limit council terms: two consecutive full terms (New York City, San Diego, San Jose, Houston). ESTIMATED FROM AVERAGE.",
} as const;

const COUNCIL_ROLES: ReadonlySet<string> = new Set([
  "leader:municipal-member",
  "leader:municipal-presiding-member",
]);

const DAY_MS = 86_400_000;

function yearsBetween(from: IsoDate, until: IsoDate): number {
  return Math.max(
    0,
    (Date.parse(`${until}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      DAY_MS /
      365.25,
  );
}

/** Whether an ordinance limiting council terms governs the town on `onDate`. */
export function councilTermLimitInForce(
  world: World,
  town: EntityId,
  onDate: IsoDate,
): boolean {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === COUNCIL_TERM_LIMIT_QUESTION);
  if (!proposition) return false;
  return lawInForce(world, town, proposition.id, onDate)?.answer === "yes";
}

/**
 * The years a person has served on this council without a break (a gap of
 * more than a month breaks it), up to `onDate`.
 */
export function consecutiveCouncilYears(
  world: World,
  organizationId: EntityId,
  personId: EntityId,
  onDate: IsoDate,
): number {
  const stretches: { from: IsoDate; until: IsoDate }[] = [];
  for (const participation of world.history.organizationParticipations) {
    if (
      participation.personId !== personId ||
      participation.organizationId !== organizationId ||
      participation.startedAt >= onDate
    )
      continue;
    const states = organizationParticipationStateHistory(
      world,
      participation.id,
    );
    if (!states.some((state) => COUNCIL_ROLES.has(state.roleKind ?? "")))
      continue;
    const ended = states.find(
      (state) => state.status === "ended" && state.effectiveAt <= onDate,
    );
    stretches.push({
      from: participation.startedAt,
      until: ended?.effectiveAt ?? onDate,
    });
  }
  stretches.sort((a, b) => a.from.localeCompare(b.from));
  let total = 0;
  let lastEnd: IsoDate | null = null;
  for (const stretch of stretches) {
    if (lastEnd !== null && stretch.from > addDays(lastEnd, 31)) total = 0;
    total += yearsBetween(stretch.from, stretch.until);
    lastEnd = stretch.until;
  }
  return total;
}

/**
 * Why the town's law bars this council member from another term of
 * `termYears` starting `termStartsAt`, or null when it does not. A member is
 * barred when the years already served plus the new term would pass the
 * limit's full terms (years round to the nearest whole year).
 */
export function councilTermLimitBar(
  world: World,
  input: {
    readonly town: EntityId;
    readonly organizationId: EntityId;
    readonly personId: EntityId;
    readonly termYears: number;
    readonly termStartsAt: IsoDate;
  },
): string | null {
  if (!councilTermLimitInForce(world, input.town, input.termStartsAt))
    return null;
  const limitYears =
    MOST_COMMON_COUNCIL_TERM_LIMIT.consecutiveTerms * input.termYears;
  const served = Math.round(
    consecutiveCouncilYears(
      world,
      input.organizationId,
      input.personId,
      input.termStartsAt,
    ),
  );
  if (served + input.termYears <= limitYears) return null;
  return `they have served ${served} years in a row on the council, and the town's limit is ${MOST_COMMON_COUNCIL_TERM_LIMIT.consecutiveTerms} consecutive terms of ${input.termYears} years.`;
}
