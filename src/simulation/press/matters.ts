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
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
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
  return "simulated-inquiry";
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
  const stableKey = `press46:disbursement-record:${flowId}`;
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
 * A rival candidate may file a complaint about an expense they can see in the
 * other committee's public filings. The rival cannot see private books, so
 * this complaint is about a real, legitimate payment: the matter has no
 * occurrence, and the procedure should dismiss it.
 */
export function produceRivalComplaints(world: World): World {
  if (world.control.kind !== "person") return world;
  const playerId = world.control.personId;
  const campaign = activeCampaignForCandidate(world, playerId);
  if (!campaign) return world;
  const stableKey = `press46:rival-complaint:${campaign.id}`;
  if (pressRecordByKey(world, "matter", stableKey)) return world;
  if (
    world.history.decisionTraces.some(
      (trace) => trace.stableKey === `${stableKey}:decision`,
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
