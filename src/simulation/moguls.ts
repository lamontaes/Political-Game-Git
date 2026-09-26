/**
 * Very rich people who want something from government, and what they offer
 * the politicians who can give it to them.
 *
 * A mogul is not a class of person. It is anybody the World records with two
 * things: money of their own, read from their personal account, and an
 * interest in how officials stand on a policy question, recorded as an
 * ordinary goal whose target is the catalog proposition. Nothing here decides
 * who is rich; the people who seed wealth do. Nothing here scripts who is
 * approached; each mogul weighs, for themselves, the campaigns whose
 * candidate's public stance stands between them and what they want.
 *
 * Two kinds of offer exist, and they differ in exactly one fact:
 *
 * 1. A donation: a contribution to the candidate's committee, checked against
 *    the state's contribution rule like any other gift. Lawful. Nothing is
 *    asked in return.
 * 2. A deal: the same contribution, given on the private understanding that
 *    the candidate will publicly take the mogul's side. The understanding is
 *    what ALIVE44 files as misconduct family M4 ("bribery attempt with
 *    represented payer/official/action/payment records"), so accepting one
 *    writes an M4 occurrence with the mogul's own message as its record.
 *
 * A deal can be found out. When a candidate takes the money and never says
 * what was bought, the mogul decides whether to go public; if they do, the
 * matter opens through the same allegation, complaint and proceeding path
 * every other finding uses, and the respondent's state body hears it.
 *
 * Every number below is a marked placeholder. Who approaches, how often, with
 * how much, and how such arrangements are discovered are filed with the
 * research queue as `corrupt-opportunity-approaches`.
 */
import {
  activeCampaignForCandidate,
  campaignOpponentRecords,
  campaigns,
} from "./campaign-queries";
import { assessContribution } from "./campaign-compliance-rules";
import { campaignCompliancePackFor } from "./campaign-compliance";
import { addDays } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { recordEvidenceArtifact } from "./evidence";
import { recordGoalState, createMindProvenance } from "./mind";
import { personName } from "./people";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordPublicPosition } from "./politics";
import { currentHistoricalCutoff, publicPositionAtDate } from "./queries";
import { recordEventKnowledge } from "./records";
import { resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import type {
  CampaignRecord,
  DecisionConsideration,
  EntityId,
  GoalStateRecord,
  HistoricalEvent,
  IsoDate,
  MoneyAmount,
  World,
} from "./types";
import { recordWorldEvent } from "./world";
import { publicAdverseFindingsAgainst } from "./press/findings";
import {
  fileComplaint,
  openMatter,
  procedureForSubject,
  recordAllegation,
} from "./press/matters";
import { stateOfJurisdiction } from "./press/outlets";
import { PRESS_CONTRACT_VERSION } from "./press/records";
import { sortedUnique } from "./press/shared";
import { appendPressRecord } from "./press/store";

/* -------------------------------------------------------------------------- */
/* Placeholders                                                                */
/* -------------------------------------------------------------------------- */

/**
 * UNRESEARCHED. Every rate in the mogul offer loop. Filed as
 * `corrupt-opportunity-approaches` (who approaches an official, with what,
 * how often, and how it is discovered). A researched table replaces this one
 * under a new version, never as a silent edit.
 */
export const UNRESEARCHED_MOGUL_OFFERS = {
  version: "mogul-offers-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  researchQuestionId: "corrupt-opportunity-approaches",
  /** Days a mogul waits after one offer before weighing another. */
  reconsiderDays: 28,
  /** Days an offer stands before it lapses unanswered. */
  offerStandsDays: 21,
  /** Days a mogul waits for a bought stance before deciding it is not coming. */
  deliveryWindowDays: 90,
  /** Share of the mogul's own balance offered, in basis points. */
  offerBasisPointsOfBalance: 10,
  /** Nobody offers less than this; below it, the mogul does not bother. */
  minimumOfferMinorUnits: 100_000,
  /** Nobody offers more than this in one gift. */
  maximumOfferMinorUnits: 50_000_000,
} as const;

/* -------------------------------------------------------------------------- */
/* Interests                                                                   */
/* -------------------------------------------------------------------------- */

export const MOGUL_INTEREST_DOMAIN = "influence:public-policy";
const INTEREST_KEY_PREFIX = "mogul-interest:";

export type MogulWantedStance = "support" | "oppose";

export interface MogulInterest {
  readonly goal: GoalStateRecord;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
}

export interface RecordMogulInterestInput {
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
  /** Why they want it, in the World's own terms (their business, a belief). */
  readonly because: string;
  readonly priority?: GoalStateRecord["priority"];
}

/**
 * Records what somebody wants officials to say about one policy question.
 * The interest is an ordinary goal, so it shows up wherever goals are read,
 * and it proposes actions rather than changing anything by itself.
 */
export function recordMogulInterest(
  world: World,
  input: RecordMogulInterestInput,
): World {
  const proposition = world.policyCatalog.propositions[input.propositionId];
  if (!proposition)
    throw new Error("An interest needs a real policy question.");
  if (!input.because.trim()) throw new Error("An interest needs its reason.");
  return recordGoalState(world, {
    stableKey: `${INTEREST_KEY_PREFIX}${input.personId}:${input.propositionId}`,
    personId: input.personId,
    goalKey: `${INTEREST_KEY_PREFIX}${input.propositionId}:${input.wants}`,
    recordedAt: world.currentDate,
    objective: `Get officials to publicly ${input.wants}: ${proposition.name}`,
    domain: MOGUL_INTEREST_DOMAIN,
    scope: "public",
    priority: input.priority ?? "high",
    status: "active",
    targetEntityId: input.propositionId,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", { note: input.because }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

/** Current interests, one per person and question, latest state only. */
export function mogulInterests(
  world: World,
  personId?: EntityId,
): readonly MogulInterest[] {
  const latest = new Map<EntityId, GoalStateRecord>();
  for (const goal of world.history.goalStates) {
    if (goal.domain !== MOGUL_INTEREST_DOMAIN) continue;
    if (personId && goal.personId !== personId) continue;
    latest.set(goal.goalId, goal);
  }
  return [...latest.values()].flatMap((goal) => {
    if (goal.status !== "active" || !goal.targetEntityId) return [];
    const wants = goal.goalKey.endsWith(":oppose") ? "oppose" : "support";
    return [
      {
        goal,
        personId: goal.personId,
        propositionId: goal.targetEntityId,
        wants,
      },
    ];
  });
}

/* -------------------------------------------------------------------------- */
/* Offers — reading                                                            */
/* -------------------------------------------------------------------------- */

export const MOGUL_OFFER_EVENT = "mogul.offer-made";
export const MOGUL_OFFER_ANSWERED_EVENT = "mogul.offer-answered";
export const MOGUL_STANCE_DELIVERED_EVENT = "mogul.stance-delivered";
export const MOGUL_DEAL_EXPOSED_EVENT = "mogul.deal-exposed";
export const MOGUL_DEAL_DROPPED_EVENT = "mogul.deal-dropped";

export type MogulOfferKind = "donation" | "deal";
export type MogulOfferAnswer = "accept" | "decline";
export type MogulOfferState =
  | "open"
  | "lapsed"
  | "declined"
  | "accepted"
  | "delivered"
  | "exposed"
  | "dropped";

export interface MogulOffer {
  readonly eventId: EntityId;
  readonly kind: MogulOfferKind;
  readonly mogulPersonId: EntityId;
  readonly toPersonId: EntityId;
  /** The committee the money goes to, the player's or an opponent's. */
  readonly committeeOrganizationId: EntityId;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
  readonly amount: MoneyAmount;
  readonly offeredAt: IsoDate;
  readonly standsUntil: IsoDate;
  /** For an accepted deal: the day the mogul stops waiting. */
  readonly deliverBy: IsoDate | null;
  readonly state: MogulOfferState;
  /** The M4 occurrence an accepted deal wrote. */
  readonly occurrenceId: EntityId | null;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function offerTag(offerEventId: EntityId): string {
  return `mogul.offer:${offerEventId}`;
}

/** Every offer the World records, with its state on `asOf`. */
export function mogulOffers(
  world: World,
  filter: {
    readonly toPersonId?: EntityId;
    readonly mogulPersonId?: EntityId;
  } = {},
  asOf: IsoDate = world.currentDate,
): readonly MogulOffer[] {
  const followUps = new Map<EntityId, HistoricalEvent[]>();
  const offers: HistoricalEvent[] = [];
  for (const event of world.history.events) {
    if (event.type === MOGUL_OFFER_EVENT) {
      offers.push(event);
      continue;
    }
    if (!event.type.startsWith("mogul.")) continue;
    const id = tagValue(event, "mogul.offer:") as EntityId | null;
    if (!id) continue;
    followUps.set(id, [...(followUps.get(id) ?? []), event]);
  }
  return offers.flatMap((event) => {
    const mogul = event.participants.find(
      (entry) => entry.role === "agency:offered",
    )?.personId;
    const to = event.participants.find(
      (entry) => entry.role === "focus:offered-to",
    )?.personId;
    if (!mogul || !to) return [];
    if (filter.toPersonId && to !== filter.toPersonId) return [];
    if (filter.mogulPersonId && mogul !== filter.mogulPersonId) return [];
    const after = (followUps.get(event.id) ?? []).filter(
      (entry) => entry.occurredAt <= asOf,
    );
    const answer = after.find(
      (entry) => entry.type === MOGUL_OFFER_ANSWERED_EVENT,
    );
    const answered = answer ? tagValue(answer, "mogul.answer:") : null;
    const standsUntil = addDays(
      event.occurredAt,
      UNRESEARCHED_MOGUL_OFFERS.offerStandsDays,
    );
    const kind = tagValue(event, "mogul.kind:") as MogulOfferKind;
    let state: MogulOfferState;
    if (after.some((entry) => entry.type === MOGUL_DEAL_EXPOSED_EVENT)) {
      state = "exposed";
    } else if (after.some((entry) => entry.type === MOGUL_DEAL_DROPPED_EVENT)) {
      state = "dropped";
    } else if (
      after.some((entry) => entry.type === MOGUL_STANCE_DELIVERED_EVENT)
    ) {
      state = "delivered";
    } else if (answered === "accept") {
      state = "accepted";
    } else if (answered === "decline") {
      state = "declined";
    } else {
      state = asOf > standsUntil ? "lapsed" : "open";
    }
    const acceptedAt =
      answered === "accept" && answer ? answer.occurredAt : null;
    return [
      {
        eventId: event.id,
        kind,
        mogulPersonId: mogul,
        toPersonId: to,
        committeeOrganizationId: tagValue(
          event,
          "mogul.committee:",
        ) as EntityId,
        propositionId: tagValue(event, "mogul.proposition:") as EntityId,
        wants: tagValue(event, "mogul.wants:") as MogulWantedStance,
        amount: {
          minorUnits: Number(tagValue(event, "mogul.amount:")),
          currency: tagValue(event, "mogul.currency:"),
        } as MoneyAmount,
        offeredAt: event.occurredAt,
        standsUntil,
        deliverBy:
          kind === "deal" && acceptedAt
            ? addDays(acceptedAt, UNRESEARCHED_MOGUL_OFFERS.deliveryWindowDays)
            : null,
        state,
        occurrenceId: answer
          ? (tagValue(answer, "mogul.occurrence:") as EntityId | null)
          : null,
      },
    ];
  });
}

/** Offers waiting on this person's answer. */
export function openMogulOffersFor(
  world: World,
  personId: EntityId,
): readonly MogulOffer[] {
  return mogulOffers(world, { toPersonId: personId }).filter(
    (offer) => offer.state === "open",
  );
}

function requireOffer(world: World, offerEventId: EntityId): MogulOffer {
  const offer = mogulOffers(world).find((row) => row.eventId === offerEventId);
  if (!offer) throw new Error("That is not an offer anybody made.");
  return offer;
}

/* -------------------------------------------------------------------------- */
/* Offers — who approaches whom                                                */
/* -------------------------------------------------------------------------- */

function personalBalance(
  world: World,
  personId: EntityId,
  currency: MoneyAmount["currency"],
): number {
  return (
    resourcePositionAt(world, { kind: "person", personId }, currency)
      ?.liquidBalance.minorUnits ?? 0
  );
}

function offerAmount(balance: number): number {
  const rule = UNRESEARCHED_MOGUL_OFFERS;
  const share = Math.floor((balance * rule.offerBasisPointsOfBalance) / 10_000);
  return Math.min(rule.maximumOfferMinorUnits, share);
}

function isAlive(world: World, personId: EntityId): boolean {
  return (
    Boolean(world.people[personId]) &&
    isPersonAliveAt(world, personId, currentHistoricalCutoff(world))
  );
}

/**
 * A committee raising money in a race the World represents: the player's
 * campaign, or an opponent's campaign in the same contest. The contest's
 * campaign carries the office, the state and the rules for both sides.
 */
interface RunningCommittee {
  readonly candidatePersonId: EntityId;
  readonly organizationId: EntityId;
  readonly stableKey: string;
  readonly contest: CampaignRecord;
  /** The candidate's own campaign record, when the World keeps one. */
  readonly own: CampaignRecord | null;
}

function runningCommittees(world: World): readonly RunningCommittee[] {
  const running: RunningCommittee[] = [];
  for (const campaign of campaigns(world)) {
    if (
      activeCampaignForCandidate(world, campaign.candidatePersonId)?.id !==
      campaign.id
    ) {
      continue;
    }
    running.push({
      candidatePersonId: campaign.candidatePersonId,
      organizationId: campaign.organizationId,
      stableKey: campaign.stableKey,
      contest: campaign,
      own: campaign,
    });
    for (const opponent of campaignOpponentRecords(world)) {
      if (opponent.rivalCampaignId !== campaign.id) continue;
      running.push({
        candidatePersonId: opponent.candidatePersonId,
        organizationId: opponent.committeeOrganizationId,
        stableKey: opponent.stableKey,
        contest: campaign,
        own: null,
      });
    }
  }
  return running;
}

function runningCommittee(
  world: World,
  organizationId: EntityId,
): RunningCommittee | null {
  return (
    runningCommittees(world).find(
      (committee) => committee.organizationId === organizationId,
    ) ?? null
  );
}

/**
 * Whether this committee may take this gift. Kentucky's reviewed pack needs a
 * contributor's address, employer and occupation above its threshold, which
 * the World does not record for anyone, so a mogul there does not offer. An
 * opponent's committee is an organized committee already, which is what the
 * other states' read rule asks for before a contribution.
 */
function contributionAllowed(
  world: World,
  committee: RunningCommittee,
  mogulPersonId: EntityId,
  minorUnits: number,
): boolean {
  if (campaignCompliancePackFor(world, committee.contest.id)) return false;
  if (!committee.own) return true;
  return (
    assessContribution(world, {
      campaignId: committee.own.id,
      sourcePersonId: mogulPersonId,
      incomingMinorUnits: minorUnits,
      statementOfOrganizationFiled: null,
      treasurerPersonId: null,
      treasurerQualifiedElector: null,
    }).decision !== "refused"
  );
}

/** The committees a mogul can reach: running now, in the mogul's own state. */
function reachableCommittees(
  world: World,
  mogulPersonId: EntityId,
): readonly RunningCommittee[] {
  const home = stateOfJurisdiction(
    world,
    world.people[mogulPersonId]!.homeJurisdictionId,
  );
  if (home === null) return [];
  return runningCommittees(world).filter(
    (committee) =>
      committee.candidatePersonId !== mogulPersonId &&
      isAlive(world, committee.candidatePersonId) &&
      stateOfJurisdiction(world, committee.contest.jurisdictionId) === home,
  );
}

function hash(value: string): number {
  let total = 0;
  for (const character of value) {
    total = (total * 31 + character.charCodeAt(0)) % 1_000_003;
  }
  return total;
}

function lastOfferBy(world: World, mogulPersonId: EntityId): IsoDate | null {
  return (
    mogulOffers(world, { mogulPersonId })
      .map((offer) => offer.offeredAt)
      .sort()
      .at(-1) ?? null
  );
}

function stanceNow(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): string | null {
  return (
    publicPositionAtDate(world, personId, propositionId, world.currentDate)
      ?.stance ?? null
  );
}

/**
 * Weekly: each mogul whose last offer is far enough behind them looks at the
 * campaigns in their state, picks the one whose candidate's public stance
 * matters to their interest, and decides whether to give, to deal, or to wait.
 * Then every open deal whose stance has not come is weighed by its mogul.
 */
export function produceMogulOffers(world: World): World {
  let next = world;
  const moguls = sortedUnique(mogulInterests(world).map((row) => row.personId));
  for (const mogulId of moguls) {
    if (!isAlive(next, mogulId)) continue;
    const last = lastOfferBy(next, mogulId);
    if (
      last &&
      addDays(last, UNRESEARCHED_MOGUL_OFFERS.reconsiderDays) > next.currentDate
    ) {
      continue;
    }
    next = considerApproach(next, mogulId);
  }
  return reviewAcceptedDeals(next);
}

function considerApproach(before: World, mogulId: EntityId): World {
  // A public finding is on the record for anyone; the mogul reads the ones
  // about each candidate they can reach before weighing them.
  const world = learnPublicFindings(before, mogulId);
  const interests = mogulInterests(world, mogulId);
  const options = reachableCommittees(world, mogulId).flatMap((committee) =>
    interests
      .filter(
        (interest) =>
          !mogulOffers(world, {
            mogulPersonId: mogulId,
            toPersonId: committee.candidatePersonId,
          }).some(
            (offer) =>
              offer.propositionId === interest.propositionId &&
              offer.state !== "lapsed" &&
              offer.state !== "declined",
          ),
      )
      .map((interest) => ({ committee, interest })),
  );
  if (options.length === 0) return world;
  const pick = [...options].sort(
    (left, right) =>
      hash(
        `${world.seed}:${world.currentDate}:${mogulId}:${left.committee.organizationId}:${left.interest.propositionId}`,
      ) -
      hash(
        `${world.seed}:${world.currentDate}:${mogulId}:${right.committee.organizationId}:${right.interest.propositionId}`,
      ),
  )[0]!;
  const { committee, interest } = pick;
  const currency = committee.contest.treasuryCurrency;
  const amount = offerAmount(personalBalance(world, mogulId, currency));
  if (amount < UNRESEARCHED_MOGUL_OFFERS.minimumOfferMinorUnits) return world;
  if (!contributionAllowed(world, committee, mogulId, amount)) return world;

  const target = committee.candidatePersonId;
  const stance = stanceNow(world, target, interest.propositionId);
  const aligned = stance === interest.wants;
  const findings = publicAdverseFindingsAgainst(world, target);
  const key = `mogul:${mogulId}:${target}:${interest.propositionId}:${world.currentDate}`;
  const considerations: DecisionConsideration[] = [
    {
      stableKey: "mogul:reward-an-ally",
      optionKey: "donate",
      sourceType: "context:public-stance",
      direction: aligned ? "supports" : "opposes",
      importance: aligned ? "strong" : "moderate",
      confidence: "high",
      explanation: aligned
        ? "The candidate already says in public what they want said."
        : "Money with no strings would help a candidate who does not take their side.",
      sourceRefs: [],
    },
    {
      stableKey: "mogul:buy-the-stance",
      optionKey: "deal",
      sourceType: "mind:goal",
      direction: aligned ? "opposes" : "supports",
      importance: aligned ? "strong" : "moderate",
      confidence: "medium",
      explanation: aligned
        ? "There is nothing to buy; the candidate already agrees."
        : "The candidate's public stance stands between them and what they want.",
      sourceRefs: [{ kind: "goal-state", goalStateId: interest.goal.id }],
    },
    findings.length > 0
      ? {
          stableKey: "mogul:known-to-bend-rules",
          optionKey: "deal",
          sourceType: "information:public-finding",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation:
            "The candidate has a public ethics finding against them, so a quiet arrangement looks less likely to be refused or reported.",
          // What the mogul read of each finding, or the finding itself when
          // they took part in it.
          sourceRefs: findings.map((finding) => {
            const read = world.history.knowledge.find(
              (row) =>
                row.personId === mogulId &&
                row.eventId === finding.step.eventId,
            );
            return read
              ? { kind: "event-knowledge" as const, knowledgeId: read.id }
              : {
                  kind: "historical-event" as const,
                  eventId: finding.step.eventId,
                };
          }),
        }
      : {
          stableKey: "mogul:clean-record-risk",
          optionKey: "deal",
          sourceType: "context:public-record",
          direction: "opposes",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "The candidate has no public ethics record, so proposing a deal risks being reported.",
          sourceRefs: [],
        },
    {
      stableKey: "mogul:attention",
      optionKey: "wait",
      sourceType: "context:public-attention",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "Every gift to a campaign is a public filing.",
      sourceRefs: [],
    },
  ];
  const evaluation = evaluateDecision(world, {
    stableKey: `${key}:approach`,
    decisionType: "mogul.approach",
    actorPersonId: mogulId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "entity:campaign-committee",
      key: committee.stableKey,
      entityId: committee.organizationId,
    },
    options: [
      {
        key: "donate",
        label: "Give to the campaign",
        description: "A contribution with nothing asked in return.",
      },
      {
        key: "deal",
        label: "Offer money for a public stance",
        description:
          "A contribution given on the understanding that the candidate takes their side in public.",
      },
      { key: "wait", label: "Wait", description: "Do nothing this time." },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const chosen = evaluation.selectedOptionKey;
  if (chosen !== "donate" && chosen !== "deal") return next;
  const made = makeOffer(next, {
    stableKey: key,
    kind: chosen === "donate" ? "donation" : "deal",
    mogulPersonId: mogulId,
    committee,
    propositionId: interest.propositionId,
    wants: interest.wants,
    amount: { minorUnits: amount, currency },
  });
  next = made.world;
  // Anybody the player does not control answers for themselves, at once.
  if (next.control.kind === "person" && next.control.personId === target) {
    return next;
  }
  return npcAnswers(next, made.eventId);
}

/**
 * The mogul learns, from the public record, every adverse finding against a
 * candidate they can reach that they do not already know. Nothing is written
 * for a finding they already know or took part in.
 */
function learnPublicFindings(world: World, mogulId: EntityId): World {
  let next = world;
  for (const committee of reachableCommittees(world, mogulId)) {
    for (const finding of publicAdverseFindingsAgainst(
      world,
      committee.candidatePersonId,
    )) {
      const eventId = finding.step.eventId;
      const event = next.history.events.find((row) => row.id === eventId);
      if (!event || event.involvedEntityIds.includes(mogulId)) continue;
      if (
        next.history.knowledge.some(
          (row) => row.personId === mogulId && row.eventId === eventId,
        )
      )
        continue;
      next = recordEventKnowledge(next, {
        stableKey: `mogul-read:${mogulId}:${eventId}`,
        personId: mogulId,
        eventId,
        learnedAt: next.currentDate,
        believedSummary: event.summary,
        accuracy: "accurate",
        confidence: "high",
        source: {
          kind: "public-record",
          reference: finding.proceeding.institutionLabel,
        },
      });
    }
  }
  return next;
}

interface MakeOfferInput {
  readonly stableKey: string;
  readonly kind: MogulOfferKind;
  readonly mogulPersonId: EntityId;
  readonly committee: RunningCommittee;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
  readonly amount: MoneyAmount;
}

function formatDollars(amount: MoneyAmount): string {
  const dollars = amount.minorUnits / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function propositionText(world: World, propositionId: EntityId): string {
  return world.policyCatalog.propositions[propositionId]!.name;
}

function makeOffer(
  world: World,
  input: MakeOfferInput,
): { readonly world: World; readonly eventId: EntityId } {
  const mogul = world.people[input.mogulPersonId]!;
  const target = world.people[input.committee.candidatePersonId]!;
  const question = propositionText(world, input.propositionId);
  const dollars = formatDollars(input.amount);
  const summary =
    input.kind === "donation"
      ? `${personName(mogul)} offered ${personName(target)}'s campaign ${dollars}, with nothing asked in return.`
      : `${personName(mogul)} offered ${personName(target)}'s campaign ${dollars} if ${personName(target)} will publicly ${input.wants} this: ${question}`;
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:offer`,
    type: MOGUL_OFFER_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.committee.contest.jurisdictionId,
    involvedEntityIds: sortedUnique([
      input.mogulPersonId,
      input.committee.candidatePersonId,
    ]),
    participants: [
      {
        personId: input.mogulPersonId,
        role: "agency:offered",
        detail: input.kind === "donation" ? "Offered a gift" : "Offered a deal",
      },
      {
        personId: input.committee.candidatePersonId,
        role: "focus:offered-to",
        detail: "Was made an offer",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `mogul.kind:${input.kind}`,
      `mogul.committee:${input.committee.organizationId}`,
      `mogul.proposition:${input.propositionId}`,
      `mogul.wants:${input.wants}`,
      `mogul.amount:${input.amount.minorUnits}`,
      `mogul.currency:${input.amount.currency}`,
    ],
    summary,
    context: {
      location: null,
      socialContext:
        input.kind === "deal"
          ? "A private offer of money for a public stance."
          : "A private offer of a campaign contribution.",
      pressure: null,
      choice: null,
      motivation: `They want officials to publicly ${input.wants}: ${question}`,
      immediateReaction: null,
    },
  });
  const offer = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:told`,
    personId: input.committee.candidatePersonId,
    eventId: offer.id,
    learnedAt: next.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.mogulPersonId,
      claimId: null,
    },
  });
  return { world: next, eventId: offer.id };
}

/* -------------------------------------------------------------------------- */
/* Answers                                                                     */
/* -------------------------------------------------------------------------- */

export interface AnswerMogulOfferInput {
  readonly offerEventId: EntityId;
  readonly answer: MogulOfferAnswer;
}

/**
 * The candidate's answer. Declining writes only the answer. Accepting moves
 * the money into the committee through the ordinary contribution records; a
 * deal also writes the M4 occurrence, backed by the mogul's message and the
 * committee's ledger entry, which is what a later inquiry can find.
 */
export function answerMogulOffer(
  world: World,
  input: AnswerMogulOfferInput,
): { readonly world: World; readonly offer: MogulOffer } {
  const offer = requireOffer(world, input.offerEventId);
  if (offer.state !== "open") {
    throw new Error(
      offer.state === "lapsed"
        ? "That offer has lapsed."
        : "That offer has already been answered.",
    );
  }
  const committee = runningCommittee(world, offer.committeeOrganizationId);
  if (!committee) {
    throw new Error("The campaign this offer was for is no longer running.");
  }
  const campaign = committee.contest;
  const key = `mogul-answer:${offer.eventId}`;
  const mogul = world.people[offer.mogulPersonId]!;
  const target = world.people[offer.toPersonId]!;
  let next = world;
  const tags = [offerTag(offer.eventId), `mogul.answer:${input.answer}`];
  let occurrenceId: EntityId | null = null;
  if (input.answer === "accept") {
    if (
      personalBalance(world, offer.mogulPersonId, offer.amount.currency) <
      offer.amount.minorUnits
    ) {
      throw new Error(`${personName(mogul)} no longer has that money to give.`);
    }
    next = createResourceFlow(next, {
      stableKey: `${key}:flow`,
      source: { kind: "person", personId: offer.mogulPersonId },
      recipient: {
        kind: "organization",
        organizationId: committee.organizationId,
      },
      startsAt: next.currentDate,
      initialStatus: "active",
      amount: offer.amount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-contribution",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: campaign.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: offer.eventId },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      status: "completed",
      attemptedAmount: offer.amount,
      transferredAmount: offer.amount,
      reasonKind: null,
      note: `Contribution from ${personName(mogul)}.`,
      provenance: { kind: "simulated-event", eventId: offer.eventId },
    });
    if (offer.kind === "deal") {
      next = recordEvidenceArtifact(next, {
        stableKey: `${key}:message`,
        evidenceKind: "record:private-correspondence",
        createdAt: offer.offeredAt,
        recordedAt: next.currentDate,
        relatedEntityIds: [offer.eventId],
        access: "private",
        description: `${personName(mogul)}'s message to ${personName(target)}: the contribution is for a public ${offer.wants === "support" ? "endorsement" : "rejection"} of "${propositionText(next, offer.propositionId)}".`,
        provenance: { kind: "simulated", sourceEntityIds: [offer.eventId] },
      });
      const message = next.history.evidenceArtifacts.at(-1)!;
      next = recordEvidenceArtifact(next, {
        stableKey: `${key}:ledger`,
        evidenceKind: "record:campaign-ledger-entry",
        createdAt: next.currentDate,
        recordedAt: next.currentDate,
        relatedEntityIds: [offer.eventId],
        access: "restricted",
        description: `Committee ledger entry: a contribution of ${formatDollars(offer.amount)} from ${personName(mogul)}.`,
        provenance: { kind: "simulated", sourceEntityIds: [offer.eventId] },
      });
      const ledger = next.history.evidenceArtifacts.at(-1)!;
      next = recordWorldEvent(next, {
        stableKey: `${key}:agreed`,
        type: "mogul.deal-agreed",
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: campaign.jurisdictionId,
        involvedEntityIds: sortedUnique([
          offer.mogulPersonId,
          offer.toPersonId,
        ]),
        participants: [
          {
            personId: offer.toPersonId,
            role: "agency:actor",
            detail: "Took money for a promised public stance",
          },
          {
            personId: offer.mogulPersonId,
            role: "agency:payer",
            detail: "Paid for a promised public stance",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [
          PRESS_CONTRACT_VERSION,
          "misconduct:M4",
          offerTag(offer.eventId),
        ],
        summary: `${personName(target)} accepted ${personName(mogul)}'s money on the understanding of a public ${offer.wants} on "${propositionText(next, offer.propositionId)}".`,
        context: {
          location: null,
          socialContext: "A private arrangement: money for a public stance.",
          pressure: null,
          choice: "accept",
          motivation: null,
          immediateReaction: null,
        },
      });
      const act = next.history.events.at(-1)!;
      const appended = appendPressRecord(next, "financial-occurrence", {
        stableKey: `${key}:occurrence`,
        family: "M4",
        actorPersonIds: sortedUnique([offer.toPersonId, offer.mogulPersonId]),
        occurrenceEventId: act.id,
        resourceFlowIds: [flow.id],
        recordEvidenceArtifactIds: [message.id, ledger.id],
        dutyReference: null,
        intentional: true,
        occurredAt: next.currentDate,
        jurisdictionId: campaign.jurisdictionId,
      });
      next = appended.world;
      occurrenceId = appended.record.id;
      tags.push(`mogul.occurrence:${occurrenceId}`);
    }
  }
  next = recordWorldEvent(next, {
    stableKey: `${key}:answered`,
    type: MOGUL_OFFER_ANSWERED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: sortedUnique([offer.mogulPersonId, offer.toPersonId]),
    participants: [
      {
        personId: offer.toPersonId,
        role: "agency:answered",
        detail: input.answer === "accept" ? "Accepted" : "Declined",
      },
      {
        personId: offer.mogulPersonId,
        role: "focus:answered",
        detail: "Heard the answer",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags,
    summary:
      input.answer === "accept"
        ? `${personName(target)} accepted ${personName(mogul)}'s offer.`
        : `${personName(target)} turned down ${personName(mogul)}'s offer.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: input.answer,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, offer: requireOffer(next, offer.eventId) };
}

/**
 * The candidate says in public what the deal asked for. Anybody may take any
 * stance at any time; this records it as the stance a deal was waiting on.
 */
export function deliverMogulStance(
  world: World,
  offerEventId: EntityId,
): World {
  const offer = requireOffer(world, offerEventId);
  if (offer.state !== "accepted" || offer.kind !== "deal") {
    throw new Error("There is no accepted deal waiting on that stance.");
  }
  const key = `mogul-deliver:${offer.eventId}`;
  const target = world.people[offer.toPersonId]!;
  const question = propositionText(world, offer.propositionId);
  let next = recordWorldEvent(world, {
    stableKey: `${key}:said`,
    type: MOGUL_STANCE_DELIVERED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [offer.toPersonId],
    participants: [
      {
        personId: offer.toPersonId,
        role: "agency:speaker",
        detail: `Said in public they ${offer.wants} it`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    // The public statement links to the private offer only by an id tag that
    // this module reads; nothing about the offer is shown with it.
    tags: [offerTag(offer.eventId)],
    summary: `${personName(target)} said in public that they ${offer.wants} this: ${question}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: offer.wants,
      motivation: null,
      immediateReaction: null,
    },
  });
  const said = next.history.events.at(-1)!;
  const prior = publicPositionAtDate(
    next,
    offer.toPersonId,
    offer.propositionId,
    next.currentDate,
  );
  next = recordPublicPosition(next, {
    stableKey: `${key}:position`,
    personId: offer.toPersonId,
    propositionId: offer.propositionId,
    statedAt: next.currentDate,
    stance: offer.wants,
    statement: `I ${offer.wants} this: ${question}`,
    audience: "public",
    venue: null,
    sourceEventId: said.id,
    supersedesPublicPositionId: prior?.id ?? null,
  });
  return next;
}

/** Someone not played answers from their own situation. */
function npcAnswers(world: World, offerEventId: EntityId): World {
  const offer = requireOffer(world, offerEventId);
  const findings = publicAdverseFindingsAgainst(world, offer.toPersonId);
  const stance = stanceNow(world, offer.toPersonId, offer.propositionId);
  const evaluation = evaluateDecision(world, {
    stableKey: `mogul-answer:${offer.eventId}:decision`,
    decisionType: "mogul.answer",
    actorPersonId: offer.toPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "entity:event",
      key: offer.eventId,
      entityId: offer.eventId,
    },
    options: [
      { key: "accept", label: "Accept", description: "Take the money." },
      { key: "decline", label: "Decline", description: "Turn it down." },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "mogul:money-helps",
        optionKey: "accept",
        sourceType: "context:campaign-money",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation: "The campaign needs the money.",
        sourceRefs: [],
      },
      ...(offer.kind === "deal"
        ? [
            {
              stableKey: "mogul:strings-attached",
              optionKey: "accept",
              sourceType: "context:ethics-risk" as const,
              direction: "opposes" as const,
              importance:
                findings.length > 0 ? ("slight" as const) : ("strong" as const),
              confidence: "high" as const,
              explanation:
                findings.length > 0
                  ? "They have been found against before and are still running."
                  : "Taking money for a public stance is the kind of thing that ends careers.",
              sourceRefs: [],
            },
            {
              stableKey: "mogul:already-agree",
              optionKey: "accept",
              sourceType: "context:public-stance" as const,
              direction:
                stance === offer.wants
                  ? ("supports" as const)
                  : ("opposes" as const),
              importance: "moderate" as const,
              confidence: "medium" as const,
              explanation:
                stance === offer.wants
                  ? "They already say this in public."
                  : "It would mean saying something they have not said.",
              sourceRefs: [],
            },
          ]
        : []),
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const answer =
    evaluation.selectedOptionKey === "accept" ? "accept" : "decline";
  next = answerMogulOffer(next, { offerEventId, answer }).world;
  // Someone who took a deal and is not played says what was bought at once.
  if (answer === "accept" && offer.kind === "deal") {
    next = deliverMogulStance(next, offerEventId);
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Found out                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A deal whose stance never came. The mogul paid and got nothing, and knows
 * exactly what they paid for; they decide for themselves whether to say so
 * in public. Going public opens an M4 matter against the candidate with the
 * accepted deal as its occurrence, so the state body that hears it holds the
 * mogul's message and the committee's ledger entry.
 */
function reviewAcceptedDeals(world: World): World {
  let next = world;
  for (const offer of mogulOffers(world)) {
    if (offer.kind !== "deal" || offer.state !== "accepted") continue;
    if (!offer.deliverBy || offer.deliverBy > next.currentDate) continue;
    if (!offer.occurrenceId || !isAlive(next, offer.mogulPersonId)) continue;
    const key = `mogul-broken:${offer.eventId}`;
    const evaluation = evaluateDecision(next, {
      stableKey: `${key}:decision`,
      decisionType: "mogul.deal-broken",
      actorPersonId: offer.mogulPersonId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "entity:event",
        key: offer.eventId,
        entityId: offer.eventId,
      },
      options: [
        {
          key: "go-public",
          label: "Say what the money was for",
          description:
            "Tell the public the candidate took money and did not deliver.",
        },
        {
          key: "let-it-go",
          label: "Let it go",
          description: "Write the money off and stay quiet.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "mogul:paid-for-nothing",
          optionKey: "go-public",
          sourceType: "context:unkept-deal",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: "They paid for a stance and never got it.",
          sourceRefs: [],
        },
        {
          stableKey: "mogul:own-exposure",
          optionKey: "go-public",
          sourceType: "context:ethics-risk",
          direction: "opposes",
          importance: "strong",
          confidence: "high",
          explanation: "Saying so admits that they offered the money.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    const mogul = next.people[offer.mogulPersonId]!;
    const target = next.people[offer.toPersonId]!;
    if (evaluation.selectedOptionKey !== "go-public") {
      next = recordWorldEvent(next, {
        stableKey: `${key}:dropped`,
        type: MOGUL_DEAL_DROPPED_EVENT,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [offer.mogulPersonId],
        participants: [
          {
            personId: offer.mogulPersonId,
            role: "agency:decided",
            detail: "Wrote the money off",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [offerTag(offer.eventId)],
        summary: `${personName(mogul)} wrote off the money given to ${personName(target)} and said nothing.`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: "let-it-go",
          motivation: null,
          immediateReaction: null,
        },
      });
      continue;
    }
    // The contest's campaign carries the office and state that decide which
    // body hears it, for the player and an opponent alike.
    const campaign =
      runningCommittee(next, offer.committeeOrganizationId)?.contest ??
      campaigns(next).find(
        (row) =>
          campaignOpponentRecords(next).some(
            (opponent) =>
              opponent.committeeOrganizationId ===
                offer.committeeOrganizationId &&
              opponent.rivalCampaignId === row.id,
          ) || row.organizationId === offer.committeeOrganizationId,
      ) ??
      null;
    const opened = openMatter(next, {
      stableKey: `${key}:matter`,
      family: "M4",
      subjectPersonIds: [offer.toPersonId],
      occurrenceId: offer.occurrenceId,
      originEventId: offer.eventId,
      jurisdictionId: campaign?.jurisdictionId ?? null,
    });
    next = opened.world;
    const alleged = recordAllegation(next, {
      stableKey: `${key}:allegation`,
      matterId: opened.matter.id,
      allegerPersonId: offer.mogulPersonId,
      statement: `${personName(target)} took ${personName(mogul)}'s money for a public ${offer.wants} on "${propositionText(next, offer.propositionId)}" and never gave it`,
      publicAllegation: true,
      basisEventIds: [offer.eventId],
    });
    next = alleged.world;
    next = fileComplaint(next, {
      stableKey: `${key}:complaint`,
      matterId: opened.matter.id,
      complainantPersonId: offer.mogulPersonId,
      procedureKey: procedureForSubject(next, offer.toPersonId, campaign),
    }).world;
    next = recordWorldEvent(next, {
      stableKey: `${key}:exposed`,
      type: MOGUL_DEAL_EXPOSED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: campaign?.jurisdictionId ?? null,
      involvedEntityIds: sortedUnique([offer.mogulPersonId, offer.toPersonId]),
      participants: [
        {
          personId: offer.mogulPersonId,
          role: "agency:alleger",
          detail: "Went public about the deal",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [offerTag(offer.eventId), `mogul.matter:${opened.matter.id}`],
      summary: `${personName(mogul)} went public about the money given to ${personName(target)}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "go-public",
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return next;
}
