import {
  activeCampaignForCandidate,
  campaignTreasuryPosition,
  campaigns,
} from "../campaign-queries";
import { addDays } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { requireElectionContest } from "../election-contests";
import {
  hasPersonDiscoveredEvidence,
  recordEvidenceArtifact,
  recordEvidenceDiscovery,
} from "../evidence";
import { scheduleFutureDueItem } from "../future-transitions";
import { activeWorkRelationshipsAt } from "../life-queries";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { recordClaim, recordEventKnowledge } from "../records";
import {
  createResourceFlow,
  recordResourceTransferOutcome,
} from "../resources";
import type {
  CampaignRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  MoneyAmount,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  DISBURSEMENT_RECORD_KEY_PREFIX,
  PRESS_MATTER_TAG,
  sortedUnique,
} from "./shared";
import { generatedStateOversightBody } from "./generated-state-oversight";
import { stateOfJurisdiction } from "./outlets";
import {
  STATE_LEGISLATIVE_ETHICS_PROCEDURES,
  stateJurisdictionIdForKey,
} from "./state-ethics";
import { openProceeding, proceedingSteps } from "./procedures";
import {
  MISCONDUCT_FAMILY_LABELS,
  PRESS_CONTRACT_VERSION,
  type FinancialOccurrenceRecord,
  type MatterRecord,
  type MisconductFamily,
  type ProcedureKey,
} from "./records";
import {
  appendPressRecord,
  pressRecordByKey,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";

/**
 * M4 — record-backed financial matters.
 *
 * The underlying occurrence, the evidence, the public allegation and the
 * institutional proceeding are separate records linked by stable IDs. A false
 * allegation has no occurrence. A real, secret misuse can stay unknown for as
 * long as no record reaches anyone who could act on it.
 */

export const PRESS_LEDGER_REVIEW_TRANSITION_KEY = "press:ledger-review";
/** Authored bookkeeping interval, not a legal filing deadline. */
export const LEDGER_REVIEW_DAYS = 30;

export const DELIBERATE_MISUSE_LABEL =
  "Use campaign money for a personal expense. This is misuse of campaign funds.";

export interface CampaignPersonalUseInput {
  readonly stableKey: string;
  readonly amountMinorUnits: number;
  /** What the money actually paid for, in the player's own words. */
  readonly purpose: string;
}

/**
 * The deliberate, clearly labeled M1 option. It exists only for a candidate
 * with an active committee that holds the money; it is never an ordinary
 * expense button. It moves money once, through the existing resource writer.
 */
export function campaignPersonalUseAvailability(world: World): {
  readonly available: boolean;
  readonly reason: string;
  readonly campaign: CampaignRecord | null;
  readonly balanceMinorUnits: number;
} {
  if (world.control.kind !== "person") {
    return {
      available: false,
      reason: "No controlled person.",
      campaign: null,
      balanceMinorUnits: 0,
    };
  }
  const campaign = activeCampaignForCandidate(world, world.control.personId);
  if (!campaign) {
    return {
      available: false,
      reason:
        "Only a candidate with an active campaign committee has campaign money.",
      campaign: null,
      balanceMinorUnits: 0,
    };
  }
  const balance =
    campaignTreasuryPosition(world, campaign)?.liquidBalance.minorUnits ?? 0;
  return balance > 0
    ? {
        available: true,
        reason: DELIBERATE_MISUSE_LABEL,
        campaign,
        balanceMinorUnits: balance,
      }
    : {
        available: false,
        reason: "The committee has no money.",
        campaign,
        balanceMinorUnits: 0,
      };
}

export function spendCampaignFundsPersonally(
  world: World,
  input: CampaignPersonalUseInput,
): { readonly world: World; readonly occurrence: FinancialOccurrenceRecord } {
  const availability = campaignPersonalUseAvailability(world);
  const campaign = availability.campaign;
  if (!availability.available || !campaign || world.control.kind !== "person") {
    throw new Error(availability.reason);
  }
  const personId = world.control.personId;
  const purpose = input.purpose.trim();
  if (!purpose) throw new Error("Say what the money paid for.");
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0 ||
    input.amountMinorUnits > availability.balanceMinorUnits
  ) {
    throw new Error(
      "The amount must be positive and within the committee's balance.",
    );
  }
  const amount = {
    minorUnits: input.amountMinorUnits,
    currency: campaign.treasuryCurrency,
  };
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:act`,
    type: "finance.campaign-funds-personal-use",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: sortedUnique([personId, campaign.organizationId]),
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Paid a personal expense from the campaign account",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [PRESS_CONTRACT_VERSION, "misconduct:M1", "provenance:player-choice"],
    summary: `You paid a personal expense from campaign money: ${purpose}.`,
    context: {
      location: null,
      socialContext: DELIBERATE_MISUSE_LABEL,
      pressure: null,
      choice: purpose,
      motivation: null,
      immediateReaction: null,
    },
  });
  const act = next.history.events.at(-1)!;
  next = createResourceFlow(next, {
    stableKey: `${input.stableKey}:flow`,
    source: { kind: "organization", organizationId: campaign.organizationId },
    recipient: { kind: "person", personId },
    startsAt: next.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: act.id },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${input.stableKey}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: `Recorded in the committee's books as paid to the candidate: ${purpose}.`,
    provenance: { kind: "simulated-event", eventId: act.id },
  });
  next = recordEvidenceArtifact(next, {
    stableKey: `${input.stableKey}:ledger`,
    evidenceKind: "record:campaign-ledger-entry",
    createdAt: next.currentDate,
    recordedAt: next.currentDate,
    relatedEntityIds: [act.id],
    access: "restricted",
    description: `Committee ledger entry: a payment to the candidate for ${purpose}.`,
    provenance: { kind: "simulated", sourceEntityIds: [act.id] },
  });
  const ledger = next.history.evidenceArtifacts.at(-1)!;
  const appended = appendPressRecord(next, "financial-occurrence", {
    stableKey: input.stableKey,
    family: "M1",
    actorPersonIds: [personId],
    occurrenceEventId: act.id,
    resourceFlowIds: [flow.id],
    recordEvidenceArtifactIds: [ledger.id],
    dutyReference: null,
    intentional: true,
    occurredAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
  });
  next = scheduleFutureDueItem(appended.world, {
    stableKey: `press46:ledger-review:${appended.record.id}`,
    dueAt: addDays(next.currentDate, LEDGER_REVIEW_DAYS),
    transitionKey: PRESS_LEDGER_REVIEW_TRANSITION_KEY,
    entityIds: sortedUnique([act.id, personId]),
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [act.id] },
  });
  return { world: next, occurrence: appended.record };
}

export interface OpenMatterInput {
  readonly stableKey: string;
  readonly family: MisconductFamily;
  readonly subjectPersonIds: readonly EntityId[];
  readonly occurrenceId: EntityId | null;
  readonly originEventId: EntityId;
  readonly jurisdictionId: EntityId | null;
}

export function openMatter(
  world: World,
  input: OpenMatterInput,
): { readonly world: World; readonly matter: MatterRecord } {
  const existing = pressRecordByKey(world, "matter", input.stableKey);
  if (existing) return { world, matter: existing };
  const appended = appendPressRecord(world, "matter", {
    ...input,
    subjectPersonIds: sortedUnique(input.subjectPersonIds),
    openedAt: world.currentDate,
  });
  return { world: appended.world, matter: appended.record };
}

export interface RecordAllegationInput {
  readonly stableKey: string;
  readonly matterId: EntityId;
  readonly allegerPersonId: EntityId;
  /** The exact words of the allegation. */
  readonly statement: string;
  readonly publicAllegation: boolean;
  readonly basisEventIds: readonly EntityId[];
}

/**
 * An allegation is a claim by someone. Its relationship to truth is what the
 * World can establish: contradicted when the matter has no occurrence.
 */
export function recordAllegation(
  world: World,
  input: RecordAllegationInput,
): { readonly world: World; readonly eventId: EntityId } {
  const matter = requirePressRecord(world, "matter", input.matterId);
  const statement = input.statement.trim();
  if (!statement) throw new Error("An allegation needs its exact words.");
  const alleger = world.people[input.allegerPersonId];
  if (!alleger) throw new Error("An allegation needs an actual speaker.");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: input.publicAllegation
      ? "matter.allegation-made-public"
      : "matter.allegation-raised",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: matter.jurisdictionId,
    involvedEntityIds: sortedUnique([
      input.allegerPersonId,
      ...matter.subjectPersonIds,
      matter.id,
    ]),
    participants: [
      {
        personId: input.allegerPersonId,
        role: "agency:alleger",
        detail: input.publicAllegation
          ? "Made a public allegation"
          : "Raised a concern",
      },
      ...matter.subjectPersonIds.map((personId) => ({
        personId,
        role: "focus:accused" as const,
        detail: "Named in the allegation",
      })),
    ],
    personFactConstraints: [],
    visibility: input.publicAllegation ? "public" : "limited",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_MATTER_TAG}${matter.id}`,
      `misconduct:${matter.family}`,
      ...input.basisEventIds.map((id) => `press.basis:${id}`),
    ],
    summary: `${personName(alleger)} alleged that ${statement.replace(/\.$/, "")}. This is an allegation, not a finding.`,
    context: {
      location: null,
      socialContext: MISCONDUCT_FAMILY_LABELS[matter.family],
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: statement,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: input.allegerPersonId,
    eventId: event.id,
    madeAt: next.currentDate,
    audience: input.publicAllegation ? "public" : "limited",
    statement,
    relationshipToTruth: matter.occurrenceId ? "consistent" : "contradicts",
    provenance: { kind: "direct-record" },
  });
  const claim = next.history.claims.at(-1)!;
  for (const subjectId of matter.subjectPersonIds) {
    if (!input.publicAllegation) continue;
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:subject-heard:${subjectId}`,
      personId: subjectId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: input.allegerPersonId,
        claimId: claim.id,
      },
    });
  }
  next = appendPressRecord(next, "matter-allegation", {
    stableKey: input.stableKey,
    matterId: matter.id,
    allegerPersonId: input.allegerPersonId,
    allegationEventId: event.id,
    claimId: claim.id,
    statement,
    publicAllegation: input.publicAllegation,
    allegedAt: next.currentDate,
  }).world;
  return { world: next, eventId: event.id };
}

/** Which adapter applies to a campaign or office holder; never guessed. */
export function procedureForSubject(
  world: World,
  subjectPersonId: EntityId,
  campaign: CampaignRecord | null,
): ProcedureKey {
  const officeKey = campaign?.officeKey ?? "";
  if (/^us-(house|senate|president)|(^|:)us-congress|federal/.test(officeKey)) {
    return "fec-enforcement";
  }
  const candidacyPackId = campaign?.candidacyPackId ?? "";
  const legislativeWork = activeWorkRelationshipsAt(world, subjectPersonId)
    .filter((entry) =>
      entry.relationship.kind.startsWith("employment:legislative"),
    )
    .map((entry) =>
      stateOfJurisdiction(world, entry.role.locationJurisdictionId),
    );
  for (const entry of STATE_LEGISLATIVE_ETHICS_PROCEDURES) {
    const byCandidacy = entry.candidacyPackPrefixes.some((prefix) =>
      candidacyPackId.startsWith(prefix),
    );
    if (byCandidacy) return entry.procedureKey;
    const stateId = stateJurisdictionIdForKey(
      world,
      entry.stateJurisdictionKey,
    );
    if (stateId !== null && legislativeWork.includes(stateId)) {
      return entry.procedureKey;
    }
  }
  // No researched body applies: a state or local campaign, or a legislator in
  // a state nobody has read, goes to that state's generated body. Only where
  // the World names no state at all does the simulated inquiry remain.
  const stateJurisdiction =
    stateOfJurisdiction(world, campaign?.jurisdictionId ?? null) ??
    legislativeWork.find((stateId) => stateId !== null) ??
    null;
  return generatedStateOversightBody(world, stateJurisdiction)
    ? "generated-state-oversight"
    : "simulated-inquiry";
}

export interface FileComplaintInput {
  readonly stableKey: string;
  readonly matterId: EntityId;
  readonly complainantPersonId: EntityId;
  readonly procedureKey: ProcedureKey;
}

export function fileComplaint(world: World, input: FileComplaintInput) {
  const matter = requirePressRecord(world, "matter", input.matterId);
  const complainant = world.people[input.complainantPersonId];
  if (!complainant) throw new Error("A complaint needs an actual complainant.");
  const next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:filed`,
    type: "matter.complaint-filed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: matter.jurisdictionId,
    involvedEntityIds: sortedUnique([input.complainantPersonId, matter.id]),
    participants: [
      {
        personId: input.complainantPersonId,
        role: "agency:complainant",
        detail: "Filed a sworn complaint",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [PRESS_CONTRACT_VERSION, `${PRESS_MATTER_TAG}${matter.id}`],
    summary: `${personName(complainant)} filed a sworn complaint.`,
    context: {
      location: null,
      socialContext: MISCONDUCT_FAMILY_LABELS[matter.family],
      pressure: null,
      choice: input.procedureKey,
      motivation: null,
      immediateReaction: null,
    },
  });
  return openProceeding(next, {
    stableKey: input.stableKey,
    matterId: matter.id,
    procedureKey: input.procedureKey,
    complainantPersonId: input.complainantPersonId,
    respondentPersonIds: matter.subjectPersonIds,
    openingEventId: next.history.events.at(-1)!.id,
  });
}

/**
 * A disbursement already on the committee's books becomes a public-filing
 * evidence record the first time a matter needs it. This records an existing
 * payment; it creates no money.
 */
export function ensureDisbursementRecord(
  world: World,
  flowId: EntityId,
): { readonly world: World; readonly artifactId: EntityId } {
  const stableKey = `${DISBURSEMENT_RECORD_KEY_PREFIX}${flowId}`;
  const existing = world.history.evidenceArtifacts.find(
    (artifact) => artifact.stableKey === stableKey,
  );
  if (existing) return { world, artifactId: existing.id };
  const flow = world.history.resourceFlows.find(
    (record) => record.id === flowId,
  );
  if (!flow) throw new Error(`No such payment: ${flowId}`);
  if (flow.provenance.kind !== "simulated-event") {
    throw new Error(
      "Only a payment made by a recorded action has a disbursement record.",
    );
  }
  const paymentEventId = flow.provenance.eventId;
  const next = recordEvidenceArtifact(world, {
    stableKey,
    evidenceKind: "record:campaign-disbursement",
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds: [paymentEventId],
    access: "public",
    description: "The committee's disbursement record for this payment.",
    provenance: { kind: "simulated", sourceEntityIds: [paymentEventId] },
  });
  return { world: next, artifactId: next.history.evidenceArtifacts.at(-1)!.id };
}

/**
 * Bookkeeping review: a campaign staff member who keeps the books finds the
 * restricted ledger entry, then decides for themselves what to do. With no
 * staff, nobody finds it and the occurrence stays unknown.
 */
export function pressLedgerReviewHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PRESS_LEDGER_REVIEW_TRANSITION_KEY) {
    throw new Error("The ledger review handler received another transition.");
  }
  const occurrenceId = dueItem.stableKey.slice(
    "press46:ledger-review:".length,
  ) as EntityId;
  const occurrence = pressRecordsOfKind(world, "financial-occurrence").find(
    (record) => record.id === occurrenceId,
  );
  const done = (
    reasonKey: `${string}:${string}`,
    next = world,
    eventId: EntityId | null = null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: eventId ? "resolved" : "cancelled",
    reasonKey,
    context: null,
    outcomeEventId: eventId,
  });
  if (!occurrence) return done("press:occurrence-missing");
  const campaign = campaigns(world).find((record) =>
    occurrence.resourceFlowIds.some((flowId) => {
      const flow = world.history.resourceFlows.find(
        (item) => item.id === flowId,
      );
      return (
        flow?.source.kind === "organization" &&
        flow.source.organizationId === record.organizationId
      );
    }),
  );
  const bookkeeper = campaign
    ? world.history.workRelationships
        .filter((relationship) =>
          campaign.staffWorkRelationshipIds.includes(relationship.id),
        )
        .map((relationship) => relationship.personId)
        .filter((personId) => !occurrence.actorPersonIds.includes(personId))
        .find((personId) =>
          activeWorkRelationshipsAt(world, personId).some(
            (entry) =>
              entry.relationship.organizationId === campaign.organizationId,
          ),
        )
    : undefined;
  if (!bookkeeper) return done("press:no-one-reviewed-the-books");
  let next = world;
  occurrence.recordEvidenceArtifactIds.forEach((artifactId, index) => {
    if (
      hasPersonDiscoveredEvidence(
        next,
        bookkeeper,
        artifactId,
        currentHistoricalCutoff(next),
      )
    ) {
      return;
    }
    next = recordEvidenceDiscovery(next, {
      stableKey: `${dueItem.stableKey}:found:${index}`,
      personId: bookkeeper,
      evidenceArtifactId: artifactId,
      discoveredAt: next.currentDate,
      recordedAt: next.currentDate,
      methodKey: "work:bookkeeping-review",
      provenance: {
        kind: "simulated",
        sourceEntityIds: sortedUnique([
          artifactId,
          occurrence.occurrenceEventId,
        ]),
      },
    });
  });
  const discovery =
    next === world
      ? world.history.events.find(
          (event) => event.id === occurrence.occurrenceEventId,
        )!
      : next.history.events.at(-1)!;
  const actor = occurrence.actorPersonIds[0]!;
  if (
    campaign &&
    !pressRecordByKey(
      next,
      "matter",
      candidatePaymentsMatterKey(campaign.id),
    ) &&
    next.history.events.some(
      (event) =>
        event.type === "matter.internal-concern-raised" &&
        event.participants.some(
          (entry) =>
            entry.personId === bookkeeper &&
            entry.role === "agency:concerned-staff",
        ) &&
        event.participants.some((entry) => entry.personId === actor),
    )
  ) {
    return bookkeeperGoesOutside(
      next,
      dueItem,
      campaign,
      bookkeeper,
      actor,
      discovery,
    );
  }
  const evaluation = evaluateDecision(next, {
    stableKey: `${dueItem.stableKey}:decision`,
    decisionType: "press.bookkeeper-concern",
    actorPersonId: bookkeeper,
    cutoff: currentHistoricalCutoff(next),
    subject: {
      kind: "context:ledger-entry",
      key: occurrence.stableKey,
      entityId: discovery.id,
    },
    options: [
      {
        key: "raise-internally",
        label: "Raise it with the candidate",
        description: "Ask about the entry privately.",
      },
      {
        key: "say-nothing",
        label: "Say nothing",
        description: "Leave the entry alone.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "press:bookkeeping-duty",
        optionKey: "raise-internally",
        sourceType: "context:professional-role",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation:
          "The entry is a payment to the candidate recorded against campaign money.",
        sourceRefs: [],
      },
      {
        stableKey: "press:employment-dependence",
        optionKey: "say-nothing",
        sourceType: "context:professional-role",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The bookkeeper works for the candidate.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  if (evaluation.selectedOptionKey !== "raise-internally") {
    return done("press:bookkeeper-stayed-silent", next, discovery.id);
  }
  const opened = openMatter(next, {
    stableKey: `press46:matter:${occurrence.id}`,
    family: occurrence.family,
    subjectPersonIds: occurrence.actorPersonIds,
    occurrenceId: occurrence.id,
    originEventId: discovery.id,
    jurisdictionId: occurrence.jurisdictionId,
  });
  next = opened.world;
  next = recordWorldEvent(next, {
    stableKey: `${dueItem.stableKey}:concern`,
    type: "matter.internal-concern-raised",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: occurrence.jurisdictionId,
    involvedEntityIds: sortedUnique([bookkeeper, actor, opened.matter.id]),
    participants: [
      {
        personId: bookkeeper,
        role: "agency:concerned-staff",
        detail: "Asked about a ledger entry",
      },
      {
        personId: actor,
        role: "focus:asked",
        detail: "Was asked about the entry",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [PRESS_CONTRACT_VERSION, `${PRESS_MATTER_TAG}${opened.matter.id}`],
    summary: `${personName(next.people[bookkeeper]!)} asked about a campaign ledger entry recording a payment to the candidate.`,
    context: {
      location: null,
      socialContext: MISCONDUCT_FAMILY_LABELS[occurrence.family],
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const concern = next.history.events.at(-1)!;
  for (const personId of [bookkeeper, actor]) {
    next = recordEventKnowledge(next, {
      stableKey: `${concern.stableKey}:known:${personId}`,
      personId,
      eventId: concern.id,
      learnedAt: next.currentDate,
      believedSummary: concern.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return done("press:bookkeeper-raised-concern", next, concern.id);
}

/**
 * A staff member who already raised a payment to the candidate and has now
 * found another decides whether to take it outside the campaign: a complaint
 * to the body that hears it, under their own name. Staying quiet protects
 * their job; having been ignored once weighs toward reporting.
 */
function bookkeeperGoesOutside(
  world: World,
  dueItem: FutureDueItem,
  campaign: CampaignRecord,
  bookkeeper: EntityId,
  actor: EntityId,
  discovery: HistoricalEvent,
): FutureTransitionHandlerResult {
  const evaluation = evaluateDecision(world, {
    stableKey: `${dueItem.stableKey}:report-decision`,
    decisionType: "press.bookkeeper-report",
    actorPersonId: bookkeeper,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:ledger-entry",
      key: dueItem.stableKey,
      entityId: discovery.id,
    },
    options: [
      {
        key: "report-outside",
        label: "Report it outside the campaign",
        description: "File a complaint about the payments to the candidate.",
      },
      {
        key: "say-nothing",
        label: "Say nothing",
        description: "Leave the entry alone.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "press:raised-before-and-it-continued",
        optionKey: "report-outside",
        sourceType: "context:professional-role",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "They already asked the candidate about a payment like this, and the payments continued.",
        sourceRefs: [],
      },
      {
        stableKey: "press:employment-dependence",
        optionKey: "say-nothing",
        sourceType: "context:professional-role",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The bookkeeper works for the candidate.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const status = (reasonKey: `${string}:${string}`) => ({
    world: next,
    status: "resolved" as const,
    reasonKey,
    context: null,
    outcomeEventId: discovery.id,
  });
  if (evaluation.selectedOptionKey !== "report-outside") {
    return status("press:bookkeeper-stayed-silent");
  }
  const opened = openCandidatePaymentsMatter(
    next,
    campaign,
    actor,
    candidatePaymentOccurrences(next, campaign, actor, next.currentDate),
    discovery.id,
  );
  next = fileComplaint(opened.world, {
    stableKey: `${candidatePaymentsMatterKey(campaign.id)}:staff-complaint`,
    matterId: opened.matter.id,
    complainantPersonId: bookkeeper,
    procedureKey: procedureForSubject(opened.world, actor, campaign),
  }).world;
  return status("press:bookkeeper-reported-outside");
}

/**
 * A rival candidate may file a complaint about an expense they can see in the
 * other committee's public filings. The rival cannot see private books, so
 * this complaint is about a real, legitimate payment: the matter has no
 * occurrence, and the procedure should dismiss it.
 */
export function produceRivalComplaints(world: World): World {
  return produceVendorPaymentComplaint(produceCandidatePaymentComplaint(world));
}

/**
 * Authored interval between a committee paying somebody and that payment
 * appearing on its public disbursement filing. Not a filing deadline.
 */
export const DISBURSEMENT_FILING_LAG_DAYS = LEDGER_REVIEW_DAYS;

/** Authored: a committee files one report covering its new payments a month. */
export const CAMPAIGN_REPORT_INTERVAL_DAYS = 30;

export const CANDIDATE_PAYMENTS_REPORTED_EVENT =
  "campaign.candidate-payments-reported";

/**
 * The one matter per campaign about money its committee paid its own
 * candidate. Whoever notices first (a rival, the regulator's review of
 * reports, a staff member going outside) opens it; the others find it open.
 */
export function candidatePaymentsMatterKey(campaignId: EntityId): string {
  return `press46:candidate-payments:${campaignId}`;
}

/** M1 occurrences in which the committee paid `candidateId`, by `through`. */
function candidatePaymentOccurrences(
  world: World,
  campaign: CampaignRecord,
  candidateId: EntityId,
  through: IsoDate,
): readonly FinancialOccurrenceRecord[] {
  return pressRecordsOfKind(world, "financial-occurrence").filter(
    (occurrence) =>
      occurrence.family === "M1" &&
      occurrence.actorPersonIds.includes(candidateId) &&
      occurrence.occurredAt <= through &&
      occurrence.resourceFlowIds.some((flowId) => {
        const flow = world.history.resourceFlows.find(
          (row) => row.id === flowId,
        );
        return (
          flow?.source.kind === "organization" &&
          flow.source.organizationId === campaign.organizationId &&
          flow.recipient.kind === "person" &&
          flow.recipient.personId === candidateId
        );
      }),
  );
}

/**
 * Opens (or finds) the campaign's candidate-payments matter on the real
 * occurrences, and links each payment's public disbursement record to it as
 * evidence, so a body reviewing it holds the record and a finding orders all
 * of it repaid (`finding-consequences.ts`), not just the first.
 */
function openCandidatePaymentsMatter(
  world: World,
  campaign: CampaignRecord,
  candidateId: EntityId,
  occurrences: readonly FinancialOccurrenceRecord[],
  originEventId: EntityId,
): { readonly world: World; readonly matter: MatterRecord } {
  const stableKey = candidatePaymentsMatterKey(campaign.id);
  const opened = openMatter(world, {
    stableKey,
    family: "M1",
    subjectPersonIds: [candidateId],
    occurrenceId: occurrences[0]!.id,
    originEventId,
    jurisdictionId: campaign.jurisdictionId,
  });
  let next = opened.world;
  for (const occurrence of occurrences) {
    for (const flowId of occurrence.resourceFlowIds) {
      const linkKey = `${stableKey}:disbursement:${flowId}`;
      if (pressRecordByKey(next, "matter-evidence-link", linkKey)) continue;
      const record = ensureDisbursementRecord(next, flowId);
      next = appendPressRecord(record.world, "matter-evidence-link", {
        stableKey: linkKey,
        matterId: opened.matter.id,
        evidenceArtifactId: record.artifactId,
        bearing: "supports",
        linkedAt: next.currentDate,
      }).world;
    }
  }
  return { world: next, matter: opened.matter };
}

/**
 * Everybody outside a campaign who can notice its candidate paying themselves
 * starts from its public reports, so this runs each weekly sweep, in order:
 *
 * 1. The committee's report. Once a month, payments to the candidate older
 *    than the filing lag appear as a public record naming the candidate and
 *    the amount. Outlets see it through the desk like any public record and
 *    decide for themselves whether to cover it.
 * 2. A rival reads the reports and decides whether to complain.
 * 3. The state regulator's own review of filed reports, when nobody has
 *    complained by the end of its (generated, UNRESEARCHED) review period,
 *    opens the matter itself.
 *
 * Inside the campaign, a staff member keeping the books can go outside after
 * being ignored (`pressLedgerReviewHandler`).
 *
 * NOT BUILT: an outside accountant or auditor; a reporter who investigates
 * beyond the public record (the desk's source-tip route exists but nothing
 * seeds a tip about campaign money); the FEC's own review of federal reports;
 * prosecutors. Each is filed with the research queue as
 * `campaign-misconduct-detection-routes`.
 */
export function produceCampaignFinanceScrutiny(world: World): World {
  return produceRegulatorReview(
    produceRivalComplaints(
      linkLaterReportedPayments(produceCandidatePaymentReports(world)),
    ),
  );
}

/**
 * Payments reported after the matter opened join it while it is still open:
 * whoever is reviewing it reads the later reports too, so a finding covers
 * everything reported before it rather than only what the complaint named.
 */
function linkLaterReportedPayments(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  const matter = pressRecordByKey(
    world,
    "matter",
    candidatePaymentsMatterKey(campaign.id),
  );
  if (!matter) return world;
  const stillOpen = pressRecordsOfKind(world, "matter-proceeding").some(
    (proceeding) =>
      proceeding.matterId === matter.id &&
      !proceedingSteps(world, proceeding.id).some((step) => step.closes),
  );
  if (!stillOpen) return world;
  const reported = reportedCandidatePayments(world, campaign, playerId).map(
    (row) => row.occurrence,
  );
  return reported.length === 0
    ? world
    : openCandidatePaymentsMatter(
        world,
        campaign,
        playerId,
        reported,
        matter.originEventId,
      ).world;
}

function produceCandidatePaymentReports(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  const reports = world.history.events.filter(
    (event) =>
      event.type === CANDIDATE_PAYMENTS_REPORTED_EVENT &&
      event.involvedEntityIds.includes(campaign.organizationId),
  );
  const last = reports.at(-1);
  if (
    last &&
    addDays(last.occurredAt, CAMPAIGN_REPORT_INTERVAL_DAYS) > world.currentDate
  )
    return world;
  const reported = new Set(reports.flatMap((event) => event.involvedEntityIds));
  const flows = candidatePaymentOccurrences(
    world,
    campaign,
    playerId,
    addDays(world.currentDate, -DISBURSEMENT_FILING_LAG_DAYS),
  )
    .flatMap((occurrence) => occurrence.resourceFlowIds)
    .filter((flowId) => !reported.has(flowId));
  let total = 0;
  let currency: MoneyAmount["currency"] | null = null;
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (!flows.includes(outcome.resourceFlowId)) continue;
    if (outcome.status !== "completed") continue;
    total += outcome.transferredAmount.minorUnits;
    currency = outcome.transferredAmount.currency;
  }
  if (flows.length === 0 || total <= 0 || currency === null) return world;
  const candidate = personName(world.people[playerId]!);
  const dollars = `$${(total / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const count = flows.length === 1 ? "a payment" : `${flows.length} payments`;
  return recordWorldEvent(world, {
    stableKey: `press46:candidate-payments-report:${campaign.id}:${world.currentDate}`,
    type: CANDIDATE_PAYMENTS_REPORTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: sortedUnique([
      playerId,
      campaign.organizationId,
      ...flows,
    ]),
    participants: [
      {
        personId: playerId,
        role: "focus:payee",
        detail: "Named as the payee on the committee's report",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [PRESS_CONTRACT_VERSION, "campaign-finance:report"],
    summary: `The campaign committee for ${candidate} reported ${count} totaling ${dollars} to the candidate.`,
    context: {
      location: null,
      socialContext: "Campaign finance report",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * Payments to the candidate that have appeared on a public report, with the
 * date of the first report that carried each.
 */
function reportedCandidatePayments(
  world: World,
  campaign: CampaignRecord,
  candidateId: EntityId,
): readonly {
  readonly occurrence: FinancialOccurrenceRecord;
  readonly reportedAt: IsoDate;
}[] {
  const reports = world.history.events.filter(
    (event) =>
      event.type === CANDIDATE_PAYMENTS_REPORTED_EVENT &&
      event.involvedEntityIds.includes(campaign.organizationId),
  );
  return candidatePaymentOccurrences(
    world,
    campaign,
    candidateId,
    world.currentDate,
  ).flatMap((occurrence) => {
    const report = reports.find((event) =>
      occurrence.resourceFlowIds.some((flowId) =>
        event.involvedEntityIds.includes(flowId),
      ),
    );
    return report ? [{ occurrence, reportedAt: report.occurredAt }] : [];
  });
}

/**
 * The regulator's review of filed reports. A payment from a committee to its
 * own candidate is on the report; once the generated body's review period
 * has passed since the first such report and nobody has complained, the body
 * opens the matter itself, with no complainant. Federal campaigns are left to
 * the FEC's complaint route: its own report review is not built.
 */
function produceRegulatorReview(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  if (procedureForSubject(world, playerId, campaign) === "fec-enforcement")
    return world;
  if (
    pressRecordByKey(world, "matter", candidatePaymentsMatterKey(campaign.id))
  )
    return world;
  const body = generatedStateOversightBody(world, campaign.jurisdictionId);
  if (!body) return world;
  const reported = reportedCandidatePayments(world, campaign, playerId);
  const first = reported[0];
  if (
    !first ||
    addDays(first.reportedAt, body.reportReviewDays) > world.currentDate
  )
    return world;
  let next = recordWorldEvent(world, {
    stableKey: `press46:regulator-review:${campaign.id}`,
    type: "matter.report-review-flagged",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: sortedUnique([playerId, campaign.organizationId]),
    participants: [
      {
        personId: playerId,
        role: "focus:respondent",
        detail: "Payments to them were flagged in a report review",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [PRESS_CONTRACT_VERSION, "campaign-finance:review"],
    summary: `The ${body.name} flagged payments from a campaign committee to its candidate, ${personName(world.people[playerId]!)}, in its review of filed reports.`,
    context: {
      location: null,
      socialContext: body.name,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const flagged = next.history.events.at(-1)!;
  const opened = openCandidatePaymentsMatter(
    next,
    campaign,
    playerId,
    reported.map((row) => row.occurrence),
    flagged.id,
  );
  next = opened.world;
  return openProceeding(next, {
    stableKey: `${candidatePaymentsMatterKey(campaign.id)}:regulator-review`,
    matterId: opened.matter.id,
    procedureKey: "generated-state-oversight",
    complainantPersonId: null,
    respondentPersonIds: opened.matter.subjectPersonIds,
    openingEventId: flagged.id,
  }).world;
}

/**
 * A rival reading the committee's public reports sees money paid to the
 * candidate, whether or not anybody on the campaign keeps the books. Before
 * this, only a vendor payment could prompt a rival, so a candidate with no
 * staff and no vendors could take campaign money every week for a whole race
 * unseen (Nome, Alaska playtest, 2026-09-22). The rival decides again each
 * time a new payment appears on the reports.
 */
function produceCandidatePaymentComplaint(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  const stableKey = candidatePaymentsMatterKey(campaign.id);
  if (pressRecordByKey(world, "matter", stableKey)) return world;
  const occurrences = reportedCandidatePayments(world, campaign, playerId).map(
    (row) => row.occurrence,
  );
  if (occurrences.length === 0) return world;
  const decisionKey = `${stableKey}:rival-decision:${occurrences.length}`;
  if (
    world.history.decisionTraces.some(
      (t) => t.stableKey === `${decisionKey}:trace`,
    )
  )
    return world;
  const contest = requireElectionContest(world, campaign.contestId);
  const rivalId = contest.candidatePersonIds.find(
    (personId) => personId !== playerId && world.people[personId],
  );
  if (!rivalId) return world;
  const evaluation = evaluateDecision(world, {
    stableKey: decisionKey,
    decisionType: "press.rival-complaint",
    actorPersonId: rivalId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:opponent-filing",
      key: stableKey,
      entityId: campaign.filingEventId,
    },
    options: [
      {
        key: "file",
        label: "File a complaint",
        description: "Allege the payments to the candidate were personal use.",
      },
      {
        key: "no-action",
        label: "Do nothing",
        description: "Leave the filing alone.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "press:rivalry",
        optionKey: "file",
        sourceType: "context:electoral-competition",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The two are running against each other.",
        sourceRefs: [],
      },
      {
        stableKey: "press:payments-to-the-candidate",
        optionKey: "file",
        sourceType: "context:own-knowledge",
        direction: "supports",
        importance: occurrences.length > 1 ? "strong" : "moderate",
        confidence: "high",
        explanation:
          occurrences.length > 1
            ? `The committee's public reports show ${occurrences.length} payments to the candidate.`
            : "The committee's public report shows a payment to the candidate.",
        sourceRefs: [],
      },
      {
        stableKey: "press:could-be-reimbursement",
        optionKey: "no-action",
        sourceType: "context:own-knowledge",
        direction: "supports",
        importance: occurrences.length > 1 ? "slight" : "moderate",
        confidence: "medium",
        explanation:
          "A payment to a candidate can be a legitimate reimbursement.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  if (evaluation.selectedOptionKey !== "file") return next;
  const opened = openCandidatePaymentsMatter(
    next,
    campaign,
    playerId,
    occurrences,
    campaign.filingEventId,
  );
  next = opened.world;
  const player = personName(next.people[playerId]!);
  const allegation = recordAllegation(next, {
    stableKey: `${stableKey}:allegation`,
    matterId: opened.matter.id,
    allegerPersonId: rivalId,
    statement: `${player} paid themselves from campaign money for personal expenses`,
    publicAllegation: true,
    basisEventIds: [],
  });
  return fileComplaint(allegation.world, {
    stableKey: `${stableKey}:complaint`,
    matterId: opened.matter.id,
    complainantPersonId: rivalId,
    procedureKey: procedureForSubject(allegation.world, playerId, campaign),
  }).world;
}

function produceVendorPaymentComplaint(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  const stableKey = `press46:rival-complaint:${campaign.id}`;
  if (pressRecordByKey(world, "matter", stableKey)) return world;
  if (
    world.history.decisionTraces.some(
      (trace) => trace.stableKey === `${stableKey}:decision:trace`,
    )
  ) {
    return world;
  }
  const expenditure = world.history.resourceFlows.find(
    (flow) =>
      flow.basisKind === "custom:campaign-expenditure" &&
      flow.source.kind === "organization" &&
      flow.source.organizationId === campaign.organizationId &&
      flow.recipient.kind === "organization",
  );
  if (!expenditure) return world;
  const contest = requireElectionContest(world, campaign.contestId);
  const rivalId = contest.candidatePersonIds.find(
    (personId) => personId !== playerId && world.people[personId],
  );
  if (!rivalId) return world;
  const evaluation = evaluateDecision(world, {
    stableKey: `${stableKey}:decision`,
    decisionType: "press.rival-complaint",
    actorPersonId: rivalId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:opponent-filing",
      key: stableKey,
      entityId: campaign.filingEventId,
    },
    options: [
      {
        key: "file",
        label: "File a complaint",
        description: "Allege the payment was for personal use.",
      },
      {
        key: "no-action",
        label: "Do nothing",
        description: "Leave the filing alone.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "press:rivalry",
        optionKey: "file",
        sourceType: "context:electoral-competition",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The two are running against each other.",
        sourceRefs: [],
      },
      {
        stableKey: "press:no-visible-wrongdoing",
        optionKey: "no-action",
        sourceType: "context:own-knowledge",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The public filing shows an ordinary vendor payment.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  if (evaluation.selectedOptionKey !== "file") return next;
  return fileRivalComplaint(next, {
    stableKey,
    campaign,
    rivalId,
    playerId,
    expenditureFlowId: expenditure.id,
  });
}

export function fileRivalComplaint(
  world: World,
  input: {
    readonly stableKey: string;
    readonly campaign: CampaignRecord;
    readonly rivalId: EntityId;
    readonly playerId: EntityId;
    readonly expenditureFlowId: EntityId;
  },
): World {
  const record = ensureDisbursementRecord(world, input.expenditureFlowId);
  let next = record.world;
  const opened = openMatter(next, {
    stableKey: input.stableKey,
    family: "M1",
    subjectPersonIds: [input.playerId],
    occurrenceId: null,
    originEventId: input.campaign.filingEventId,
    jurisdictionId: input.campaign.jurisdictionId,
  });
  next = appendPressRecord(opened.world, "matter-evidence-link", {
    stableKey: `${input.stableKey}:disbursement`,
    matterId: opened.matter.id,
    evidenceArtifactId: record.artifactId,
    bearing: "context",
    linkedAt: opened.world.currentDate,
  }).world;
  const player = personName(next.people[input.playerId]!);
  const allegation = recordAllegation(next, {
    stableKey: `${input.stableKey}:allegation`,
    matterId: opened.matter.id,
    allegerPersonId: input.rivalId,
    statement: `${player}'s campaign paid for personal expenses with campaign money`,
    publicAllegation: true,
    basisEventIds: [],
  });
  const procedure = procedureForSubject(
    allegation.world,
    input.playerId,
    input.campaign,
  );
  return fileComplaint(allegation.world, {
    stableKey: `${input.stableKey}:complaint`,
    matterId: opened.matter.id,
    complainantPersonId: input.rivalId,
    procedureKey: procedure,
  }).world;
}

export interface ComplaintResponseInput {
  readonly proceedingId: EntityId;
  readonly choice: "counsel-responds" | "no-response";
}

/**
 * The one decision a respondent is asked to make. Counsel handles the rest
 * of the file; routine evidence administration never becomes a task list.
 */
export function respondToComplaint(
  world: World,
  input: ComplaintResponseInput,
): World {
  if (world.control.kind !== "person") throw new Error("No controlled person.");
  const personId = world.control.personId;
  const proceeding = requirePressRecord(
    world,
    "matter-proceeding",
    input.proceedingId,
  );
  if (!proceeding.respondentPersonIds.includes(personId)) {
    throw new Error("Only a respondent can answer this complaint.");
  }
  const last = proceedingSteps(world, proceeding.id).at(-1);
  if (
    !last ||
    (last.step !== "respondent-notified" && last.step !== "complaint-served")
  ) {
    throw new Error("The response window is not open.");
  }
  const key = `${proceeding.stableKey}:respondent-choice:${personId}`;
  if (world.history.events.some((event) => event.stableKey === key)) {
    throw new Error("You already chose how to respond.");
  }
  return recordWorldEvent(world, {
    stableKey: key,
    type:
      input.choice === "counsel-responds"
        ? "matter.response-filed"
        : "matter.response-not-filed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: sortedUnique([personId, proceeding.id]),
    participants: [
      {
        personId,
        role: "agency:respondent",
        detail:
          input.choice === "counsel-responds"
            ? "Had counsel file a response"
            : "Chose not to file a response",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [PRESS_CONTRACT_VERSION, `${PRESS_MATTER_TAG}${proceeding.matterId}`],
    summary:
      input.choice === "counsel-responds"
        ? `Counsel filed a response to the ${proceeding.institutionLabel} on your behalf.`
        : `You did not file a response with the ${proceeding.institutionLabel}. Not responding is not an admission.`,
    context: {
      location: null,
      socialContext: proceeding.institutionLabel,
      pressure: null,
      choice: input.choice,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export function mattersForSubject(
  world: World,
  personId: EntityId,
): readonly MatterRecord[] {
  return pressRecordsOfKind(world, "matter").filter((matter) =>
    matter.subjectPersonIds.includes(personId),
  );
}

export function matterEvents(
  world: World,
  matterId: EntityId,
): readonly HistoricalEvent[] {
  return world.history.events.filter((event) =>
    event.tags.includes(`${PRESS_MATTER_TAG}${matterId}`),
  );
}
