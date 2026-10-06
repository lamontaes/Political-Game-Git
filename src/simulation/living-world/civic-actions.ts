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
import { latestPrivateBelief } from "../queries";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  PrivateBeliefRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  localHeadOfGovernment,
  sittingLocalOfficers,
} from "./local-government-seats";
import { reactionLens } from "./official-views";

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
 * A contact becomes a recorded message when the resident has a settled view
 * on a policy proposition. Attendance names the existing scheduled council
 * meeting held in the reviewed quarter, dated on that meeting. A
 * scheduled meeting is eligible only on the current review date.
 */

export const CIVIC_ACTIONS_VERSION = "civic-actions-v2";

export const CIVIC_ACTION_EVENTS = {
  contacted: "life.contacted-official",
  attended: "life.attended-public-meeting",
} as const;

export type CivicMessageChannel = "letter" | "call" | "email";
export type CivicMessageStance = "yes" | "no";

const CIVIC_MESSAGE_TAG = "civic-message:v1";

export interface CivicMessageRecord {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly senderId: EntityId;
  readonly officialId: EntityId;
  readonly propositionId: EntityId;
  readonly stance: CivicMessageStance;
  readonly channel: CivicMessageChannel;
  readonly stakeBeliefId: EntityId | null;
  readonly salience: PrivateBeliefRecord["salience"];
}

export interface RecordCivicMessageInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly senderId: EntityId;
  readonly officialId: EntityId;
  readonly propositionId: EntityId;
  readonly stance: CivicMessageStance;
  readonly channel: CivicMessageChannel;
}

const MESSAGE_CHANNELS: readonly CivicMessageChannel[] = [
  "letter",
  "call",
  "email",
];

/** One explicit constituent message, using the ordinary saved civic event. */
export function recordCivicMessage(
  world: World,
  input: RecordCivicMessageInput,
): World {
  const sender = world.people[input.senderId];
  const official = world.people[input.officialId];
  const proposition = world.policyCatalog.propositions[input.propositionId];
  if (!sender || !official || input.senderId === input.officialId)
    throw new Error("A civic message needs a sender and a different official.");
  if (sender.homeJurisdictionId !== input.jurisdictionId)
    throw new Error("A civic message sender must live in its jurisdiction.");
  if (!proposition)
    throw new Error("A civic message must name a saved policy proposition.");
  if (!MESSAGE_CHANNELS.includes(input.channel))
    throw new Error("A civic message needs a supported contact channel.");
  if (input.stance !== "yes" && input.stance !== "no")
    throw new Error("A civic message must record a position on its topic.");

  const latestBelief = latestPrivateBelief(
    world,
    input.senderId,
    input.propositionId,
  );
  const belief =
    latestBelief?.position === "support" && input.stance === "yes"
      ? latestBelief
      : latestBelief?.position === "oppose" && input.stance === "no"
        ? latestBelief
        : null;
  const salience = belief?.salience ?? "low";
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: CIVIC_ACTION_EVENTS.contacted,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.senderId, input.officialId],
    participants: [
      { personId: input.senderId, role: "focus:subject", detail: null },
      { personId: input.officialId, role: "focus:object", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "life.civic",
      CIVIC_ACTIONS_VERSION,
      CIVIC_MESSAGE_TAG,
      `message-channel:${input.channel}`,
      `message-proposition-id:${input.propositionId}`,
      `message-proposition:${proposition.stableKey}`,
      `message-stance:${input.stance}`,
      belief
        ? `message-stake:belief:${belief.id}`
        : "message-stake:declared-position",
      `message-salience:${salience}`,
    ],
    summary: "A resident sent an elected official a civic message.",
    context: {
      location: null,
      socialContext: "A message from a resident to an elected official.",
      pressure: null,
      choice: `${input.channel}; ${input.stance} on ${proposition.name}`,
      motivation: belief
        ? `The sender's recorded view of ${proposition.name}.`
        : `The sender's stated position on ${proposition.name}.`,
      immediateReaction: null,
    },
  });
}

/** Read saved civic messages for one issue in one jurisdiction. */
export function civicMessagesForProposition(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
): readonly CivicMessageRecord[] {
  return (
    civicMessagesForPropositions(world, jurisdictionId, [propositionId]).get(
      propositionId,
    ) ?? []
  );
}

/** Read matching topics in one pass for callers weighing a multi-part bill. */
export function civicMessagesForPropositions(
  world: World,
  jurisdictionId: EntityId,
  propositionIds: readonly EntityId[],
): ReadonlyMap<EntityId, readonly CivicMessageRecord[]> {
  const wanted = new Set(
    propositionIds.filter((id) => !!world.policyCatalog.propositions[id]),
  );
  const result = new Map<EntityId, CivicMessageRecord[]>();
  if (wanted.size === 0) return result;
  for (const event of world.history.events) {
    if (
      event.type !== CIVIC_ACTION_EVENTS.contacted ||
      event.jurisdictionId !== jurisdictionId ||
      event.occurredAt > world.currentDate ||
      !event.tags.includes(CIVIC_MESSAGE_TAG)
    )
      continue;
    const propositionTag = event.tags.find((tag) =>
      tag.startsWith("message-proposition-id:"),
    );
    const propositionId = propositionTag?.slice(
      "message-proposition-id:".length,
    ) as EntityId | undefined;
    if (!propositionId || !wanted.has(propositionId)) continue;
    const senderId = event.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    const officialId = event.participants.find(
      (participant) => participant.role === "focus:object",
    )?.personId;
    const stanceTag = event.tags.find((tag) =>
      tag.startsWith("message-stance:"),
    );
    const channelTag = event.tags.find((tag) =>
      tag.startsWith("message-channel:"),
    );
    const salienceTag = event.tags.find((tag) =>
      tag.startsWith("message-salience:"),
    );
    const stakeTag = event.tags.find((tag) =>
      tag.startsWith("message-stake:belief:"),
    );
    const stance = stanceTag?.slice("message-stance:".length);
    const channel = channelTag?.slice("message-channel:".length);
    const salience = salienceTag?.slice("message-salience:".length);
    if (
      !senderId ||
      !officialId ||
      (stance !== "yes" && stance !== "no") ||
      !MESSAGE_CHANNELS.includes(channel as CivicMessageChannel) ||
      !["low", "moderate", "high", "central"].includes(salience ?? "")
    )
      continue;
    const list = result.get(propositionId) ?? [];
    list.push({
      eventId: event.id,
      sequence: event.sequence,
      occurredAt: event.occurredAt,
      jurisdictionId,
      senderId,
      officialId,
      propositionId,
      stance,
      channel: channel as CivicMessageChannel,
      stakeBeliefId: (stakeTag?.slice("message-stake:belief:".length) ??
        null) as EntityId | null,
      salience: salience as PrivateBeliefRecord["salience"],
    });
    result.set(propositionId, list);
  }
  return result;
}

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

const MESSAGE_SALIENCE_WEIGHT: Readonly<
  Record<PrivateBeliefRecord["salience"], number>
> = { low: 1, moderate: 2, high: 3, central: 4 };

const civicIssueBeliefIndexes = new WeakMap<
  World["history"]["privateBeliefs"],
  ReadonlyMap<EntityId, PrivateBeliefRecord>
>();

/** One current, settled issue belief per resident, indexed once per history. */
function strongestCivicIssueBeliefs(
  world: World,
): ReadonlyMap<EntityId, PrivateBeliefRecord> {
  const records = world.history.privateBeliefs;
  const cached = civicIssueBeliefIndexes.get(records);
  if (cached) return cached;

  const byPerson = new Map<EntityId, Map<EntityId, PrivateBeliefRecord>>();
  for (const belief of records) {
    if (belief.propositionId === null) continue;
    const issues = byPerson.get(belief.personId) ?? new Map();
    const prior = issues.get(belief.propositionId);
    if (
      !prior ||
      belief.formedAt > prior.formedAt ||
      (belief.formedAt === prior.formedAt && belief.sequence > prior.sequence)
    )
      issues.set(belief.propositionId, belief);
    byPerson.set(belief.personId, issues);
  }

  const strongest = new Map<EntityId, PrivateBeliefRecord>();
  for (const [personId, issues] of byPerson) {
    const beliefs = [...issues.values()].filter(
      (belief) => belief.position === "support" || belief.position === "oppose",
    );
    beliefs.sort(
      (left, right) =>
        MESSAGE_SALIENCE_WEIGHT[right.salience] -
          MESSAGE_SALIENCE_WEIGHT[left.salience] ||
        right.formedAt.localeCompare(left.formedAt) ||
        right.sequence - left.sequence ||
        left.propositionId!.localeCompare(right.propositionId!),
    );
    const picked = beliefs[0];
    if (picked) strongest.set(personId, picked);
  }
  civicIssueBeliefIndexes.set(records, strongest);
  return strongest;
}

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
  const issueBeliefs = strongestCivicIssueBeliefs(world);
  const today = world.currentDate;
  // Resolve the calendar once for this quarterly town pass, not per resident.
  const meeting = latestQuarterMeeting(world, town);
  let next = world;
  for (const personId of residents) {
    const stake = civicStake(world, personId, town, groupMembers);
    if (passesMeasure(stake, "contacted", today)) {
      const officialId = stake.view?.officialId ?? headOfTown;
      const belief = issueBeliefs.get(personId);
      if (
        officialId &&
        officialId !== personId &&
        belief?.propositionId &&
        (belief.position === "support" || belief.position === "oppose")
      ) {
        next = recordCivicMessage(next, {
          stableKey: `${CIVIC_ACTIONS_VERSION}:${town}:${reviewKey}:contacted:${personId}`,
          jurisdictionId: town,
          senderId: personId,
          officialId,
          propositionId: belief.propositionId,
          stance: belief.position === "support" ? "yes" : "no",
          // Background contact defaults to mail; player-authored messages may
          // select any of the three channels through this same writer.
          channel: "letter",
        });
      } else {
        // Preserve the existing contact count when no saved issue view can
        // support a truthful topic and position. This event is not read as
        // a substantive constituent message.
        next = record(
          next,
          town,
          reviewKey,
          "contacted",
          personId,
          officialId,
          null,
        );
      }
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
