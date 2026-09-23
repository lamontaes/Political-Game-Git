import { jailTermOn } from "./justice/jail-terms";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { rememberedAdverseFindingsAgainst } from "./press/findings";
import {
  CAMPAIGN_WEEKLY_EVALUATION_KEY,
  type CampaignOpponentRecord,
  type CampaignOpponentStepKind,
  type CampaignOpponentStepRecord,
  type CampaignPlanEmphasis,
  type CampaignSupportDecision,
} from "./campaign-life-types";
import {
  campaignLifeOutcomeRecords,
  campaignOpponentRecords,
  campaignOpponentStepRecords,
  campaigns as campaignRecords,
  campaignState,
  requireCampaign,
} from "./campaign-queries";
import { planCampaignOperatingWeek } from "./campaign-operating-costs";
import { recordSupportShift } from "./campaign-support";
import { addDays, makeIsoDate } from "./dates";
import { evaluateDecision } from "./decisions";
import {
  electionContestById,
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import { createOrganization, createOrganizationParticipation } from "./life";
import { publicPartyAffiliation } from "./living-world/congress";
import { homePartyChapters } from "./living-world/party-chapters";
import type { HomePartyChapter } from "./living-world/party-chapters";
import { drawCanonicalNamedIdentity, personName } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "./resources";
import { SeededRng } from "./rng";
import type {
  CampaignRecord,
  DecisionConsideration,
  DecisionConstraint,
  ElectionContestRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

/**
 * CRUNCH46 CAMPAIGN — opponents who campaign.
 *
 * Until now the people a player ran against were names on a ballot: support
 * only moved when the player worked, and it only ever moved away from them. An
 * opponent here is a person with a committee, an account, a field lead and a
 * private sense of what matters to them, and once a week, on the world's own
 * clock, they choose one thing to do about the race.
 *
 * What this deliberately is not:
 *
 * - a per-minute actor. The only hook is one weekly due item per campaign, so
 *   an idle week costs the same whether the player watches or not;
 * - a second support engine. Gains go through `recordSupportShift`, the same
 *   zero-sum writer the player's own work uses, against the player's own
 *   campaign scopes, so a rival's canvass and the player's canvass are the same
 *   kind of fact;
 * - a second money system. Contributions and spending are ordinary resource
 *   flows with the basis and restriction kinds the player's committee uses;
 * - omniscient. The player's campaign learns what the rival did only when the
 *   rival did it in public, and what it learns is recorded as knowledge.
 *
 * Only contests that carry a player campaign are materialized. A contest the
 * World holds without one (a background governor turnover, for example) does
 * not grow opponent campaigns here; that remains a later increment.
 */

/** Below this, a paid message is not something the committee can buy. */
const MESSAGING_MINIMUM_MINOR_UNITS = 20_000;
/** Authored game defaults; not empirical campaign finance. */
const FUNDRAISING_RANGE = [60_000, 250_001] as const;
const MESSAGING_RANGE = [20_000, 120_001] as const;
const SWING_RANGE = [60, 141] as const;
/**
 * A field event: ninety minutes with the two people actually present, the
 * candidate and their field lead. The effect uses the same formula as a
 * player's outreach afternoon (`campaigns.ts` requestedGainBasisPoints:
 * minutes x workers x 3/2, then the seeded swing), so a rival's evening on the
 * doors is worth what the player's is, not a multiple of it.
 */
const FIELD_EVENT_MINUTES = 90;
const FIELD_EVENT_WORKERS = 2;
const EVALUATION_INTERVAL_DAYS = 7;
const LATE_CAMPAIGN_DAYS = 21;
const PUBLIC_MEMORY_DAYS = 14;

const EMPHASES: readonly CampaignPlanEmphasis[] = [
  "field",
  "communications",
  "relationships",
];

const WRITER_NOTE = "crunch46-campaign-opponents-v1";

export const CAMPAIGN_OPPONENT_EVENTS = {
  fundraising: "campaign.opponent-fundraising-reported",
  messaging: "campaign.opponent-message-released",
  "field-event": "campaign.opponent-field-event",
  "support-request": "campaign.opponent-support-decided",
} as const satisfies Record<CampaignOpponentStepKind, string>;

export const CAMPAIGN_CONTACT_MET_KIND = "contact:met-at-party-event";
export const CAMPAIGN_CONTACT_RECURRING_KIND =
  "contact:recurring-campaign-contact";

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function evaluationPrefix(campaign: CampaignRecord): string {
  return `${campaign.stableKey}:weekly-evaluation:`;
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function isDeceased(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId,
  );
}

function latestDueStatus(world: World, dueItemId: EntityId): string | null {
  return (
    world.history.futureDueItemStates
      .filter((state) => state.dueItemId === dueItemId)
      .at(-1)?.status ?? null
  );
}

/** The next weekly evaluation date, or null when the race is too close. */
function nextEvaluationDate(
  from: IsoDate,
  electionDate: IsoDate,
  current: IsoDate,
): IsoDate | null {
  const weekLater = addDays(from, EVALUATION_INTERVAL_DAYS);
  const eve = addDays(electionDate, -1);
  const dueAt = weekLater < eve ? weekLater : eve;
  return dueAt > current ? dueAt : null;
}

function evaluationEntityIds(campaign: CampaignRecord): EntityId[] {
  // Campaign ids are not canonical due-item entities; the candidate and the
  // contest together name exactly one campaign.
  return [campaign.candidatePersonId, campaign.contestId].sort();
}

function scheduleEvaluation(
  world: World,
  campaign: CampaignRecord,
  dueAt: IsoDate,
  ordinal: number,
  sourceEntityIds: readonly EntityId[],
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${evaluationPrefix(campaign)}${ordinal}`,
    dueAt,
    transitionKey: CAMPAIGN_WEEKLY_EVALUATION_KEY,
    entityIds: evaluationEntityIds(campaign),
    jurisdictionId: campaign.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [...new Set(sourceEntityIds)].sort(),
    },
  });
}

function nextEvaluationOrdinal(world: World, campaign: CampaignRecord): number {
  const prefix = evaluationPrefix(campaign);
  let highest = 0;
  for (const item of world.history.futureDueItems) {
    if (!item.stableKey.startsWith(prefix)) continue;
    const ordinal = Number(item.stableKey.slice(prefix.length));
    if (Number.isSafeInteger(ordinal) && ordinal > highest) highest = ordinal;
  }
  return highest + 1;
}

/* -------------------------------------------------------------------------- */
/* Scheduling                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Makes sure an active campaign's race has its weekly evaluation on the
 * calendar. Filing calls it; an older save with an active campaign and no
 * evaluation gets one the first time anything calls it. Returns the same world
 * when there is nothing to do.
 */
export function ensureCampaignWeeklyEvaluation(
  world: World,
  campaignId: EntityId,
): World {
  const campaign = requireCampaign(world, campaignId);
  if (campaignState(world, campaign.id).status !== "active") return world;
  if (electionContestStatus(world, campaign.contestId) !== "pending")
    return world;
  const prefix = evaluationPrefix(campaign);
  const pending = world.history.futureDueItems.some(
    (item) =>
      item.transitionKey === CAMPAIGN_WEEKLY_EVALUATION_KEY &&
      item.stableKey.startsWith(prefix) &&
      latestDueStatus(world, item.id) === "scheduled",
  );
  if (pending) return world;
  const contest = requireElectionContest(world, campaign.contestId);
  const dueAt = nextEvaluationDate(
    world.currentDate,
    contest.electionDate,
    world.currentDate,
  );
  if (!dueAt) return world;
  const next = scheduleEvaluation(
    world,
    campaign,
    dueAt,
    nextEvaluationOrdinal(world, campaign),
    [campaign.filingEventId],
  );
  assertWorldIntegrity(next);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Opponent campaigns                                                          */
/* -------------------------------------------------------------------------- */

function opponentStableKey(
  contest: ElectionContestRecord,
  candidatePersonId: EntityId,
): string {
  return `${contest.stableKey}:opponent:${candidatePersonId}`;
}

export function campaignOpponentFor(
  world: World,
  contestId: EntityId,
  candidatePersonId: EntityId,
): CampaignOpponentRecord | null {
  return (
    campaignOpponentRecords(world).find(
      (record) =>
        record.contestId === contestId &&
        record.candidatePersonId === candidatePersonId,
    ) ?? null
  );
}

function lastOrganizationId(world: World): EntityId {
  return world.history.organizations.at(-1)!.id;
}

/**
 * The rival's own campaign, written the first time they act: a committee, the
 * two aggregate counterparties the player's committee also has, an empty
 * account and a persistent field lead. The emphasis is drawn once from the
 * record's identity and is never shown to the player.
 */
function ensureOpponent(
  world: World,
  campaign: CampaignRecord,
  contest: ElectionContestRecord,
  candidatePersonId: EntityId,
): { readonly world: World; readonly opponent: CampaignOpponentRecord } {
  const existing = campaignOpponentFor(world, contest.id, candidatePersonId);
  if (existing) return { world, opponent: existing };
  const stableKey = opponentStableKey(contest, candidatePersonId);
  const id = createStableId("campaign-opponent", `${world.id}:${stableKey}`);
  const candidate = world.people[candidatePersonId]!;
  const name = personName(candidate);
  const date = world.currentDate;

  let next = createOrganization(world, {
    stableKey: `${stableKey}:committee`,
    formedAt: date,
    detailLevel: "detailed",
    provenance: {
      kind: "authored",
      note: "An opponent's campaign committee, written the first week they campaigned.",
    },
    initialProfile: {
      name: `${name} for ${contest.office.title}`,
      classification: "custom:political-campaign",
      locationJurisdictionId: contest.jurisdictionId,
    },
  });
  const committeeOrganizationId = lastOrganizationId(next);
  next = createOrganization(next, {
    stableKey: `${stableKey}:supporters`,
    formedAt: date,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate pool of the opponent's supporters. No donor corpus is modeled.",
    },
    initialProfile: {
      name: `Supporters of ${name}`,
      classification: "community:campaign-supporters",
      locationJurisdictionId: contest.jurisdictionId,
    },
  });
  const donorPoolOrganizationId = lastOrganizationId(next);
  next = createOrganization(next, {
    stableKey: `${stableKey}:advertising`,
    formedAt: date,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate advertising counterparty for the opponent. No media market is modeled.",
    },
    initialProfile: {
      name: `Advertising for ${name}`,
      classification: "enterprise:media-buying",
      locationJurisdictionId: contest.jurisdictionId,
    },
  });
  const vendorOrganizationId = lastOrganizationId(next);
  next = createResourcePosition(next, {
    stableKey: `${stableKey}:treasury`,
    owner: { kind: "organization", organizationId: committeeOrganizationId },
    openedAt: date,
    openingBalance: { minorUnits: 0, currency: campaign.treasuryCurrency },
    provenance: {
      kind: "authored",
      note: "The opponent committee's own account, opened empty.",
    },
  });
  const treasuryPositionId = next.history.resourcePositions.at(-1)!.id;

  const leadKey = `${stableKey}:field-lead`;
  const leadRng = new SeededRng(world.seed).fork(
    `campaign-opponent-field-lead:${leadKey}`,
  );
  const lead = drawCanonicalNamedIdentity(
    leadRng.fork("name"),
    generatePersonIdentity(leadRng.fork("identity")),
  );
  next = createCharacterHistoryContextPerson(next, {
    stableKey: leadKey,
    givenName: lead.givenName,
    familyName: lead.familyName,
    identity: lead.identity,
    birthDate: makeIsoDate(
      `${Number(date.slice(0, 4)) - leadRng.integer(24, 61)}-${String(leadRng.integer(1, 13)).padStart(2, "0")}-${String(leadRng.integer(1, 29)).padStart(2, "0")}`,
    ),
    homeJurisdictionId: contest.jurisdictionId,
  });
  const fieldLeadPersonId = characterHistoryContextPersonId(next, leadKey);
  next = createOrganizationParticipation(next, {
    stableKey: `${leadKey}:role`,
    personId: fieldLeadPersonId,
    organizationId: committeeOrganizationId,
    startedAt: date,
    kind: "leadership:campaign-field",
    roleKind: "leader:field-organizer",
    context: `Runs field work for ${name}'s campaign.`,
    provenance: { kind: "authored", note: WRITER_NOTE },
  });

  const emphasis = new SeededRng(world.seed)
    .fork(`campaign-opponent-emphasis:${id}`)
    .pick(EMPHASES);
  const opponent: CampaignOpponentRecord = {
    id,
    stableKey,
    sequence: next.history.nextSequence,
    contestId: contest.id,
    candidatePersonId,
    rivalCampaignId: campaign.id,
    committeeOrganizationId,
    donorPoolOrganizationId,
    vendorOrganizationId,
    treasuryPositionId,
    fieldLeadPersonId,
    emphasis,
    createdAt: date,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignOpponents: [...campaignOpponentRecords(next), opponent],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, opponent };
}

function opponentTreasury(
  world: World,
  opponent: CampaignOpponentRecord,
  currency: MoneyAmount["currency"],
): number {
  return (
    resourcePositionAt(
      world,
      {
        kind: "organization",
        organizationId: opponent.committeeOrganizationId,
      },
      currency,
    )?.liquidBalance.minorUnits ?? 0
  );
}

/** The home chapter of the rival's own public party with a living organizer. */
function reachableChapter(
  world: World,
  opponent: CampaignOpponentRecord,
): HomePartyChapter | null {
  // TODO(CRUNCH46 WORLD): switch to WORLD's `affiliationAt(world, personId,
  // date?)` once it lands on this branch; `publicPartyAffiliation` is the
  // accessor this checkout has today and reads the same public record.
  const partyId = publicPartyAffiliation(world, opponent.candidatePersonId);
  if (!partyId) return null;
  return (
    homePartyChapters(world).find(
      (chapter) =>
        chapter.partyOrganizationId === partyId &&
        chapter.organizerPersonId !== null &&
        chapter.organizerPersonId !== opponent.candidatePersonId &&
        !isDeceased(world, chapter.organizerPersonId),
    ) ?? null
  );
}

/** Public, campaign-tagged events about the player's candidate, recently. */
function recentPublicPlayerCampaignEvents(
  world: World,
  campaign: CampaignRecord,
): number {
  const since = addDays(world.currentDate, -PUBLIC_MEMORY_DAYS);
  return world.history.events.filter(
    (event) =>
      event.visibility === "public" &&
      event.occurredAt >= since &&
      event.involvedEntityIds.includes(campaign.candidatePersonId) &&
      event.tags.some((tag) => tag.startsWith("campaign")),
  ).length;
}

function chooseStep(
  world: World,
  campaign: CampaignRecord,
  contest: ElectionContestRecord,
  opponent: CampaignOpponentRecord,
  stepKey: string,
): CampaignOpponentStepKind {
  const treasury = opponentTreasury(world, opponent, campaign.treasuryCurrency);
  const daysLeft = daysBetween(world.currentDate, contest.electionDate);
  const alreadyAsked = campaignOpponentStepRecords(world).some(
    (step) =>
      step.opponentId === opponent.id && step.kind === "support-request",
  );
  const constraints: DecisionConstraint[] = [];
  const considerations: DecisionConsideration[] = [];
  const consider = (
    key: string,
    optionKey: CampaignOpponentStepKind,
    importance: DecisionConsideration["importance"],
    explanation: string,
  ) =>
    considerations.push({
      stableKey: `${stepKey}:consider:${key}`,
      optionKey,
      sourceType: `context:campaign-${key}`,
      direction: "supports",
      importance,
      confidence: "high",
      explanation,
      sourceRefs: [],
    });

  if (treasury < MESSAGING_MINIMUM_MINOR_UNITS) {
    constraints.push({
      stableKey: `${stepKey}:constraint:messaging-funds`,
      optionKey: "messaging",
      kind: "resource:insufficient-funds",
      explanation: "The committee cannot pay for a message yet.",
      sourceRefs: [],
    });
  } else {
    consider(
      "funded",
      "messaging",
      "slight",
      "The committee has money for a message.",
    );
  }
  if (treasury === 0) {
    consider(
      "empty-treasury",
      "fundraising",
      "strong",
      "The committee's account is empty.",
    );
  } else if (treasury < MESSAGING_MINIMUM_MINOR_UNITS * 3) {
    consider(
      "thin-treasury",
      "fundraising",
      "slight",
      "The committee's account is thin.",
    );
  }
  if (alreadyAsked) {
    constraints.push({
      stableKey: `${stepKey}:constraint:already-asked`,
      optionKey: "support-request",
      kind: "history:already-requested",
      explanation: "They have already asked their party chapter this race.",
      sourceRefs: [],
    });
  } else if (!reachableChapter(world, opponent)) {
    // A candidate knows whether they have a party chapter to ask. Without
    // this, a rival who values relationships would pick the request every
    // week and fall back to fundraising every week.
    constraints.push({
      stableKey: `${stepKey}:constraint:no-chapter`,
      optionKey: "support-request",
      kind: "affiliation:no-reachable-chapter",
      explanation: "They have no local party chapter to ask.",
      sourceRefs: [],
    });
  }
  if (daysLeft < LATE_CAMPAIGN_DAYS) {
    consider(
      "late-field",
      "field-event",
      "slight",
      "Election day is close; people need to be met now.",
    );
    consider(
      "late-message",
      "messaging",
      "slight",
      "Election day is close; the message has to be out now.",
    );
  }
  switch (opponent.emphasis) {
    case "field":
      consider(
        "emphasis",
        "field-event",
        "moderate",
        "They believe in field work.",
      );
      break;
    case "communications":
      consider(
        "emphasis",
        "messaging",
        "moderate",
        "They believe in the message.",
      );
      break;
    case "relationships":
      consider(
        "emphasis",
        "support-request",
        "moderate",
        "They believe in the people around them.",
      );
      consider(
        "emphasis-donors",
        "fundraising",
        "slight",
        "They believe in the people around them.",
      );
      break;
  }
  if (recentPublicPlayerCampaignEvents(world, campaign) > 0) {
    consider(
      "public-rival",
      "messaging",
      "slight",
      "The other campaign has been visibly active; answering it in public matters.",
    );
  }

  const evaluation = evaluateDecision(world, {
    stableKey: `${stepKey}:decision`,
    decisionType: "campaign.opponent-weekly-step",
    actorPersonId: opponent.candidatePersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:campaign",
      key: "opponent-weekly-step",
      entityId: null,
    },
    options: [
      {
        key: "field-event",
        label: "Hold a field event",
        description: "Meet voters in person with the field lead.",
      },
      {
        key: "fundraising",
        label: "Raise money",
        description: "Ask supporters for contributions.",
      },
      {
        key: "messaging",
        label: "Release a message",
        description: "Pay for a message to voters.",
      },
      {
        key: "support-request",
        label: "Ask the party chapter",
        description: "Ask the local party chapter for help.",
      },
    ],
    constraints,
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return (
    (evaluation.selectedOptionKey as CampaignOpponentStepKind | null) ??
    "fundraising"
  );
}

/* -------------------------------------------------------------------------- */
/* Executing a step                                                            */
/* -------------------------------------------------------------------------- */

interface StepWrite {
  readonly world: World;
  readonly outcomeEventId: EntityId;
  readonly resourceFlowId: EntityId | null;
  readonly amount: MoneyAmount | null;
  readonly supportStateIds: readonly EntityId[];
  readonly supportDecision: CampaignOpponentStepRecord["supportDecision"];
  readonly note: string | null;
}

function location(world: World, campaign: CampaignRecord, setting: string) {
  return {
    jurisdictionId: campaign.jurisdictionId,
    label: world.jurisdictions[campaign.jurisdictionId]!.name,
    setting,
  };
}

function moveMoney(
  world: World,
  opponent: CampaignOpponentRecord,
  stepKey: string,
  kind: "fundraising" | "messaging",
  amount: MoneyAmount,
  eventId: EntityId,
  jurisdictionId: EntityId,
): { readonly world: World; readonly resourceFlowId: EntityId } {
  const raising = kind === "fundraising";
  let next = createResourceFlow(world, {
    stableKey: `${stepKey}:flow`,
    source: {
      kind: "organization",
      organizationId: raising
        ? opponent.donorPoolOrganizationId
        : opponent.committeeOrganizationId,
    },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: raising
        ? opponent.committeeOrganizationId
        : opponent.vendorOrganizationId,
    }),
    startsAt: world.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: raising
      ? "custom:campaign-contribution"
      : "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId,
    provenance: { kind: "simulated-event", eventId },
  });
  const resourceFlowId = next.history.resourceFlows.at(-1)!.id;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${stepKey}:transfer`,
    resourceFlowId,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: raising
      ? "Contributions an opponent's committee received this week."
      : "A paid message, paid out of the opponent committee's own account.",
    provenance: { kind: "simulated-event", eventId },
  });
  return { world: next, resourceFlowId };
}

function lastEventId(world: World): EntityId {
  return world.history.events.at(-1)!.id;
}

function writeFundraising(
  world: World,
  campaign: CampaignRecord,
  opponent: CampaignOpponentRecord,
  stepKey: string,
  note: string | null,
): StepWrite {
  const amount: MoneyAmount = {
    minorUnits: new SeededRng(world.seed)
      .fork(`campaign-opponent-fundraising:${stepKey}`)
      .integer(FUNDRAISING_RANGE[0], FUNDRAISING_RANGE[1]),
    currency: campaign.treasuryCurrency,
  };
  const name = personName(world.people[opponent.candidatePersonId]!);
  let next = recordWorldEvent(world, {
    stableKey: `${stepKey}:event`,
    type: CAMPAIGN_OPPONENT_EVENTS.fundraising,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      opponent.candidatePersonId,
      opponent.committeeOrganizationId,
    ],
    participants: [
      {
        personId: opponent.candidatePersonId,
        role: "agency:candidate",
        detail: "Asked supporters for contributions",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["campaign.opponent", "campaign.fundraising", WRITER_NOTE],
    summary: `${name}'s committee took in contributions from supporters.`,
    context: {
      location: location(world, campaign, "Fundraising calls"),
      socialContext: "Supporters asked one at a time.",
      pressure: null,
      choice: "Spend the week raising money.",
      motivation: note,
      immediateReaction: null,
    },
  });
  const outcomeEventId = lastEventId(next);
  const moved = moveMoney(
    next,
    opponent,
    stepKey,
    "fundraising",
    amount,
    outcomeEventId,
    campaign.jurisdictionId,
  );
  next = moved.world;
  return {
    world: next,
    outcomeEventId,
    resourceFlowId: moved.resourceFlowId,
    amount,
    supportStateIds: [],
    supportDecision: null,
    note,
  };
}

function writeMessaging(
  world: World,
  campaign: CampaignRecord,
  opponent: CampaignOpponentRecord,
  stepKey: string,
): StepWrite {
  const treasury = opponentTreasury(world, opponent, campaign.treasuryCurrency);
  const rng = new SeededRng(world.seed).fork(
    `campaign-opponent-messaging:${stepKey}`,
  );
  const drawn = rng
    .fork("spend")
    .integer(MESSAGING_RANGE[0], MESSAGING_RANGE[1]);
  const spend = Math.min(treasury, drawn);
  if (spend < MESSAGING_MINIMUM_MINOR_UNITS) {
    // The decision excludes this already; never overdraw regardless.
    return writeFundraising(
      world,
      campaign,
      opponent,
      stepKey,
      "The committee could not pay for a message, so it raised money instead.",
    );
  }
  const swing = rng.fork("swing").integer(SWING_RANGE[0], SWING_RANGE[1]);
  const amount: MoneyAmount = {
    minorUnits: spend,
    currency: campaign.treasuryCurrency,
  };
  const name = personName(world.people[opponent.candidatePersonId]!);
  let next = recordWorldEvent(world, {
    stableKey: `${stepKey}:event`,
    type: CAMPAIGN_OPPONENT_EVENTS.messaging,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      opponent.candidatePersonId,
      opponent.committeeOrganizationId,
      opponent.vendorOrganizationId,
      campaign.contestId,
    ],
    participants: [
      {
        personId: opponent.candidatePersonId,
        role: "agency:candidate",
        detail: "Put out a paid campaign message",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.opponent", "campaign.messaging", WRITER_NOTE],
    summary: `${name}'s campaign put out a paid message to voters for the ${requireElectionContest(world, campaign.contestId).office.title} race.`,
    context: {
      location: location(world, campaign, "Paid campaign message"),
      socialContext: "A message anyone in the race could see.",
      pressure: null,
      choice: "Spend on a message this week.",
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEventId = lastEventId(next);
  const moved = moveMoney(
    next,
    opponent,
    stepKey,
    "messaging",
    amount,
    outcomeEventId,
    campaign.jurisdictionId,
  );
  next = moved.world;
  const shifted = recordSupportShift(next, campaign, {
    stableKeyBase: stepKey,
    gainerPersonId: opponent.candidatePersonId,
    gainBasisPoints: Math.floor((spend * swing) / 50_000),
    sourceEntityIds: [outcomeEventId],
  });
  return {
    world: shifted.world,
    outcomeEventId,
    resourceFlowId: moved.resourceFlowId,
    amount,
    supportStateIds: shifted.stateIds,
    supportDecision: null,
    note: null,
  };
}

/**
 * Writes the "met at a campaign event" contact for a pair who were both
 * present, and the recurring-contact strengthening only when the same pair
 * already met at an earlier campaign event.
 */
function recordCampaignContact(
  world: World,
  eventId: EntityId,
  firstId: EntityId,
  secondId: EntityId,
  stepKey: string,
  summary: string,
): World {
  const pair = [firstId, secondId].sort() as [EntityId, EntityId];
  const samePair = (personIds: readonly EntityId[]) =>
    personIds.includes(pair[0]) && personIds.includes(pair[1]);
  const earlier = world.history.relationshipInteractions.filter((interaction) =>
    samePair(interaction.personIds),
  );
  const metBeforeAtCampaignEvent = earlier.some(
    (interaction) =>
      interaction.kind === CAMPAIGN_CONTACT_MET_KIND &&
      interaction.tags.includes("campaign.contact"),
  );
  let next = recordRelationshipInteraction(world, {
    stableKey: `${stepKey}:contact:${pair[0]}:${pair[1]}`,
    personIds: pair,
    eventId,
    occurredAt: world.currentDate,
    kind: CAMPAIGN_CONTACT_MET_KIND,
    change: earlier.length === 0 ? "formed" : "maintained",
    significance: "minor",
    summary,
    tags: ["campaign.contact"],
  });
  if (metBeforeAtCampaignEvent) {
    next = recordRelationshipInteraction(next, {
      stableKey: `${stepKey}:recurring:${pair[0]}:${pair[1]}`,
      personIds: pair,
      eventId,
      occurredAt: world.currentDate,
      kind: CAMPAIGN_CONTACT_RECURRING_KIND,
      change: "strengthened",
      significance: "minor",
      summary: "They have worked a campaign event together before.",
      tags: ["campaign.contact"],
    });
  }
  return next;
}

function writeFieldEvent(
  world: World,
  campaign: CampaignRecord,
  opponent: CampaignOpponentRecord,
  stepKey: string,
): StepWrite {
  const swing = new SeededRng(world.seed)
    .fork(`campaign-opponent-field-event:${stepKey}`)
    .integer(SWING_RANGE[0], SWING_RANGE[1]);
  const name = personName(world.people[opponent.candidatePersonId]!);
  const lead = world.people[opponent.fieldLeadPersonId]!;
  let next = recordWorldEvent(world, {
    stableKey: `${stepKey}:event`,
    type: CAMPAIGN_OPPONENT_EVENTS["field-event"],
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      opponent.candidatePersonId,
      opponent.fieldLeadPersonId,
      opponent.committeeOrganizationId,
      campaign.contestId,
    ],
    participants: [
      {
        personId: opponent.candidatePersonId,
        role: "presence:participant",
        detail: "Met voters at a public campaign event",
      },
      {
        personId: opponent.fieldLeadPersonId,
        role: "presence:participant",
        detail: "Ran the event",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.opponent", "campaign.field", WRITER_NOTE],
    summary: `${name} held a public campaign event with field lead ${personName(lead)}.`,
    context: {
      location: location(world, campaign, "Public campaign event"),
      socialContext: "An open event; anyone could come.",
      pressure: null,
      choice: "Spend the week meeting voters.",
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEventId = lastEventId(next);
  next = recordCampaignContact(
    next,
    outcomeEventId,
    opponent.candidatePersonId,
    opponent.fieldLeadPersonId,
    stepKey,
    "Worked a public campaign event together.",
  );
  const shifted = recordSupportShift(next, campaign, {
    stableKeyBase: stepKey,
    gainerPersonId: opponent.candidatePersonId,
    gainBasisPoints: Math.floor(
      (FIELD_EVENT_MINUTES * FIELD_EVENT_WORKERS * 3 * swing) / 200,
    ),
    sourceEntityIds: [outcomeEventId],
  });
  return {
    world: shifted.world,
    outcomeEventId,
    resourceFlowId: null,
    amount: null,
    supportStateIds: shifted.stateIds,
    supportDecision: null,
    note: null,
  };
}

function writeSupportRequest(
  world: World,
  campaign: CampaignRecord,
  opponent: CampaignOpponentRecord,
  stepKey: string,
): StepWrite {
  const chapter = reachableChapter(world, opponent);
  if (!chapter) {
    return writeFundraising(
      world,
      campaign,
      opponent,
      stepKey,
      "There was no party chapter to ask, so they raised money instead.",
    );
  }
  const organizerId = chapter.organizerPersonId!;
  const hasMet = world.history.relationshipInteractions.some(
    (interaction) =>
      interaction.personIds.includes(organizerId) &&
      interaction.personIds.includes(opponent.candidatePersonId),
  );
  const chapterBackedPlayer = campaignLifeOutcomeRecords(world).some(
    (outcome) =>
      outcome.supportDecision?.organizationId === chapter.organizationId &&
      outcome.supportDecision.decision === "granted",
  );
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${stepKey}:organizer:same-party`,
      optionKey: "grant",
      sourceType: "context:campaign-same-party",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        "The candidate is publicly affiliated with the chapter's party.",
      sourceRefs: [],
    },
    hasMet
      ? {
          stableKey: `${stepKey}:organizer:known`,
          optionKey: "grant",
          sourceType: "context:campaign-known-candidate",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: "They have dealt with this candidate before.",
          sourceRefs: [],
        }
      : {
          stableKey: `${stepKey}:organizer:unknown`,
          optionKey: "defer",
          sourceType: "context:campaign-unknown-candidate",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation: "They have not dealt with this candidate before.",
          sourceRefs: [],
        },
    {
      stableKey: `${stepKey}:organizer:caution`,
      optionKey: "decline",
      sourceType: "context:campaign-chapter-caution",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "A chapter lends its volunteers carefully.",
      sourceRefs: [],
    },
  ];
  for (const finding of rememberedAdverseFindingsAgainst(
    world,
    opponent.candidatePersonId,
  )) {
    considerations.push({
      stableKey: `${stepKey}:organizer:public-finding:${finding.step.id}`,
      optionKey: "decline",
      sourceType: "context:public-ethics-finding",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `The ${finding.proceeding.institutionLabel} has made a public finding against the candidate.`,
      sourceRefs: [{ kind: "historical-event", eventId: finding.step.eventId }],
    });
  }
  if (chapterBackedPlayer) {
    considerations.push({
      stableKey: `${stepKey}:organizer:already-backing`,
      optionKey: "decline",
      sourceType: "context:campaign-chapter-committed",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "The chapter has already agreed to help another candidate.",
      sourceRefs: [],
    });
  }
  const evaluation = evaluateDecision(world, {
    stableKey: `${stepKey}:organizer-decision`,
    decisionType: "campaign.chapter-support-request",
    actorPersonId: organizerId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:campaign",
      key: "chapter-support-request",
      entityId: null,
    },
    options: [
      {
        key: "grant",
        label: "Agree to help",
        description: "Lend the chapter's help to the campaign.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Say the chapter will not help.",
      },
      {
        key: "defer",
        label: "Not yet",
        description: "Put the request off for now.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  const decision: CampaignSupportDecision =
    evaluation.selectedOptionKey === "grant"
      ? "granted"
      : evaluation.selectedOptionKey === "decline"
        ? "declined"
        : "deferred";
  const name = personName(world.people[opponent.candidatePersonId]!);
  const organizerName = personName(world.people[organizerId]!);
  const summary =
    decision === "granted"
      ? `${organizerName} agreed that ${chapter.name} would help ${name}'s campaign.`
      : decision === "declined"
        ? `${organizerName} declined ${name}'s request for help from ${chapter.name}.`
        : `${organizerName} put off ${name}'s request for help from ${chapter.name}.`;
  let next = recordWorldEvent(world, {
    stableKey: `${stepKey}:event`,
    type: CAMPAIGN_OPPONENT_EVENTS["support-request"],
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      opponent.candidatePersonId,
      organizerId,
      chapter.organizationId,
      opponent.committeeOrganizationId,
    ],
    participants: [
      {
        personId: opponent.candidatePersonId,
        role: "presence:participant",
        detail: "Asked the chapter for help",
      },
      {
        personId: organizerId,
        role: "presence:participant",
        detail: `Answered for ${chapter.name}`,
      },
    ],
    personFactConstraints: [],
    visibility: decision === "granted" ? "public" : "limited",
    tags: [
      "campaign.opponent",
      "campaign.support-request",
      `decision:${decision}`,
      WRITER_NOTE,
    ],
    summary,
    context: {
      location: location(world, campaign, "Party chapter"),
      socialContext:
        "A request for chapter help; not an endorsement, a membership or a vote.",
      pressure: null,
      choice: "Ask the local chapter for help.",
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEventId = lastEventId(next);
  next = recordCampaignContact(
    next,
    outcomeEventId,
    opponent.candidatePersonId,
    organizerId,
    stepKey,
    "Met about a campaign's request for chapter help.",
  );
  return {
    world: next,
    outcomeEventId,
    resourceFlowId: null,
    amount: null,
    supportStateIds: [],
    supportDecision: {
      decidedByPersonId: organizerId,
      organizationId: chapter.organizationId,
      decision,
    },
    note: null,
  };
}

function stepKeyFor(opponent: CampaignOpponentRecord, weekStart: IsoDate) {
  return `${opponent.stableKey}:step:${weekStart}`;
}

function runOpponentStep(
  world: World,
  campaign: CampaignRecord,
  contest: ElectionContestRecord,
  opponent: CampaignOpponentRecord,
  weekStart: IsoDate,
): { readonly world: World; readonly step: CampaignOpponentStepRecord } {
  const stepKey = stepKeyFor(opponent, weekStart);
  const chosen = chooseStep(world, campaign, contest, opponent, stepKey);
  const written =
    chosen === "fundraising"
      ? writeFundraising(world, campaign, opponent, stepKey, null)
      : chosen === "messaging"
        ? writeMessaging(world, campaign, opponent, stepKey)
        : chosen === "field-event"
          ? writeFieldEvent(world, campaign, opponent, stepKey)
          : writeSupportRequest(world, campaign, opponent, stepKey);
  // A fallback changes what actually happened, and the record says so.
  const kind: CampaignOpponentStepKind =
    written.note !== null ? "fundraising" : chosen;
  let next = written.world;
  const event = next.history.events.find(
    (candidate) => candidate.id === written.outcomeEventId,
  )!;
  if (event.visibility === "public") {
    next = recordEventKnowledge(next, {
      stableKey: `${stepKey}:known-by:${campaign.candidatePersonId}`,
      personId: campaign.candidatePersonId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: event.type },
    });
  }
  const step: CampaignOpponentStepRecord = {
    id: createStableId("campaign-opponent-step", `${next.id}:${stepKey}`),
    stableKey: stepKey,
    sequence: next.history.nextSequence,
    opponentId: opponent.id,
    weekStart,
    kind,
    outcomeEventId: written.outcomeEventId,
    resourceFlowId: written.resourceFlowId,
    amount: written.amount ? { ...written.amount } : null,
    supportStateIds: [...written.supportStateIds],
    supportDecision: written.supportDecision
      ? { ...written.supportDecision }
      : null,
    createdAt: next.currentDate,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignOpponentSteps: [...campaignOpponentStepRecords(next), step],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, step };
}

/**
 * The weekly boundary. Each living rival in a contest the player is running in
 * takes one step of their own choosing; then the next boundary is scheduled
 * unless election eve has been reached.
 */
export function campaignWeeklyEvaluationHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CAMPAIGN_WEEKLY_EVALUATION_KEY)
    throw new Error("The weekly campaign handler received another transition.");
  const contest =
    dueItem.entityIds
      .map((id) => electionContestById(world, id))
      .find((record) => record !== undefined && record !== null) ?? null;
  // The due item's own stable key names the campaign it was scheduled for;
  // the contest alone would not if a contest ever carried two campaigns.
  const campaign = contest
    ? (campaignRecords(world).find(
        (record) =>
          record.contestId === contest.id &&
          dueItem.stableKey.startsWith(evaluationPrefix(record)) &&
          /^\d+$/.test(
            dueItem.stableKey.slice(evaluationPrefix(record).length),
          ),
      ) ?? null)
    : null;
  if (
    !contest ||
    !campaign ||
    !dueItem.entityIds.includes(campaign.candidatePersonId)
  ) {
    return {
      world,
      status: "blocked",
      reasonKey: "campaign:campaign-missing",
      context: "Diagnostic: the weekly evaluation names no campaign.",
      outcomeEventId: null,
    };
  }
  if (
    electionContestStatus(world, contest.id) !== "pending" ||
    campaignState(world, campaign.id).status !== "active"
  ) {
    return {
      world,
      status: "resolved",
      reasonKey: "campaign:race-over",
      context: null,
      outcomeEventId: null,
    };
  }

  const weekStart = dueItem.dueAt;
  let next = world;
  let outcomeEventId: EntityId | null = null;
  // Only candidates the player's campaign carries a support scope for can
  // gain support through `recordSupportShift`; anyone else is left alone.
  const scoped = new Set(
    campaign.candidateSupportScopes.map((scope) => scope.candidatePersonId),
  );
  const rivals = [...contest.candidatePersonIds]
    .filter((personId) => personId !== campaign.candidatePersonId)
    .filter((personId) => scoped.has(personId))
    .filter(
      (personId) => world.people[personId] && !isDeceased(world, personId),
    )
    // Nobody campaigns from jail (UNRESEARCHED_JAIL_EFFECTS); they stay on
    // the ballot and their support stands where it was.
    .filter((personId) => !jailTermOn(world, personId, weekStart))
    .sort();
  for (const rivalId of rivals) {
    const ensured = ensureOpponent(next, campaign, contest, rivalId);
    next = ensured.world;
    const stepKey = stepKeyFor(ensured.opponent, weekStart);
    if (
      campaignOpponentStepRecords(next).some(
        (step) => step.stableKey === stepKey,
      )
    )
      continue;
    const ran = runOpponentStep(
      next,
      campaign,
      contest,
      ensured.opponent,
      weekStart,
    );
    next = ran.world;
    outcomeEventId = ran.step.outcomeEventId;
  }

  const dueAt = nextEvaluationDate(
    dueItem.dueAt,
    contest.electionDate,
    world.currentDate,
  );
  if (dueAt) {
    const ordinal = Number(dueItem.stableKey.split(":").at(-1)) + 1;
    const key = `${evaluationPrefix(campaign)}${ordinal}`;
    if (!next.history.futureDueItems.some((item) => item.stableKey === key)) {
      next = scheduleEvaluation(next, campaign, dueAt, ordinal, [
        campaign.filingEventId,
        ...(outcomeEventId ? [outcomeEventId] : []),
      ]);
    }
  }
  // The week's bills for this committee and each one running against it.
  next = planCampaignOperatingWeek(next, campaign, weekStart);
  return {
    world: next,
    status: "resolved",
    reasonKey: "campaign:opponents-acted",
    context: rivals.length === 0 ? "No living rival remained to act." : null,
    outcomeEventId,
  };
}

/* -------------------------------------------------------------------------- */
/* What the player's campaign knows                                            */
/* -------------------------------------------------------------------------- */

export interface KnownOpponentActivity {
  readonly eventId: EntityId;
  readonly date: IsoDate;
  readonly opponentPersonId: EntityId;
  readonly kind: CampaignOpponentStepKind;
  readonly summary: string;
}

/**
 * Opponent activity this person actually learned about, oldest first. Only
 * public steps with a knowledge record for the person appear; the rival's
 * private emphasis, treasury and limited steps never do. Pure.
 */
export function projectKnownOpponentActivity(
  world: World,
  personId: EntityId,
): readonly KnownOpponentActivity[] {
  const steps = campaignOpponentStepRecords(world);
  if (steps.length === 0) return [];
  const opponents = new Map(
    campaignOpponentRecords(world).map((record) => [record.id, record]),
  );
  const stepEventIds = new Set(steps.map((step) => step.outcomeEventId));
  const events = new Map(
    world.history.events
      .filter((event) => stepEventIds.has(event.id))
      .map((event) => [event.id, event]),
  );
  const knowledgeByEvent = new Map<EntityId, string>();
  for (const record of world.history.knowledge) {
    if (
      record.personId === personId &&
      stepEventIds.has(record.eventId) &&
      !knowledgeByEvent.has(record.eventId)
    ) {
      knowledgeByEvent.set(record.eventId, record.believedSummary);
    }
  }
  const rows: { sequence: number; row: KnownOpponentActivity }[] = [];
  for (const step of steps) {
    const opponent = opponents.get(step.opponentId);
    const event = events.get(step.outcomeEventId);
    if (!opponent || !event || event.visibility !== "public") continue;
    const believedSummary = knowledgeByEvent.get(event.id);
    if (believedSummary === undefined) continue;
    rows.push({
      sequence: event.sequence,
      row: {
        eventId: event.id,
        date: event.occurredAt,
        opponentPersonId: opponent.candidatePersonId,
        kind: step.kind,
        summary: believedSummary,
      },
    });
  }
  return rows
    .sort((left, right) => left.sequence - right.sequence)
    .map((entry) => entry.row);
}
