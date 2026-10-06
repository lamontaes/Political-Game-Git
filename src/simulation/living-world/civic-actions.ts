import { futureDueItemStateAt } from "../future-transitions";
import { recordByStableKey } from "../history-index";
import { LOCAL_COUNCIL_MEETING } from "./local-council-meetings";
import { addDays, ageOnDate, daysBetween } from "../dates";
import { currentGovernorOf } from "../crisis/offices";
import { lifePlaceByJurisdictionId } from "../life-places";
import { activeWorkRelationshipsAt } from "../life-queries";
import { homeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import { homeJurisdictionResidenceSince } from "../nationwide-world/residence-duration";
import {
  lawInterestMembersInTown,
  strongestOfficialStanding,
} from "../official-view-reads";
import type { EntityId, FutureDueItem, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  localHeadOfGovernment,
  sittingLocalOfficers,
} from "./local-government-seats";
import { reactionLens } from "./official-views";
import { livedOutcomesOf } from "./lived-outcomes";
import {
  councilWardPlan,
  homePosition,
  isWardSeat,
  seatWard,
  townWardMap,
  wardAt,
} from "./town-wards";

/**
 * Light civic actions (spec 5): residents contact an official or show up at a
 * public meeting of their town's government.
 *
 * Each is a person's own decision, never a draw (no-dice rule). A resident's
 * pull toward acting grows with what gives them a stake in the town's
 * government: their years of adult life, their years in the town, a job, a
 * strong view of an official, a law that cost them this past year, and a
 * group they joined against a law. Their temperament (`reactionLens`) scales
 * it. The pull adds up quarter by quarter from the day they became an adult
 * resident of the town, and each time it passes a full measure, they act.
 * People with more at stake act more often, and no two start on the same
 * day, so a town's contacts spread over the year.
 *
 * The APPROVED provisional shares (Claude CTO, September 28, 2026, 4:57 a.m.
 * EDT) are the check on totals, never the mechanism: in a year, 23 percent
 * of adults contact an elected official and 29 percent attend a local
 * government meeting (Pew). The measures below are set so a town's totals
 * land near them; `tests/nationwide/town-civic-actions.test.ts` checks it.
 *
 * NOT MODELED: what the contact said. Attendance names the existing scheduled
 * council meeting held in the reviewed quarter, dated on that meeting. A
 * scheduled meeting is eligible only on the current review date.
 */

export const CIVIC_ACTIONS_VERSION = "civic-actions-v2";

export const CIVIC_ACTION_EVENTS = {
  contacted: "life.contacted-official",
  attended: "life.attended-public-meeting",
} as const;

const DAYS_PER_QUARTER = 91;
// PLACEHOLDER weights, in parts of one quarter's pull. Age and years in town
// are the strongest everyday predictors of local civic contact in the Pew and
// Census civic engagement surveys; the weights themselves are game values.
const STAKE = {
  adultYears: { full: 50, weight: 0.6 },
  townYears: { full: 20, weight: 0.4 },
  job: 0.25,
  lawCost: 0.5,
  groupMember: 1,
} as const;
// PLACEHOLDER: a view of an official at least this strong doubles the pull.
const STRONG_VIEW_POINTS = 20;
const STRONG_VIEW_FACTOR = 2;
// Calibrated: the pull a person gathers before they act once, set so a
// town's yearly totals land near the approved shares above.
const MEASURE = { contacted: 14, attended: 13 } as const;

/** The official this person holds the strongest saved view of, if any. */
function strongestViewOf(
  world: World,
  personId: EntityId,
): ReturnType<typeof strongestOfficialStanding> {
  return strongestOfficialStanding(world, personId);
}

interface CivicStake {
  /** The day the pull started adding up: adulthood or arrival in town. */
  readonly since: IsoDate;
  readonly pull: { readonly contacted: number; readonly attended: number };
  readonly view: ReturnType<typeof strongestOfficialStanding>;
  /** Record evidence that explains why this contact occurred, if any. */
  readonly reason: {
    readonly kind:
      | "law-cost"
      | "lived-outcome"
      | "official-view"
      | "organized-opposition"
      | "general-opinion";
    readonly sourceRecordIds: readonly EntityId[];
  };
}

/** What gives this resident a stake in the town's government, today. */
function civicStake(
  world: World,
  personId: EntityId,
  town: EntityId,
  groupMembers: ReadonlySet<EntityId>,
): CivicStake {
  const person = world.people[personId]!;
  const today = world.currentDate;
  const adultOn = addDays(person.birthDate, Math.round(18 * 365.25));
  // The record of where people lived begins with the world. A resident
  // already in town when it began counts as living there since adulthood (a
  // game assumption: the years before the record are not read).
  const recorded = homeJurisdictionResidenceSince(world, personId, town, today);
  const arrived =
    recorded === null || recorded <= world.startedAt ? adultOn : recorded;
  const since = adultOn > arrived ? adultOn : arrived;
  const years = (from: IsoDate) =>
    Math.max(0, daysBetween(from, today) / 365.25);
  const settled =
    STAKE.adultYears.weight *
      Math.min(1, years(adultOn) / STAKE.adultYears.full) +
    STAKE.townYears.weight *
      Math.min(1, years(arrived) / STAKE.townYears.full) +
    (activeWorkRelationshipsAt(world, personId).length > 0 ? STAKE.job : 0);
  const view = strongestViewOf(world, personId);
  const viewFactor =
    view && Math.abs(view.points) >= STRONG_VIEW_POINTS
      ? STRONG_VIEW_FACTOR
      : 1;
  const yearAgo = addDays(today, -365);
  const lawCost = (world.history.lawExposures ?? []).some(
    (row) =>
      row.personId === personId &&
      row.relation === "own" &&
      row.direction === "cost" &&
      row.recordedAt > yearAgo &&
      row.recordedAt <= today,
  )
    ? STAKE.lawCost
    : 0;
  const member = groupMembers.has(personId) ? STAKE.groupMember : 0;
  const costExposures = (world.history.lawExposures ?? []).filter(
    (row) =>
      row.personId === personId &&
      row.relation === "own" &&
      row.direction === "cost" &&
      row.recordedAt > yearAgo &&
      row.recordedAt <= today,
  );
  const outcomes = livedOutcomesOf(world, personId).filter(
    (outcome) =>
      outcome.at > yearAgo &&
      outcome.at <= today &&
      outcome.direction === "cost",
  );
  const oppositionMemberships = world.history.organizationParticipations.filter(
    (row) =>
      row.personId === personId &&
      groupMembers.has(personId) &&
      world.history.organizations.some(
        (group) =>
          group.id === row.organizationId &&
          group.stableKey.startsWith(`law-interest:${town}:`),
      ),
  );
  const reason =
    costExposures.length > 0
      ? {
          kind: "law-cost" as const,
          sourceRecordIds: costExposures.map((row) => row.id),
        }
      : outcomes.length > 0
        ? {
            kind: "lived-outcome" as const,
            sourceRecordIds: outcomes.map((row) => row.sourceRecordId),
          }
        : view
          ? {
              kind: "official-view" as const,
              sourceRecordIds: [
                ...(view.belief
                  ? [view.belief.id]
                  : view.rows.map((row) => row.id)),
              ],
            }
          : oppositionMemberships.length > 0
            ? {
                kind: "organized-opposition" as const,
                sourceRecordIds: oppositionMemberships.map((row) => row.id),
              }
            : { kind: "general-opinion" as const, sourceRecordIds: [] };
  const base = reactionLens(world, personId) * settled * viewFactor;
  return {
    since,
    reason,
    pull: {
      contacted: base + lawCost + member,
      attended: base + member,
    },
    view,
  };
}

/** Whether the pull gathered since `since` passed a full measure this quarter. */
function passesMeasure(
  stake: CivicStake,
  action: keyof typeof CIVIC_ACTION_EVENTS,
  today: IsoDate,
): boolean {
  const quarters = Math.floor(
    daysBetween(stake.since, today) / DAYS_PER_QUARTER,
  );
  if (quarters < 1) return false;
  const pull = stake.pull[action];
  return (
    Math.floor((quarters * pull) / MEASURE[action]) >
    Math.floor(((quarters - 1) * pull) / MEASURE[action])
  );
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
  // The town's own government, or its county's where the town has none.
  const home = homeLocalGovernmentUnits(world, residents[0]!);
  const units = home.municipal.length > 0 ? home.municipal : home.counties;
  const officers = units.flatMap((unit) => sittingLocalOfficers(world, unit));
  // With no view of anyone, a resident writes to the head their local
  // government records (its chief executive or its chair, the town's before
  // the county's), or, where none is recorded, to their state's or
  // territory's governor.
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  const headOfTown =
    localHeadOfGovernment(world, residents[0]!) ??
    (stateKey ? currentGovernorOf(world, stateKey.slice(3)) : null)?.personId ??
    null;
  const groupMembers = lawInterestMembersInTown(world, town);
  const wardRepresentative = (personId: EntityId): EntityId | null => {
    const position = homePosition(world, town, personId);
    if (position === null) return null;
    for (const unit of home.municipal) {
      const plan = councilWardPlan(unit);
      const map = townWardMap(world, unit);
      if (!plan || !map) continue;
      const ward = wardAt(map, position);
      const member = sittingLocalOfficers(world, unit).find((seat) => {
        const number = Number(/seat (\d+)$/.exec(seat.seatLabel)?.[1]);
        return (
          Number.isInteger(number) &&
          isWardSeat(plan, number) &&
          seatWard(map, number) === ward
        );
      });
      if (member) return member.personId;
    }
    return null;
  };
  const today = world.currentDate;
  // Resolve the calendar once for this quarterly town pass, not per resident.
  const meeting = latestQuarterMeeting(world, town);
  let next = world;
  for (const personId of residents) {
    const stake = civicStake(world, personId, town, groupMembers);
    if (passesMeasure(stake, "contacted", today)) {
      const officialId =
        stake.view?.officialId ?? wardRepresentative(personId) ?? headOfTown;
      if (officialId && officialId !== personId)
        next = record(
          next,
          town,
          reviewKey,
          "contacted",
          personId,
          officialId,
          null,
          stake.reason,
        );
    }
    if (officers.length > 0 && passesMeasure(stake, "attended", today))
      next = record(next, town, reviewKey, "attended", personId, null, meeting);
  }
  return next;
}

interface QuarterMeeting {
  readonly item: FutureDueItem;
  readonly occurredAt: IsoDate;
}

/** Saved held meetings, or a still-scheduled meeting taking place today. */
function latestQuarterMeeting(
  world: World,
  town: EntityId,
): QuarterMeeting | null {
  const today = world.currentDate;
  const quarterStart = addDays(today, -DAYS_PER_QUARTER);
  let latest: QuarterMeeting | null = null;
  for (const item of world.history.futureDueItems) {
    if (
      item.transitionKey !== LOCAL_COUNCIL_MEETING ||
      item.jurisdictionId !== town
    )
      continue;
    const held = recordByStableKey(
      world.history.events,
      `${item.stableKey}:held`,
    );
    const heldMeeting =
      held?.type === "local.council-meeting-held" &&
      held.jurisdictionId === town
        ? held
        : null;
    const occurredAt =
      heldMeeting?.occurredAt ?? (item.dueAt === today ? today : null);
    if (
      !occurredAt ||
      occurredAt <= quarterStart ||
      occurredAt > today ||
      (latest && occurredAt <= latest.occurredAt)
    )
      continue;
    const state = futureDueItemStateAt(world, item.id, {
      asOfDate: today,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (!state || state.status === "cancelled" || state.status === "blocked")
      continue;
    if (!heldMeeting && state.status !== "scheduled") continue;
    latest = { item, occurredAt };
  }
  return latest;
}

function record(
  world: World,
  town: EntityId,
  reviewKey: string,
  action: keyof typeof CIVIC_ACTION_EVENTS,
  personId: EntityId,
  officialId: EntityId | null,
  meeting: QuarterMeeting | null = null,
  reason: CivicStake["reason"] | null = null,
): World {
  const today = world.currentDate;
  if (action === "attended" && !meeting) return world;
  const ids = officialId ? [personId, officialId] : [personId];
  if (meeting) ids.push(meeting.item.id);
  return recordWorldEvent(world, {
    stableKey: `${CIVIC_ACTIONS_VERSION}:${town}:${reviewKey}:${action}:${personId}`,
    type: CIVIC_ACTION_EVENTS[action],
    occurredAt: meeting?.occurredAt ?? today,
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
    tags: [
      "life.civic",
      CIVIC_ACTIONS_VERSION,
      ...(meeting ? [`meeting:${meeting.item.id}`] : []),
      ...(action === "contacted" && reason
        ? [
            `reason:${reason.kind}`,
            ...reason.sourceRecordIds.map((id) => `source-record:${id}`),
          ]
        : []),
    ],
    summary:
      action === "contacted"
        ? reason?.kind === "general-opinion"
          ? "A resident made a general opinion call to an elected official."
          : reason?.kind === "law-cost"
            ? "A resident contacted an elected official about a law that cost them something."
            : reason?.kind === "lived-outcome"
              ? "A resident contacted an elected official about something that happened to them."
              : reason?.kind === "official-view"
                ? "A resident contacted an elected official whose actions they have a strong view of."
                : "A resident contacted an elected official about a law they organized against."
        : "A resident attended a public meeting of the town's government.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation:
        action === "contacted" && reason
          ? `${reason.kind}; source records: ${reason.sourceRecordIds.join(", ") || "none recorded"}.`
          : null,
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
