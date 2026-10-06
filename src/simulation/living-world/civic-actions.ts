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
  lawInterestMeasure,
  lawInterestMembersInTown,
  strongestOfficialStanding,
} from "../official-view-reads";
import { livedOutcomesOf } from "./lived-outcomes";
import type { EntityId, FutureDueItem, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  localHeadOfGovernment,
  sittingLocalOfficers,
} from "./local-government-seats";
import { reactionLens } from "./official-views";
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
 * A contact carries only reasons already present in the resident's records;
 * when none exists it is explicitly a general opinion call. Attendance names
 * the existing scheduled council meeting held in the reviewed quarter, dated on that meeting. A
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
): { readonly officialId: EntityId; readonly points: number } | null {
  const view = strongestOfficialStanding(world, personId);
  return view ? { officialId: view.officialId, points: view.points } : null;
}

interface CivicStake {
  /** The day the pull started adding up: adulthood or arrival in town. */
  readonly since: IsoDate;
  readonly pull: { readonly contacted: number; readonly attended: number };
  readonly view: {
    readonly officialId: EntityId;
    readonly points: number;
  } | null;
}

export type CivicContactReasonKind =
  | "law-exposure"
  | "lived-outcome"
  | "official-view"
  | "law-interest-group"
  | "general-opinion";

export interface CivicContactReason {
  readonly kind: CivicContactReasonKind;
  /** The canonical record behind the reason; null only for general opinion. */
  readonly sourceRecordId: EntityId | null;
  /** The law or official the source concerns, when the record names one. */
  readonly subjectId: EntityId | null;
}

/**
 * Recorded reasons this resident can actually raise today. The ordered list
 * is stable so replaying a quarter records the same source chain.
 */
export function civicContactReasons(
  world: World,
  personId: EntityId,
  town: EntityId,
): readonly CivicContactReason[] {
  const yearAgo = addDays(world.currentDate, -365);
  const reasons: CivicContactReason[] = [];
  for (const exposure of world.history.lawExposures ?? [])
    if (
      exposure.personId === personId &&
      exposure.relation === "own" &&
      exposure.direction === "cost" &&
      exposure.recordedAt > yearAgo &&
      exposure.recordedAt <= world.currentDate
    )
      reasons.push({
        kind: "law-exposure",
        sourceRecordId: exposure.id,
        subjectId: exposure.measureId,
      });
  for (const outcome of livedOutcomesOf(world, personId).filter(
    (row) => row.at > yearAgo,
  ))
    reasons.push({
      kind: "lived-outcome",
      sourceRecordId: outcome.sourceRecordId,
      subjectId: null,
    });
  const view = strongestOfficialStanding(world, personId);
  if (view) {
    const source = view.belief?.id ?? view.rows.at(-1)?.id ?? null;
    if (source)
      reasons.push({
        kind: "official-view",
        sourceRecordId: source,
        subjectId: view.officialId,
      });
  }
  const groups = new Set(lawInterestMembersInTown(world, town));
  if (groups.has(personId))
    for (const participation of world.history.organizationParticipations) {
      if (participation.personId !== personId) continue;
      const measureId = lawInterestMeasure(world, participation.organizationId);
      if (measureId)
        reasons.push({
          kind: "law-interest-group",
          sourceRecordId: participation.id,
          subjectId: measureId,
        });
    }
  return reasons.length > 0
    ? reasons
    : [{ kind: "general-opinion", sourceRecordId: null, subjectId: null }];
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
  const base = reactionLens(world, personId) * settled * viewFactor;
  return {
    since,
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
  const today = world.currentDate;
  // Resolve the calendar once for this quarterly town pass, not per resident.
  const meeting = latestQuarterMeeting(world, town);
  let next = world;
  for (const personId of residents) {
    const stake = civicStake(world, personId, town, groupMembers);
    if (passesMeasure(stake, "contacted", today)) {
      const officialId =
        stake.view?.officialId ??
        wardRepresentative(world, units, personId) ??
        headOfTown;
      if (officialId && officialId !== personId)
        next = record(
          next,
          town,
          reviewKey,
          "contacted",
          personId,
          officialId,
          null,
          civicContactReasons(world, personId, town),
        );
    }
    if (officers.length > 0 && passesMeasure(stake, "attended", today))
      next = record(next, town, reviewKey, "attended", personId, null, meeting);
  }
  return next;
}

/** The member elected by this resident's ward, where the seat records one. */
function wardRepresentative(
  world: World,
  units: ReturnType<typeof homeLocalGovernmentUnits>["municipal"],
  personId: EntityId,
): EntityId | null {
  for (const unit of units) {
    const plan = councilWardPlan(unit);
    const map = townWardMap(world, unit);
    const town = world.people[personId]?.homeJurisdictionId;
    const position = town ? homePosition(world, town, personId) : null;
    if (!map || position === null) continue;
    const residentWard = wardAt(map, position);
    for (const officer of sittingLocalOfficers(world, unit)) {
      const seat = /seat (\d+)$/.exec(officer.seatLabel)?.[1];
      if (
        !officer.mayor &&
        seat &&
        isWardSeat(plan, Number(seat)) &&
        seatWard(map, Number(seat)) === residentWard
      )
        return officer.personId;
    }
  }
  return null;
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
  reasons: readonly CivicContactReason[] = [],
): World {
  const today = world.currentDate;
  if (action === "attended" && !meeting) return world;
  const ids = officialId ? [personId, officialId] : [personId];
  if (meeting) ids.push(meeting.item.id);
  for (const reason of reasons) {
    if (reason.sourceRecordId) ids.push(reason.sourceRecordId);
    if (reason.subjectId) ids.push(reason.subjectId);
  }
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
      ...reasons.flatMap((reason) => [
        `contact-reason:${reason.kind}`,
        ...(reason.sourceRecordId
          ? [`contact-source:${reason.sourceRecordId}`]
          : []),
        ...(reason.subjectId ? [`contact-subject:${reason.subjectId}`] : []),
      ]),
    ],
    summary:
      action === "contacted"
        ? "A resident contacted an elected official."
        : "A resident attended a public meeting of the town's government.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation:
        action === "contacted"
          ? reasons.map((reason) => reason.kind).join(", ")
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
