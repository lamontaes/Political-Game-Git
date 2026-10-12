/** Complete retained mogul wealth/interest/committee/hash/timing/offer/answer/deal-review math and ordered requests. Courts, press, campaign authority and the shared chooser remain separate owners. */
import type { recordWorldEvent as native_recordWorldEvent } from "../../simulation/world";
import type { recordEventKnowledge as native_recordEventKnowledge } from "../../simulation/records";
import type { recordDurableDecisionTrace as native_recordDurableDecisionTrace } from "../../simulation/decisions";
import type { recordPublicPosition as native_recordPublicPosition } from "../../simulation/politics";
import type { recordGoalState as native_recordGoalState } from "../../simulation/mind";
import type { createResourceFlow as native_createResourceFlow } from "../../simulation/resources";
import type { recordResourceTransferOutcome as native_recordResourceTransferOutcome } from "../../simulation/resources";
import type { recordMisconductAct as native_recordMisconductAct } from "../../simulation/press/matters";
import type { openMatter as native_openMatter } from "../../simulation/press/matters";
import type { recordAllegation as native_recordAllegation } from "../../simulation/press/matters";
import type { fileComplaint as native_fileComplaint } from "../../simulation/press/matters";
import type { evaluateDecision as native_evaluateDecision } from "../../simulation/decisions";
import { addDays } from "../../simulation/dates";
import { isSelectedDecision } from "../../simulation/decisions";
import { MOGUL_APPROACH_DECISION } from "../../simulation/mogul-decisions";
import { personName } from "../../simulation/people";
import { resourcePositionAt } from "./cash-positions";
import type * as campaignQueries from "../../simulation/campaign-queries";
import type { campaignCompliancePackFor as nativePack } from "../../simulation/campaign-compliance";
import type { assessContribution as nativeAssessment } from "../../simulation/campaign-compliance-rules";
import type { publicAdverseFindingsAgainst as nativeFindings } from "../../simulation/press/findings";
import type { procedureForSubject as nativeProcedure } from "../../simulation/press/matters";
import type { isPersonAliveAt as nativeAlive } from "../../simulation/vitality-integrity";
import type { publicPositionAtDate as nativePosition } from "../../simulation/queries";
import type {
  World,
  EntityId,
  IsoDate,
  HistoricalCutoff,
  CampaignRecord,
  DecisionConsideration,
  GoalStateRecord,
  HistoricalEvent,
  MoneyAmount,
} from "../../simulation/types";
export type StructuredKind =
  | "recordMisconductAct"
  | "openMatter"
  | "recordAllegation"
  | "fileComplaint"
  | "evaluateDecision";
type NativeReplies = {
  recordMisconductAct: ReturnType<typeof native_recordMisconductAct>;
  openMatter: ReturnType<typeof native_openMatter>;
  recordAllegation: ReturnType<typeof native_recordAllegation>;
  fileComplaint: ReturnType<typeof native_fileComplaint>;
  evaluateDecision: ReturnType<typeof native_evaluateDecision>;
};
export type Reply<T> = T extends { world: World }
  ? Omit<T, "world"> & { facts: MogulFacts }
  : T;
export type MogulReceiptMap = {
  [K in StructuredKind]: Reply<NativeReplies[K]>;
};
export interface MogulFacts {
  readonly id: EntityId;
  readonly seed: string;
  readonly currentDate: IsoDate;
  readonly onDate: IsoDate;
  readonly records: World["history"];
  readonly people: World["people"];
  readonly personOrder: World["personOrder"];
  readonly control: World["control"];
  readonly policyCatalog: World["policyCatalog"];
  readonly upstream: {
    readonly campaigns: ReturnType<typeof campaignQueries.campaigns>;
    readonly opponents: ReturnType<
      typeof campaignQueries.campaignOpponentRecords
    >;
    readonly active: (
      id: EntityId,
    ) => ReturnType<typeof campaignQueries.activeCampaignForCandidate>;
    readonly pack: (id: EntityId) => ReturnType<typeof nativePack>;
    readonly contribution: (
      input: Parameters<typeof nativeAssessment>[1],
    ) => ReturnType<typeof nativeAssessment>;
    readonly alive: (
      id: EntityId,
      cutoff: HistoricalCutoff,
    ) => ReturnType<typeof nativeAlive>;
    readonly state: (id: EntityId | null) => string | null;
    readonly stance: (
      id: EntityId,
      q: EntityId,
      onDate: IsoDate,
    ) => ReturnType<typeof nativePosition>;
    readonly findings: (id: EntityId) => ReturnType<typeof nativeFindings>;
    readonly procedure: (
      id: EntityId,
      campaign: CampaignRecord | null,
    ) => ReturnType<typeof nativeProcedure>;
  };
  readonly receipt: <K extends StructuredKind>(
    kind: K,
  ) => Reply<NativeReplies[K]>;
}
export type MogulRequest =
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof native_recordWorldEvent>[1];
    }
  | {
      readonly kind: "recordEventKnowledge";
      readonly input: Parameters<typeof native_recordEventKnowledge>[1];
    }
  | {
      readonly kind: "recordDurableDecisionTrace";
      readonly input: Parameters<typeof native_recordDurableDecisionTrace>[1];
    }
  | {
      readonly kind: "recordPublicPosition";
      readonly input: Parameters<typeof native_recordPublicPosition>[1];
    }
  | {
      readonly kind: "recordGoalState";
      readonly input: Parameters<typeof native_recordGoalState>[1];
    }
  | {
      readonly kind: "createResourceFlow";
      readonly input: Parameters<typeof native_createResourceFlow>[1];
    }
  | {
      readonly kind: "recordResourceTransferOutcome";
      readonly input: Parameters<
        typeof native_recordResourceTransferOutcome
      >[1];
    }
  | {
      readonly kind: "recordMisconductAct";
      readonly input: Parameters<typeof native_recordMisconductAct>[1];
    }
  | {
      readonly kind: "openMatter";
      readonly input: Parameters<typeof native_openMatter>[1];
    }
  | {
      readonly kind: "recordAllegation";
      readonly input: Parameters<typeof native_recordAllegation>[1];
    }
  | {
      readonly kind: "fileComplaint";
      readonly input: Parameters<typeof native_fileComplaint>[1];
    }
  | {
      readonly kind: "evaluateDecision";
      readonly input: Parameters<typeof native_evaluateDecision>[1];
    };
function currentHistoricalCutoff(facts: MogulFacts) {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function sortedUnique<T extends string>(values: readonly T[]) {
  return [...new Set(values)].sort();
}
function campaigns(facts: MogulFacts) {
  return facts.upstream.campaigns;
}
function campaignOpponentRecords(facts: MogulFacts) {
  return facts.upstream.opponents;
}
function activeCampaignForCandidate(facts: MogulFacts, id: EntityId) {
  return facts.upstream.active(id);
}
function campaignCompliancePackFor(facts: MogulFacts, id: EntityId) {
  return facts.upstream.pack(id);
}
function assessContribution(
  facts: MogulFacts,
  input: Parameters<typeof nativeAssessment>[1],
) {
  return facts.upstream.contribution(input);
}
function isPersonAliveAt(
  facts: MogulFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  return facts.upstream.alive(id, cutoff);
}
function stateOfJurisdiction(facts: MogulFacts, id: EntityId | null) {
  return facts.upstream.state(id);
}
function publicPositionAtDate(
  facts: MogulFacts,
  id: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return facts.upstream.stance(id, q, date);
}
function publicAdverseFindingsAgainst(facts: MogulFacts, id: EntityId) {
  return facts.upstream.findings(id);
}
function procedureForSubject(
  facts: MogulFacts,
  id: EntityId,
  campaign: CampaignRecord | null,
) {
  return facts.upstream.procedure(id, campaign);
}
// STOPGAP: economy.mogul-offer-size-windows
export const MOGUL_OFFERS_ESTIMATE = {
  version: "mogul-offers-unresearched-v1",
  provenance: "designed",
  estimated: false,
  rationale:
    "designed game schedule: reads the day of a mogul's last offer and balances a monthly reconsideration against a three-week offer window, so offers neither flood nor vanish; no public record counts corrupt approaches (research request `corrupt-opportunity-approaches`)",
  researchQuestionId: "corrupt-opportunity-approaches",
  reconsiderDays: 28,
  offerStandsDays: 21,
  deliveryWindowDays: 90,
  offerBasisPointsOfBalance: 10,
  minimumOfferMinorUnits: 100000,
  maximumOfferMinorUnits: 50000000,
} as const;
export const MOGUL_INTEREST_DOMAIN = "influence:public-policy";
export type MogulWantedStance = "support" | "oppose";
export interface MogulInterest {
  readonly goal: GoalStateRecord;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
}
export function mogulInterests(
  facts: MogulFacts,
  personId?: EntityId,
): readonly MogulInterest[] {
  const latest = new Map<EntityId, GoalStateRecord>();
  for (const goal of facts.records.goalStates) {
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
  readonly committeeOrganizationId: EntityId;
  readonly propositionId: EntityId;
  readonly wants: MogulWantedStance;
  readonly amount: MoneyAmount;
  readonly offeredAt: IsoDate;
  readonly standsUntil: IsoDate;
  readonly deliverBy: IsoDate | null;
  readonly state: MogulOfferState;
  readonly occurrenceId: EntityId | null;
}
function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}
function offerTag(offerEventId: EntityId): string {
  return `mogul.offer:${offerEventId}`;
}
export function mogulOffers(
  facts: MogulFacts,
  filter: {
    readonly toPersonId?: EntityId;
    readonly mogulPersonId?: EntityId;
  } = {},
  asOf: IsoDate = facts.currentDate,
): readonly MogulOffer[] {
  const followUps = new Map<EntityId, HistoricalEvent[]>();
  const offers: HistoricalEvent[] = [];
  for (const event of facts.records.events) {
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
      MOGUL_OFFERS_ESTIMATE.offerStandsDays,
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
            ? addDays(acceptedAt, MOGUL_OFFERS_ESTIMATE.deliveryWindowDays)
            : null,
        state,
        occurrenceId: answer
          ? (tagValue(answer, "mogul.occurrence:") as EntityId | null)
          : null,
      },
    ];
  });
}
function requireOffer(facts: MogulFacts, offerEventId: EntityId): MogulOffer {
  const offer = mogulOffers(facts).find((row) => row.eventId === offerEventId);
  if (!offer) throw new Error("That is not an offer anybody made.");
  return offer;
}
function personalBalance(
  facts: MogulFacts,
  personId: EntityId,
  currency: MoneyAmount["currency"],
): number {
  return (
    resourcePositionAt(facts, { kind: "person", personId }, currency)
      ?.liquidBalance.minorUnits ?? 0
  );
}
function offerAmount(balance: number): number {
  const rule = MOGUL_OFFERS_ESTIMATE;
  const share = Math.floor((balance * rule.offerBasisPointsOfBalance) / 10000);
  return Math.min(rule.maximumOfferMinorUnits, share);
}
function isAlive(facts: MogulFacts, personId: EntityId): boolean {
  return (
    Boolean(facts.people[personId]) &&
    isPersonAliveAt(facts, personId, currentHistoricalCutoff(facts))
  );
}
interface RunningCommittee {
  readonly candidatePersonId: EntityId;
  readonly organizationId: EntityId;
  readonly stableKey: string;
  readonly contest: CampaignRecord;
  readonly own: CampaignRecord | null;
}
function runningCommittees(facts: MogulFacts): readonly RunningCommittee[] {
  const running: RunningCommittee[] = [];
  for (const campaign of campaigns(facts)) {
    if (
      activeCampaignForCandidate(facts, campaign.candidatePersonId)?.id !==
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
    for (const opponent of campaignOpponentRecords(facts)) {
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
  facts: MogulFacts,
  organizationId: EntityId,
): RunningCommittee | null {
  return (
    runningCommittees(facts).find(
      (committee) => committee.organizationId === organizationId,
    ) ?? null
  );
}
// STOPGAP: economy.mogul-compliance-pack-blocks-all
function contributionAllowed(
  facts: MogulFacts,
  committee: RunningCommittee,
  mogulPersonId: EntityId,
  minorUnits: number,
): boolean {
  if (campaignCompliancePackFor(facts, committee.contest.id)) return false;
  if (!committee.own) return true;
  return (
    assessContribution(facts, {
      campaignId: committee.own.id,
      sourcePersonId: mogulPersonId,
      incomingMinorUnits: minorUnits,
      statementOfOrganizationFiled: null,
      treasurerPersonId: null,
      treasurerQualifiedElector: null,
    }).decision !== "refused"
  );
}
// STOPGAP: economy.mogul-geography-history-frontiers
function reachableCommittees(
  facts: MogulFacts,
  mogulPersonId: EntityId,
): readonly RunningCommittee[] {
  const home = stateOfJurisdiction(
    facts,
    facts.people[mogulPersonId]!.homeJurisdictionId,
  );
  if (home === null) return [];
  return runningCommittees(facts).filter(
    (committee) =>
      committee.candidatePersonId !== mogulPersonId &&
      isAlive(facts, committee.candidatePersonId) &&
      stateOfJurisdiction(facts, committee.contest.jurisdictionId) === home,
  );
}
function hash(value: string): number {
  let total = 0;
  for (const character of value) {
    total = (total * 31 + character.charCodeAt(0)) % 1000003;
  }
  return total;
}
function lastOfferBy(
  facts: MogulFacts,
  mogulPersonId: EntityId,
): IsoDate | null {
  return (
    mogulOffers(facts, { mogulPersonId })
      .map((offer) => offer.offeredAt)
      .sort()
      .at(-1) ?? null
  );
}
function stanceNow(
  facts: MogulFacts,
  personId: EntityId,
  propositionId: EntityId,
): string | null {
  return (
    publicPositionAtDate(facts, personId, propositionId, facts.currentDate)
      ?.stance ?? null
  );
}
export function* produceMogulOffers(
  facts: MogulFacts,
): Generator<MogulRequest, MogulFacts, MogulFacts> {
  let next = facts;
  const moguls = sortedUnique(mogulInterests(facts).map((row) => row.personId));
  for (const mogulId of moguls) {
    if (!isAlive(next, mogulId)) continue;
    const last = lastOfferBy(next, mogulId);
    if (
      last &&
      addDays(last, MOGUL_OFFERS_ESTIMATE.reconsiderDays) > next.currentDate
    ) {
      continue;
    }
    next = yield* considerApproach(next, mogulId);
  }
  return yield* reviewAcceptedDeals(next);
}
// STOPGAP: economy.mogul-consideration-chooser
function* considerApproach(
  facts: MogulFacts,
  mogulId: EntityId,
): Generator<MogulRequest, MogulFacts, MogulFacts> {
  const interests = mogulInterests(facts, mogulId);
  const options = reachableCommittees(facts, mogulId).flatMap((committee) =>
    interests
      .filter(
        (interest) =>
          !mogulOffers(facts, {
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
  if (options.length === 0) return facts;
  const pick = [...options].sort(
    (left, right) =>
      hash(
        `${facts.seed}:${facts.currentDate}:${mogulId}:${left.committee.organizationId}:${left.interest.propositionId}`,
      ) -
      hash(
        `${facts.seed}:${facts.currentDate}:${mogulId}:${right.committee.organizationId}:${right.interest.propositionId}`,
      ),
  )[0]!;
  const { committee, interest } = pick;
  const currency = committee.contest.treasuryCurrency;
  const amount = offerAmount(personalBalance(facts, mogulId, currency));
  if (amount < MOGUL_OFFERS_ESTIMATE.minimumOfferMinorUnits) return facts;
  if (!contributionAllowed(facts, committee, mogulId, amount)) return facts;
  const target = committee.candidatePersonId;
  const stance = stanceNow(facts, target, interest.propositionId);
  const aligned = stance === interest.wants;
  const findings = publicAdverseFindingsAgainst(facts, target);
  const key = `mogul:${mogulId}:${target}:${interest.propositionId}:${facts.currentDate}`;
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
          sourceRefs: findings.map((finding) => ({
            kind: "historical-event" as const,
            eventId: finding.step.eventId,
          })),
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
  const evaluation = (yield {
    kind: "evaluateDecision",
    input: {
      stableKey: `${key}:approach`,
      decisionType: MOGUL_APPROACH_DECISION.id,
      actorPersonId: mogulId,
      cutoff: currentHistoricalCutoff(facts),
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
    },
  }).receipt("evaluateDecision");
  if (!isSelectedDecision(evaluation)) return facts;
  let next = yield {
    kind: "recordDurableDecisionTrace",
    input: evaluation,
  };
  const chosen = evaluation.selectedOptionKey;
  if (chosen !== "donate" && chosen !== "deal") return next;
  const made = yield* makeOffer(next, {
    stableKey: key,
    kind: chosen === "donate" ? "donation" : "deal",
    mogulPersonId: mogulId,
    committee,
    propositionId: interest.propositionId,
    wants: interest.wants,
    amount: { minorUnits: amount, currency },
  });
  next = made.facts;
  if (next.control.kind === "person" && next.control.personId === target) {
    return next;
  }
  return yield* npcAnswers(next, made.eventId);
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
function propositionText(facts: MogulFacts, propositionId: EntityId): string {
  return facts.policyCatalog.propositions[propositionId]!.name;
}
function* makeOffer(
  facts: MogulFacts,
  input: MakeOfferInput,
): Generator<
  MogulRequest,
  {
    readonly facts: MogulFacts;
    readonly eventId: EntityId;
  },
  MogulFacts
> {
  const mogul = facts.people[input.mogulPersonId]!;
  const target = facts.people[input.committee.candidatePersonId]!;
  const question = propositionText(facts, input.propositionId);
  const dollars = formatDollars(input.amount);
  const summary =
    input.kind === "donation"
      ? `${personName(mogul)} offered ${personName(target)}'s campaign ${dollars}, with nothing asked in return.`
      : `${personName(mogul)} offered ${personName(target)}'s campaign ${dollars} if ${personName(target)} will publicly ${input.wants} this: ${question}`;
  let next = yield {
    kind: "recordWorldEvent",
    input: {
      stableKey: `${input.stableKey}:offer`,
      type: MOGUL_OFFER_EVENT,
      occurredAt: facts.currentDate,
      recordedAt: facts.currentDate,
      jurisdictionId: input.committee.contest.jurisdictionId,
      involvedEntityIds: sortedUnique([
        input.mogulPersonId,
        input.committee.candidatePersonId,
      ]),
      participants: [
        {
          personId: input.mogulPersonId,
          role: "agency:offered",
          detail:
            input.kind === "donation" ? "Offered a gift" : "Offered a deal",
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
    },
  };
  const offer = next.records.events.at(-1)!;
  next = yield {
    kind: "recordEventKnowledge",
    input: {
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
    },
  };
  return { facts: next, eventId: offer.id };
}
export interface AnswerMogulOfferInput {
  readonly offerEventId: EntityId;
  readonly answer: MogulOfferAnswer;
}
// STOPGAP: economy.mogul-deal-common-effects
export function* answerMogulOffer(
  facts: MogulFacts,
  input: AnswerMogulOfferInput,
): Generator<
  MogulRequest,
  {
    readonly facts: MogulFacts;
    readonly offer: MogulOffer;
  },
  MogulFacts
> {
  const offer = requireOffer(facts, input.offerEventId);
  if (offer.state !== "open") {
    throw new Error(
      offer.state === "lapsed"
        ? "That offer has lapsed."
        : "That offer has already been answered.",
    );
  }
  const committee = runningCommittee(facts, offer.committeeOrganizationId);
  if (!committee) {
    throw new Error("The campaign this offer was for is no longer running.");
  }
  const campaign = committee.contest;
  const key = `mogul-answer:${offer.eventId}`;
  const mogul = facts.people[offer.mogulPersonId]!;
  const target = facts.people[offer.toPersonId]!;
  let next = facts;
  const tags = [offerTag(offer.eventId), `mogul.answer:${input.answer}`];
  let occurrenceId: EntityId | null = null;
  if (input.answer === "accept") {
    if (
      personalBalance(facts, offer.mogulPersonId, offer.amount.currency) <
      offer.amount.minorUnits
    ) {
      throw new Error(`${personName(mogul)} no longer has that money to give.`);
    }
    if (offer.kind === "deal") {
      const proposition = propositionText(next, offer.propositionId);
      const recorded = (yield {
        kind: "recordMisconductAct",
        input: {
          stableKey: `${key}:occurrence`,
          eventStableKey: `${key}:agreed`,
          eventType: "mogul.deal-agreed",
          family: "M4",
          actorPersonIds: [offer.toPersonId, offer.mogulPersonId],
          participantPersonIds: [offer.toPersonId, offer.mogulPersonId],
          relatedEntityIds: [committee.organizationId],
          flows: [
            {
              flow: {
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
              },
              outcome: {
                stableKey: `${key}:transfer`,
                periodStartsAt: next.currentDate,
                periodEndsAt: next.currentDate,
                occurredAt: next.currentDate,
                status: "completed",
                attemptedAmount: offer.amount,
                transferredAmount: offer.amount,
                reasonKind: null,
                note: `Contribution from ${personName(mogul)}.`,
              },
            },
          ],
          artifacts: [
            {
              stableKey: `${key}:message`,
              evidenceKind: "record:private-correspondence",
              createdAt: offer.offeredAt,
              recordedAt: next.currentDate,
              access: "private",
              description: `${personName(mogul)}'s message to ${personName(target)}: the contribution is for a public ${offer.wants === "support" ? "endorsement" : "rejection"} of "${proposition}".`,
            },
            {
              stableKey: `${key}:ledger`,
              evidenceKind: "record:campaign-ledger-entry",
              createdAt: next.currentDate,
              recordedAt: next.currentDate,
              access: "restricted",
              description: `Committee ledger entry: a contribution of ${formatDollars(offer.amount)} from ${personName(mogul)}.`,
            },
          ],
          jurisdictionId: campaign.jurisdictionId,
          summary: `${personName(target)} accepted ${personName(mogul)}'s money on the understanding of a public ${offer.wants} on "${proposition}".`,
          choice: "accept",
          tags: [offerTag(offer.eventId)],
        },
      }).receipt("recordMisconductAct");
      next = recorded.facts;
      occurrenceId = recorded.occurrence.id;
      tags.push(`mogul.occurrence:${occurrenceId}`);
    } else {
      next = yield {
        kind: "createResourceFlow",
        input: {
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
        },
      };
      const flow = next.records.resourceFlows.at(-1)!;
      next = yield {
        kind: "recordResourceTransferOutcome",
        input: {
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
        },
      };
    }
  }
  next = yield {
    kind: "recordWorldEvent",
    input: {
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
    },
  };
  return { facts: next, offer: requireOffer(next, offer.eventId) };
}
export function* deliverMogulStance(
  facts: MogulFacts,
  offerEventId: EntityId,
): Generator<MogulRequest, MogulFacts, MogulFacts> {
  const offer = requireOffer(facts, offerEventId);
  if (offer.state !== "accepted" || offer.kind !== "deal") {
    throw new Error("There is no accepted deal waiting on that stance.");
  }
  const key = `mogul-deliver:${offer.eventId}`;
  const target = facts.people[offer.toPersonId]!;
  const question = propositionText(facts, offer.propositionId);
  let next = yield {
    kind: "recordWorldEvent",
    input: {
      stableKey: `${key}:said`,
      type: MOGUL_STANCE_DELIVERED_EVENT,
      occurredAt: facts.currentDate,
      recordedAt: facts.currentDate,
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
    },
  };
  const said = next.records.events.at(-1)!;
  const prior = publicPositionAtDate(
    next,
    offer.toPersonId,
    offer.propositionId,
    next.currentDate,
  );
  next = yield {
    kind: "recordPublicPosition",
    input: {
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
    },
  };
  return next;
}
function* npcAnswers(
  facts: MogulFacts,
  offerEventId: EntityId,
): Generator<MogulRequest, MogulFacts, MogulFacts> {
  const offer = requireOffer(facts, offerEventId);
  const findings = publicAdverseFindingsAgainst(facts, offer.toPersonId);
  const stance = stanceNow(facts, offer.toPersonId, offer.propositionId);
  const evaluation = (yield {
    kind: "evaluateDecision",
    input: {
      stableKey: `mogul-answer:${offer.eventId}:decision`,
      decisionType: "mogul.answer",
      actorPersonId: offer.toPersonId,
      cutoff: currentHistoricalCutoff(facts),
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
                  findings.length > 0
                    ? ("slight" as const)
                    : ("strong" as const),
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
    },
  }).receipt("evaluateDecision");
  if (!isSelectedDecision(evaluation)) return facts;
  let next = yield {
    kind: "recordDurableDecisionTrace",
    input: evaluation,
  };
  const answer =
    evaluation.selectedOptionKey === "accept" ? "accept" : "decline";
  next = (yield* answerMogulOffer(next, { offerEventId, answer })).facts;
  if (answer === "accept" && offer.kind === "deal") {
    next = yield* deliverMogulStance(next, offerEventId);
  }
  return next;
}
function* reviewAcceptedDeals(
  facts: MogulFacts,
): Generator<MogulRequest, MogulFacts, MogulFacts> {
  let next = facts;
  for (const offer of mogulOffers(facts)) {
    if (offer.kind !== "deal" || offer.state !== "accepted") continue;
    if (!offer.deliverBy || offer.deliverBy > next.currentDate) continue;
    if (!offer.occurrenceId || !isAlive(next, offer.mogulPersonId)) continue;
    const key = `mogul-broken:${offer.eventId}`;
    const evaluation = (yield {
      kind: "evaluateDecision",
      input: {
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
      },
    }).receipt("evaluateDecision");
    next = yield {
      kind: "recordDurableDecisionTrace",
      input: evaluation,
    };
    const mogul = next.people[offer.mogulPersonId]!;
    const target = next.people[offer.toPersonId]!;
    if (evaluation.selectedOptionKey !== "go-public") {
      next = yield {
        kind: "recordWorldEvent",
        input: {
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
        },
      };
      continue;
    }
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
    const opened = (yield {
      kind: "openMatter",
      input: {
        stableKey: `${key}:matter`,
        family: "M4",
        subjectPersonIds: [offer.toPersonId],
        occurrenceId: offer.occurrenceId,
        originEventId: offer.eventId,
        jurisdictionId: campaign?.jurisdictionId ?? null,
      },
    }).receipt("openMatter");
    next = opened.facts;
    const alleged = (yield {
      kind: "recordAllegation",
      input: {
        stableKey: `${key}:allegation`,
        matterId: opened.matter.id,
        allegerPersonId: offer.mogulPersonId,
        statement: `${personName(target)} took ${personName(mogul)}'s money for a public ${offer.wants} on "${propositionText(next, offer.propositionId)}" and never gave it`,
        publicAllegation: true,
        basisEventIds: [offer.eventId],
      },
    }).receipt("recordAllegation");
    next = alleged.facts;
    next = (yield {
      kind: "fileComplaint",
      input: {
        stableKey: `${key}:complaint`,
        matterId: opened.matter.id,
        complainantPersonId: offer.mogulPersonId,
        procedureKey: procedureForSubject(next, offer.toPersonId, campaign),
      },
    }).receipt("fileComplaint").facts;
    next = yield {
      kind: "recordWorldEvent",
      input: {
        stableKey: `${key}:exposed`,
        type: MOGUL_DEAL_EXPOSED_EVENT,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: campaign?.jurisdictionId ?? null,
        involvedEntityIds: sortedUnique([
          offer.mogulPersonId,
          offer.toPersonId,
        ]),
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
      },
    };
  }
  return next;
}
