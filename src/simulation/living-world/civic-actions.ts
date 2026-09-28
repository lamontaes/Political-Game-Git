import { ageOnDate } from "../dates";
import { homeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { sittingLocalOfficers } from "./local-government-seats";
import { reactionLens } from "./official-views";

/**
 * Light civic actions (spec 5): residents contact an official or show up at a
 * public meeting of their town's government.
 *
 * APPROVED provisional values (Claude CTO, September 28, 2026, 4:57 a.m.
 * EDT): in a year, 23 percent of adults contact an elected official and 29
 * percent attend a local government meeting (Pew). The personality lens and a
 * strong view of an official make a person likelier to act, and the town's
 * rate is scaled back so its average stays at those shares.
 *
 * NOT MODELED: what the contact said, and which meeting was attended; the
 * event records only that it happened, whom it reached and the government.
 */

export const CIVIC_ACTIONS_VERSION = "civic-actions-v1";

export const CIVIC_ACTION_EVENTS = {
  contacted: "life.contacted-official",
  attended: "life.attended-public-meeting",
} as const;

// APPROVED provisional (Pew): yearly shares, taken here one quarter at a time.
const CONTACT_PER_YEAR = 0.23;
const ATTEND_PER_YEAR = 0.29;
const REVIEWS_PER_YEAR = 4;
// PLACEHOLDER: a person holding a view of an official at least this strong
// is twice as likely to act, before the town's average is restored.
const STRONG_VIEW_POINTS = 20;
const STRONG_VIEW_FACTOR = 2;

function quarterly(perYear: number): number {
  return 1 - (1 - perYear) ** (1 / REVIEWS_PER_YEAR);
}

/** The official this person holds the strongest view of, if any. */
function strongestViewOf(
  world: World,
  personId: EntityId,
): { readonly officialId: EntityId; readonly points: number } | null {
  const sums = new Map<EntityId, number>();
  for (const view of world.history.officialViews ?? [])
    if (view.personId === personId && view.recordedAt <= world.currentDate)
      sums.set(view.officialId, (sums.get(view.officialId) ?? 0) + view.points);
  let best: { officialId: EntityId; points: number } | null = null;
  for (const [officialId, points] of [...sums].sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    if (points !== 0 && (!best || Math.abs(points) > Math.abs(best.points)))
      best = { officialId, points };
  return best;
}

/**
 * One quarterly pass over a town's grown residents. The player acts only by
 * their own choice, so the player is never moved here.
 */
export function reviewTownCivicActions(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  reviewKey: string,
): World {
  const residents = world.personOrder.filter((personId) => {
    const person = world.people[personId];
    return (
      person &&
      personId !== playerPersonId &&
      person.homeJurisdictionId === town &&
      !world.history.personDeaths.some((row) => row.personId === personId) &&
      ageOnDate(person.birthDate, world.currentDate) >= 18
    );
  });
  if (residents.length === 0) return world;
  const units = homeLocalGovernmentUnits(world, residents[0]!).municipal;
  const officers = units.flatMap((unit) => sittingLocalOfficers(world, unit));
  const weights = residents.map((personId) => {
    const view = strongestViewOf(world, personId);
    return (
      reactionLens(world, personId) *
      (view && Math.abs(view.points) >= STRONG_VIEW_POINTS
        ? STRONG_VIEW_FACTOR
        : 1)
    );
  });
  const mean = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  const rng = new SeededRng(world.seed).fork(
    `${CIVIC_ACTIONS_VERSION}:${town}:${reviewKey}`,
  );
  let next = world;
  residents.forEach((personId, index) => {
    const weight = weights[index]! / mean;
    const person = rng.fork(personId);
    if (person.next() < Math.min(0.95, quarterly(CONTACT_PER_YEAR) * weight)) {
      const view = strongestViewOf(world, personId);
      const officialId =
        view?.officialId ??
        (officers.length > 0 ? person.pick(officers).personId : null);
      if (officialId && officialId !== personId)
        next = record(next, town, reviewKey, "contacted", personId, officialId);
    }
    if (
      officers.length > 0 &&
      person.next() < Math.min(0.95, quarterly(ATTEND_PER_YEAR) * weight)
    )
      next = record(next, town, reviewKey, "attended", personId, null);
  });
  return next;
}

function record(
  world: World,
  town: EntityId,
  reviewKey: string,
  action: keyof typeof CIVIC_ACTION_EVENTS,
  personId: EntityId,
  officialId: EntityId | null,
): World {
  const today = world.currentDate;
  const ids = officialId ? [personId, officialId] : [personId];
  return recordWorldEvent(world, {
    stableKey: `${CIVIC_ACTIONS_VERSION}:${town}:${reviewKey}:${action}:${personId}`,
    type: CIVIC_ACTION_EVENTS[action],
    occurredAt: today,
    recordedAt: today,
    jurisdictionId: town,
    involvedEntityIds: ids,
    participants: [
      { personId, role: "focus:subject", detail: null },
      ...(officialId
        ? [
            {
              personId: officialId,
              role: "focus:object" as const,
              detail: null,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["life.civic", CIVIC_ACTIONS_VERSION],
    summary:
      action === "contacted"
        ? "A resident contacted an elected official."
        : "A resident attended a public meeting of the town's government.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** How many of each civic action a town's residents took. */
export function describeTownCivicActions(
  world: World,
  town: EntityId,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of world.history.events)
    if (event.stableKey.startsWith(`${CIVIC_ACTIONS_VERSION}:${town}:`))
      counts[event.type] = (counts[event.type] ?? 0) + 1;
  return counts;
}
