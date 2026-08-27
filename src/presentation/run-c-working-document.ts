import {
  assertWorldIntegrity,
  createExactQuantity,
  directPolicyImplementationFactor,
  makeIsoDate,
  money,
  recordPolicyAlternative,
  recordPolicyAnalysisKnowledge,
  recordPolicyBaseline,
  recordPolicyEstimate,
  recordPolicyImplementationProfile,
  recordPolicyOperation,
  recordPolicyProjectionRoot,
  recordWorldEvent,
  stableHash,
  worldMetricDefinitionByStableKey,
} from "../simulation";
import type {
  EntityId,
  EventKnowledgeRecord,
  MetricReferencePeriod,
  MetricScope,
  PolicyEstimateRecord,
  PolicyImplementationFactor,
  PolicyOperationRecord,
  World,
  WorldMetricValue,
} from "../simulation";
import { createRunBFixture, type RunBFixture } from "./run-b-fixture";
import type { RunCLegislativeConversationProgress } from "./run-b-conversation-progress";

export const RUN_C_DOCUMENT_STABLE_KEY =
  "run-c:working-document:transit-access-pilot";
export const RUN_C_WIDE_VARIANT_KEY = "pilot-cap-8m";
export const RUN_C_NARROW_VARIANT_KEY = "pilot-cap-4m";
export const RUN_C_REVISION_EVENT_STABLE_KEY = `${RUN_C_DOCUMENT_STABLE_KEY}:select-narrow`;
export const RUN_C_TARGET_SEGMENT_KEY = "transit.pilot-eligible-riders";
export const RUN_C_HIDDEN_ANALYSIS_TEXT =
  "Internal sensitivity case: uptake could reduce modeled delivery to one half.";

const AUTHORED = {
  kind: "authored" as const,
  note: "Synthetic Stage 6.5 Run C working-document fixture.",
};

export type RunCWorkingDocumentId = `working-document_${string}`;
export type RunCProvisionId = `working-provision_${string}`;
export type RunCSelectionId = `working-selection_${string}`;
export type RunCAnnotationId = `working-annotation_${string}`;
export type RunCVariantKey =
  typeof RUN_C_WIDE_VARIANT_KEY | typeof RUN_C_NARROW_VARIANT_KEY;

export interface RunCLegalTextSegment {
  readonly kind: "text" | "selection";
  readonly text: string;
  readonly selectionId: RunCSelectionId | null;
}

export interface RunCWorkingProvision {
  readonly id: RunCProvisionId;
  readonly stableKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly segments: readonly RunCLegalTextSegment[];
  readonly policyAlternativeId: EntityId | null;
  readonly policyOperationId: EntityId | null;
  readonly targetScope: MetricScope | null;
}

export interface RunCWorkingDocumentVariant {
  readonly key: RunCVariantKey;
  readonly label: string;
  readonly amountMinorUnits: number;
  readonly amountDisplay: string;
  readonly policyAlternativeId: EntityId;
  readonly policyOperationId: EntityId;
  readonly policyEstimateId: EntityId;
  readonly provisions: readonly RunCWorkingProvision[];
}

export interface RunCWorkingAnnotation {
  readonly id: RunCAnnotationId;
  readonly selectionId: RunCSelectionId;
  readonly authorPersonId: EntityId;
  readonly label: string;
  readonly teaser: string;
}

export interface RunCWorkingDocumentDefinition {
  readonly id: RunCWorkingDocumentId;
  readonly stableKey: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly jurisdictionLabel: string;
  readonly quantitativeProvisionId: RunCProvisionId;
  readonly amountSelectionId: RunCSelectionId;
  readonly preparedByPersonId: EntityId;
  readonly variants: Readonly<
    Record<RunCVariantKey, RunCWorkingDocumentVariant>
  >;
  readonly annotations: readonly RunCWorkingAnnotation[];
}

export interface RunCPolicyFixtureIds {
  readonly baselineId: EntityId;
  readonly wideAlternativeId: EntityId;
  readonly wideOperationId: EntityId;
  readonly wideEstimateId: EntityId;
  readonly narrowAlternativeId: EntityId;
  readonly narrowOperationId: EntityId;
  readonly narrowEstimateId: EntityId;
  readonly hiddenEstimateId: EntityId;
}

export interface RunCFixture extends RunBFixture {
  readonly document: RunCWorkingDocumentDefinition;
  readonly policy: RunCPolicyFixtureIds;
  readonly legislativeRoomContext: RunBFixture["roomContext"];
}

export interface RunCStaffAnalysisProjection {
  readonly variantKey: RunCVariantKey;
  readonly authorPersonId: EntityId;
  readonly authorLabel: string;
  readonly provenanceLabel: string;
  readonly qualification: string;
  readonly modeledChange: string;
  readonly scopeLabel: string;
  readonly knowledgeId: EntityId;
}

export interface RunCDocumentProjection {
  readonly activeVariantKey: RunCVariantKey;
  readonly activeVariant: RunCWorkingDocumentVariant;
  readonly preparedVariant: RunCWorkingDocumentVariant;
  readonly staffAnalyses: readonly RunCStaffAnalysisProjection[];
  readonly revisionCommitted: boolean;
}

export function createRunCFixture(): RunCFixture {
  const runB = createRunBFixture();
  let world = runB.world;
  const jurisdictionId = runB.roomContext.jurisdictionId;
  const collinsPersonId = runB.scenePerson.personId;
  const metric = worldMetricDefinitionByStableKey(world, "government.outlays");
  const targetScope: MetricScope = {
    jurisdictionId,
    segmentKey: RUN_C_TARGET_SEGMENT_KEY,
  };
  const targetPeriod: MetricReferencePeriod = {
    kind: "interval",
    startsAt: makeIsoDate("2026-07-01"),
    endsAt: makeIsoDate("2027-06-30"),
  };

  world = recordPolicyBaseline(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:outlay-baseline`,
    seriesKey: "baseline:transit-access-pilot-outlays",
    metricId: metric.id,
    scope: targetScope,
    referencePeriod: targetPeriod,
    expectedValue: moneyValue(12_000_000_000),
    generatedAt: world.currentDate,
    recordedAt: world.currentDate,
    sourceEntityIds: [runB.officeEventId],
    methodologyKey: "forecast:synthetic-office-scenario",
    assumptionKeys: ["assumption:no-policy-realization"],
    uncertainty: { kind: "none" },
    provenance: AUTHORED,
    supersedesBaselineId: null,
  });
  const baselineId = requiredLast(world.history.policyBaselines, "baseline").id;

  const wide = recordPreparedVariant(world, {
    key: RUN_C_WIDE_VARIANT_KEY,
    title: "Transit Access Pilot — $8,000,000 working version",
    summary:
      "A synthetic office-draft alternative modeling an $8,000,000 transit-access pilot outlay.",
    amountMinorUnits: 800_000_000,
    baselineId,
    metricId: metric.id,
    targetScope,
    targetPeriod,
  });
  world = wide.world;

  const narrow = recordPreparedVariant(world, {
    key: RUN_C_NARROW_VARIANT_KEY,
    title: "Transit Access Pilot — $4,000,000 prepared version",
    summary:
      "A synthetic office-draft alternative modeling a narrower $4,000,000 transit-access pilot outlay.",
    amountMinorUnits: 400_000_000,
    baselineId,
    metricId: metric.id,
    targetScope,
    targetPeriod,
  });
  world = narrow.world;

  world = recordHiddenSensitivityEstimate(world, {
    alternativeId: wide.alternativeId,
    operationId: wide.operationId,
    baselineId,
  });
  const hiddenEstimateId = requiredLast(
    world.history.policyEstimates,
    "hidden estimate",
  ).id;

  world = recordPolicyAnalysisKnowledge(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:collins-analysis-wide`,
    personId: collinsPersonId,
    estimateId: wide.estimateId,
    summary:
      "Andre Collins reviewed the staff projection for the current Transit Access Pilot working provision.",
    believedSummary:
      "The $8,000,000 working provision is a proposal-level ceiling whose modeled outlay remains a projection, not an appropriation or implementation.",
    accuracy: "accurate",
    confidence: "medium",
    visibility: "limited",
  });
  world = recordPolicyAnalysisKnowledge(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:collins-analysis-narrow`,
    personId: collinsPersonId,
    estimateId: narrow.estimateId,
    summary:
      "Andre Collins reviewed the staff projection for the prepared narrower Transit Access Pilot provision.",
    believedSummary:
      "The prepared $4,000,000 provision models half the maximum outlay for the same target scope while remaining only a working proposal.",
    accuracy: "accurate",
    confidence: "medium",
    visibility: "limited",
  });

  const document = createDocumentDefinition({
    collinsPersonId,
    jurisdictionId,
    baselineId,
    wide,
    narrow,
  });
  const physicallyPresentPersonIds =
    runB.roomContext.physicallyPresentPersonIds;
  const legislativeRoomContext: RunBFixture["roomContext"] = {
    ...runB.roomContext,
    sceneKey: "run-c:lexington-office:transit-provision",
    eligibleAddresseePersonIds: [collinsPersonId],
    normalHearingPersonIds: runB.roomContext.normalHearingPersonIds,
    physicallyPresentPersonIds,
    activeParticipantPersonIds: physicallyPresentPersonIds,
    privateAvailable: false,
    privateUnavailableReason:
      "Private isn't possible while Reed remains within plausible earshot.",
  };
  assertWorldIntegrity(world);

  return {
    ...runB,
    world,
    document,
    policy: {
      baselineId,
      wideAlternativeId: wide.alternativeId,
      wideOperationId: wide.operationId,
      wideEstimateId: wide.estimateId,
      narrowAlternativeId: narrow.alternativeId,
      narrowOperationId: narrow.operationId,
      narrowEstimateId: narrow.estimateId,
      hiddenEstimateId,
    },
    legislativeRoomContext,
  };
}

export function projectRunCWorkingDocument(
  world: World,
  fixture: RunCFixture,
): RunCDocumentProjection {
  validateDocumentWorld(world, fixture);
  const revision = world.history.events.find(
    (event) => event.stableKey === RUN_C_REVISION_EVENT_STABLE_KEY,
  );
  if (revision) {
    const expected = [
      fixture.playerPersonId,
      fixture.roomContext.jurisdictionId,
      fixture.policy.wideAlternativeId,
      fixture.policy.wideOperationId,
      fixture.policy.narrowAlternativeId,
      fixture.policy.narrowOperationId,
    ].sort();
    if (
      JSON.stringify(revision.involvedEntityIds) !== JSON.stringify(expected)
    ) {
      throw new Error("Run C working-draft revision has malformed linkage.");
    }
  }
  const activeVariantKey = revision
    ? RUN_C_NARROW_VARIANT_KEY
    : RUN_C_WIDE_VARIANT_KEY;
  const preparedVariantKey =
    activeVariantKey === RUN_C_WIDE_VARIANT_KEY
      ? RUN_C_NARROW_VARIANT_KEY
      : RUN_C_WIDE_VARIANT_KEY;

  return {
    activeVariantKey,
    activeVariant: fixture.document.variants[activeVariantKey],
    preparedVariant: fixture.document.variants[preparedVariantKey],
    staffAnalyses: (
      [RUN_C_WIDE_VARIANT_KEY, RUN_C_NARROW_VARIANT_KEY] as const
    ).flatMap((variantKey) => {
      const variant = fixture.document.variants[variantKey];
      const knowledge = policyAnalysisKnowledgeFor(
        world,
        fixture.playerPersonId,
        variant.policyEstimateId,
      );
      return knowledge
        ? [projectKnownAnalysis(world, fixture, variant, knowledge)]
        : [];
    }),
    revisionCommitted: revision !== undefined,
  };
}

export function recordRunCPlayerAnalysisReview(
  inputWorld: World,
  fixture: RunCFixture,
): World {
  validateDocumentWorld(inputWorld, fixture);
  let world = inputWorld;
  const variants = [
    fixture.document.variants[RUN_C_WIDE_VARIANT_KEY],
    fixture.document.variants[RUN_C_NARROW_VARIANT_KEY],
  ];
  for (const variant of variants) {
    if (
      policyAnalysisKnowledgeFor(
        world,
        fixture.playerPersonId,
        variant.policyEstimateId,
      )
    ) {
      continue;
    }
    world = recordPolicyAnalysisKnowledge(world, {
      stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:player-analysis:${variant.key}`,
      personId: fixture.playerPersonId,
      estimateId: variant.policyEstimateId,
      summary: `Cameron Foster reviewed Collins's staff projection for the ${variant.amountDisplay} Transit Access Pilot working provision.`,
      believedSummary: `Collins's analysis treats the ${variant.amountDisplay} amount as a projected maximum outlay for the same eligible-rider scope, not as enacted or implemented policy.`,
      accuracy: "accurate",
      confidence: "medium",
      visibility: "private",
    });
  }
  assertWorldIntegrity(world);
  return world;
}

export function createRunCLegislativeConversationProgress(
  world: World,
  fixture: RunCFixture,
): RunCLegislativeConversationProgress {
  validateDocumentWorld(world, fixture);
  const current = projectRunCWorkingDocument(world, fixture).activeVariant;
  const prepared =
    current.key === RUN_C_WIDE_VARIANT_KEY
      ? fixture.document.variants[RUN_C_NARROW_VARIANT_KEY]
      : fixture.document.variants[RUN_C_WIDE_VARIANT_KEY];
  const collinsKnowledge = policyAnalysisKnowledgeFor(
    world,
    fixture.scenePerson.personId,
    current.policyEstimateId,
  );
  if (!collinsKnowledge) {
    throw new Error(
      "Run C legislative discussion requires Collins's analysis knowledge.",
    );
  }
  if (
    current.amountDisplay !== "$8,000,000" ||
    prepared.amountDisplay !== "$4,000,000"
  ) {
    throw new Error(
      "The bounded Run C discussion is available before revision only.",
    );
  }
  return {
    subject: "transit-access-pilot-provision",
    subjectFacts: {
      documentId: fixture.document.id,
      provisionId: fixture.document.quantitativeProvisionId,
      selectionId: fixture.document.amountSelectionId,
      currentAmount: "$8,000,000",
      preparedAmount: "$4,000,000",
      currentAlternativeId: current.policyAlternativeId,
      currentOperationId: current.policyOperationId,
      currentEstimateId: current.policyEstimateId,
      preparedAlternativeId: prepared.policyAlternativeId,
      preparedOperationId: prepared.policyOperationId,
      preparedEstimateId: prepared.policyEstimateId,
      analysisKnowledgeId: collinsKnowledge.id,
      targetScopeLabel:
        "Lexington transit-pilot eligible-rider segment for the twelve-month pilot period",
    },
    phase: "opening",
    latestProposition: null,
    pendingContributions: [],
    silenceSettled: true,
  };
}

export function commitRunCWorkingDraftRevision(
  inputWorld: World,
  fixture: RunCFixture,
): World {
  const projection = projectRunCWorkingDocument(inputWorld, fixture);
  if (projection.revisionCommitted) {
    throw new Error(
      "The prepared working-draft revision was already selected.",
    );
  }
  const narrow = fixture.document.variants[RUN_C_NARROW_VARIANT_KEY];
  const wide = fixture.document.variants[RUN_C_WIDE_VARIANT_KEY];
  assertVariantOperation(inputWorld, wide);
  assertVariantOperation(inputWorld, narrow);

  const world = recordWorldEvent(inputWorld, {
    stableKey: RUN_C_REVISION_EVENT_STABLE_KEY,
    type: "office.working-draft-revised",
    occurredAt: inputWorld.currentDate,
    recordedAt: inputWorld.currentDate,
    jurisdictionId: fixture.roomContext.jurisdictionId,
    involvedEntityIds: [
      fixture.playerPersonId,
      fixture.roomContext.jurisdictionId,
      wide.policyAlternativeId,
      wide.policyOperationId,
      narrow.policyAlternativeId,
      narrow.policyOperationId,
    ].sort(),
    participants: [
      {
        personId: fixture.playerPersonId,
        role: "agency:office-draft-instruction",
        detail:
          "Selected the prepared narrower provision for the office working draft.",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["office.working-draft", "policy.proposal", "run-c.document"],
    summary:
      "Cameron Foster instructed staff to use the prepared $4,000,000 provision in the Transit Access Pilot office working draft.",
    context: {
      location: {
        jurisdictionId: fixture.roomContext.jurisdictionId,
        label: fixture.roomContext.locationLabel,
        setting: "Synthetic Stage 6.5 legislative working-document fixture",
      },
      socialContext:
        "An office working-draft instruction after reviewing legal text and a prepared alternative.",
      pressure:
        "The office needed one current version for continued staff drafting.",
      choice:
        "Use the prepared $4,000,000 provision instead of the current $8,000,000 provision.",
      motivation:
        "Continue drafting around a narrower proposal while preserving the same policy topic and target scope.",
      immediateReaction:
        "The office working copy now displays the prepared narrower language for continued review.",
    },
  });
  assertWorldIntegrity(world);
  return world;
}

export function policyAnalysisKnowledgeFor(
  world: World,
  personId: EntityId,
  estimateId: EntityId,
): EventKnowledgeRecord | null {
  return (
    world.history.knowledge.find((knowledge) => {
      if (knowledge.personId !== personId) return false;
      const event = world.history.events.find(
        (candidate) => candidate.id === knowledge.eventId,
      );
      return (
        event?.type === "policy.analysis-reviewed" &&
        event.involvedEntityIds.includes(estimateId)
      );
    }) ?? null
  );
}

function recordPreparedVariant(
  inputWorld: World,
  input: {
    readonly key: RunCVariantKey;
    readonly title: string;
    readonly summary: string;
    readonly amountMinorUnits: number;
    readonly baselineId: EntityId;
    readonly metricId: EntityId;
    readonly targetScope: MetricScope;
    readonly targetPeriod: MetricReferencePeriod;
  },
): {
  readonly world: World;
  readonly alternativeId: EntityId;
  readonly operationId: EntityId;
  readonly estimateId: EntityId;
} {
  let world = recordPolicyAlternative(inputWorld, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:alternative:${input.key}`,
    alternativeKind: "proposal:legislative-working-draft",
    title: input.title,
    summary: input.summary,
    propositionId: null,
    proposedAt: inputWorld.currentDate,
    recordedAt: inputWorld.currentDate,
    provenance: AUTHORED,
  });
  const alternativeId = requiredLast(
    world.history.policyAlternatives,
    `${input.key} alternative`,
  ).id;
  world = recordPolicyOperation(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:operation:${input.key}`,
    alternativeId,
    targetMetricId: input.metricId,
    targetScope: input.targetScope,
    targetReferencePeriod: input.targetPeriod,
    targetBaselineId: input.baselineId,
    operation: {
      kind: "absolute-change",
      direction: "increase",
      magnitude: moneyValue(input.amountMinorUnits),
    },
    trigger: null,
    mechanismDefinitionId: world.causalMechanismCatalog.definitionOrder[0]!,
    realizationKind: "policy:quantitative-operation",
    timing: {
      startsAt: "2026-07-01",
      maturesAt: "2026-07-01",
      endsAt: "2027-07-01",
    },
    recordedAt: world.currentDate,
    provenance: AUTHORED,
  });
  const operationId = requiredLast(
    world.history.policyOperations,
    `${input.key} operation`,
  ).id;
  world = recordPolicyImplementationProfile(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:profile:${input.key}`,
    alternativeId,
    operationIds: [operationId],
    factors: fullHypotheticalFactors([input.baselineId]),
    assessedAt: world.currentDate,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
  });
  const profileId = requiredLast(
    world.history.policyImplementationProfiles,
    `${input.key} profile`,
  ).id;
  world = recordPolicyProjectionRoot(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:projection:${input.key}`,
    alternativeId,
    operationIds: [operationId],
    effectiveAt: world.currentDate,
    recordedAt: world.currentDate,
  });
  const projectedCausalProcessId = requiredLast(
    world.history.causalProcesses,
    `${input.key} projected root`,
  ).id;
  world = recordPolicyEstimate(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:estimate:${input.key}`,
    seriesKey: `estimate:transit-access-${input.key}`,
    alternativeId,
    operationIds: [operationId],
    implementationProfileId: profileId,
    projectedCausalProcessId,
    generatedAt: world.currentDate,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
    supersedesEstimateId: null,
  });
  return {
    world,
    alternativeId,
    operationId,
    estimateId: requiredLast(
      world.history.policyEstimates,
      `${input.key} estimate`,
    ).id,
  };
}

function recordHiddenSensitivityEstimate(
  inputWorld: World,
  input: {
    readonly alternativeId: EntityId;
    readonly operationId: EntityId;
    readonly baselineId: EntityId;
  },
): World {
  const half = createExactQuantity(1, 2, "rate:share");
  const factors = fullHypotheticalFactors([input.baselineId]).map((factor) =>
    factor.kind === "uptake-participation"
      ? directPolicyImplementationFactor({
          kind: factor.kind,
          share: half,
          reasonKey: "implementation:hidden-sensitivity",
          explanation: RUN_C_HIDDEN_ANALYSIS_TEXT,
          evidenceEntityIds: [input.baselineId],
        })
      : factor,
  );
  let world = recordPolicyImplementationProfile(inputWorld, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:profile:hidden-sensitivity`,
    alternativeId: input.alternativeId,
    operationIds: [input.operationId],
    factors,
    assessedAt: inputWorld.currentDate,
    recordedAt: inputWorld.currentDate,
    provenance: AUTHORED,
  });
  const profileId = requiredLast(
    world.history.policyImplementationProfiles,
    "hidden profile",
  ).id;
  world = recordPolicyProjectionRoot(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:projection:hidden-sensitivity`,
    alternativeId: input.alternativeId,
    operationIds: [input.operationId],
    effectiveAt: world.currentDate,
    recordedAt: world.currentDate,
  });
  const projectedCausalProcessId = requiredLast(
    world.history.causalProcesses,
    "hidden projected root",
  ).id;
  return recordPolicyEstimate(world, {
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:estimate:hidden-sensitivity`,
    seriesKey: "estimate:transit-access-hidden-sensitivity",
    alternativeId: input.alternativeId,
    operationIds: [input.operationId],
    implementationProfileId: profileId,
    projectedCausalProcessId,
    generatedAt: world.currentDate,
    recordedAt: world.currentDate,
    provenance: AUTHORED,
    supersedesEstimateId: null,
  });
}

function createDocumentDefinition(input: {
  readonly collinsPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly baselineId: EntityId;
  readonly wide: {
    readonly alternativeId: EntityId;
    readonly operationId: EntityId;
    readonly estimateId: EntityId;
  };
  readonly narrow: {
    readonly alternativeId: EntityId;
    readonly operationId: EntityId;
    readonly estimateId: EntityId;
  };
}): RunCWorkingDocumentDefinition {
  const documentId = stablePresentationId(
    "working-document",
    RUN_C_DOCUMENT_STABLE_KEY,
  );
  const amountSelectionId = stablePresentationId(
    "working-selection",
    `${RUN_C_DOCUMENT_STABLE_KEY}:section-3:pilot-cap`,
  );
  const quantitativeProvisionId = stablePresentationId(
    "working-provision",
    `${RUN_C_DOCUMENT_STABLE_KEY}:section-3`,
  );
  const variants = {
    [RUN_C_WIDE_VARIANT_KEY]: createVariant({
      key: RUN_C_WIDE_VARIANT_KEY,
      label: "Current office working draft",
      amountMinorUnits: 800_000_000,
      amountDisplay: "$8,000,000",
      alternativeId: input.wide.alternativeId,
      operationId: input.wide.operationId,
      estimateId: input.wide.estimateId,
      targetScope: {
        jurisdictionId: input.jurisdictionId,
        segmentKey: RUN_C_TARGET_SEGMENT_KEY,
      },
      amountSelectionId,
      quantitativeProvisionId,
    }),
    [RUN_C_NARROW_VARIANT_KEY]: createVariant({
      key: RUN_C_NARROW_VARIANT_KEY,
      label: "Prepared narrower version",
      amountMinorUnits: 400_000_000,
      amountDisplay: "$4,000,000",
      alternativeId: input.narrow.alternativeId,
      operationId: input.narrow.operationId,
      estimateId: input.narrow.estimateId,
      targetScope: {
        jurisdictionId: input.jurisdictionId,
        segmentKey: RUN_C_TARGET_SEGMENT_KEY,
      },
      amountSelectionId,
      quantitativeProvisionId,
    }),
  } satisfies Record<RunCVariantKey, RunCWorkingDocumentVariant>;

  return {
    id: documentId,
    stableKey: RUN_C_DOCUMENT_STABLE_KEY,
    title: "Working Draft — Transit Access Pilot",
    statusLabel: "Office working draft · not introduced",
    jurisdictionLabel: "Lexington synthetic development fixture",
    quantitativeProvisionId,
    amountSelectionId,
    preparedByPersonId: input.collinsPersonId,
    variants,
    annotations: [
      {
        id: stablePresentationId(
          "working-annotation",
          `${RUN_C_DOCUMENT_STABLE_KEY}:collins:fiscal-note`,
        ),
        selectionId: amountSelectionId,
        authorPersonId: input.collinsPersonId,
        label: "Collins · staff projection attached",
        teaser:
          "The note compares the current ceiling with the prepared narrower version. Read it to add the analysis to Cameron's known record.",
      },
    ],
  };
}

function createVariant(input: {
  readonly key: RunCVariantKey;
  readonly label: string;
  readonly amountMinorUnits: number;
  readonly amountDisplay: string;
  readonly alternativeId: EntityId;
  readonly operationId: EntityId;
  readonly estimateId: EntityId;
  readonly targetScope: MetricScope;
  readonly amountSelectionId: RunCSelectionId;
  readonly quantitativeProvisionId: RunCProvisionId;
}): RunCWorkingDocumentVariant {
  return {
    key: input.key,
    label: input.label,
    amountMinorUnits: input.amountMinorUnits,
    amountDisplay: input.amountDisplay,
    policyAlternativeId: input.alternativeId,
    policyOperationId: input.operationId,
    policyEstimateId: input.estimateId,
    provisions: [
      simpleProvision(
        1,
        "Purpose and construction",
        "This working draft proposes a twelve-month pilot to improve practical access to fixed-route public transportation. Nothing in this draft takes legal effect unless adopted through a later authorized process.",
      ),
      simpleProvision(
        2,
        "Pilot establishment and eligibility",
        "The proposed pilot would support Lexington residents whose access to fixed-route transit is limited by household cost or mobility barriers, under eligibility standards stated in a later administering instrument.",
      ),
      {
        id: input.quantitativeProvisionId,
        stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:section-3`,
        sectionNumber: 3,
        heading: "Pilot support limit",
        segments: [
          {
            kind: "text",
            text: "For the pilot period, participant fares, route-access assistance, and necessary administration may be supported in an aggregate amount not to exceed ",
            selectionId: null,
          },
          {
            kind: "selection",
            text: input.amountDisplay,
            selectionId: input.amountSelectionId,
          },
          {
            kind: "text",
            text: ".",
            selectionId: null,
          },
        ],
        policyAlternativeId: input.alternativeId,
        policyOperationId: input.operationId,
        targetScope: { ...input.targetScope },
      },
      simpleProvision(
        4,
        "Proposed timing and review",
        "The pilot proposed by this working draft would begin no earlier than July 1, 2026, continue for twelve months, and receive an office review before any recommendation for continuation.",
      ),
    ],
  };
}

function simpleProvision(
  sectionNumber: number,
  heading: string,
  text: string,
): RunCWorkingProvision {
  return {
    id: stablePresentationId(
      "working-provision",
      `${RUN_C_DOCUMENT_STABLE_KEY}:section-${sectionNumber}`,
    ),
    stableKey: `${RUN_C_DOCUMENT_STABLE_KEY}:section-${sectionNumber}`,
    sectionNumber,
    heading,
    segments: [{ kind: "text", text, selectionId: null }],
    policyAlternativeId: null,
    policyOperationId: null,
    targetScope: null,
  };
}

function projectKnownAnalysis(
  world: World,
  fixture: RunCFixture,
  variant: RunCWorkingDocumentVariant,
  knowledge: EventKnowledgeRecord,
): RunCStaffAnalysisProjection {
  const estimate = requireEstimate(world, variant.policyEstimateId);
  const consequence = estimate.consequences.find(
    (candidate) => candidate.operationId === variant.policyOperationId,
  );
  if (!consequence || consequence.estimatedChange.kind !== "money") {
    throw new Error("Run C estimate is missing its money consequence.");
  }
  return {
    variantKey: variant.key,
    authorPersonId: fixture.scenePerson.personId,
    authorLabel: "Andre Collins · staff analysis",
    provenanceLabel: "Known through an explicit policy-analysis review",
    qualification:
      "Projection under the fixture assumptions. This is not an appropriation, enactment, or guarantee of implementation.",
    modeledChange: `${formatMoneyMinorUnits(consequence.estimatedChange.money.minorUnits)} in modeled added outlays`,
    scopeLabel:
      "Lexington · transit pilot eligible-rider scope · twelve-month pilot period",
    knowledgeId: knowledge.id,
  };
}

function validateDocumentWorld(world: World, fixture: RunCFixture): void {
  assertWorldIntegrity(world);
  if (
    world.id !== fixture.world.id ||
    world.control.kind !== "person" ||
    world.control.personId !== fixture.playerPersonId
  ) {
    throw new Error("Run C document does not match the controlled World.");
  }
  assertVariantOperation(
    world,
    fixture.document.variants[RUN_C_WIDE_VARIANT_KEY],
  );
  assertVariantOperation(
    world,
    fixture.document.variants[RUN_C_NARROW_VARIANT_KEY],
  );
}

function assertVariantOperation(
  world: World,
  variant: RunCWorkingDocumentVariant,
): void {
  const operation = world.history.policyOperations.find(
    (candidate) => candidate.id === variant.policyOperationId,
  );
  const provision = variant.provisions.find(
    (candidate) => candidate.policyOperationId === variant.policyOperationId,
  );
  if (
    !operation ||
    !provision?.targetScope ||
    operation.alternativeId !== variant.policyAlternativeId ||
    operation.operation.kind !== "absolute-change" ||
    operation.operation.direction !== "increase" ||
    operation.operation.magnitude.kind !== "money" ||
    operation.operation.magnitude.money.minorUnits !==
      variant.amountMinorUnits ||
    operation.operation.magnitude.money.currency !== "USD" ||
    operation.targetScope.jurisdictionId !==
      provision.targetScope.jurisdictionId ||
    operation.targetScope.segmentKey !== provision.targetScope.segmentKey ||
    provision.targetScope.segmentKey !== RUN_C_TARGET_SEGMENT_KEY
  ) {
    throw new Error(
      `Run C variant has malformed policy linkage: ${variant.key}`,
    );
  }
}

function requireEstimate(world: World, id: EntityId): PolicyEstimateRecord {
  const estimate = world.history.policyEstimates.find(
    (candidate) => candidate.id === id,
  );
  if (!estimate) throw new Error(`Missing Run C policy estimate: ${id}`);
  return estimate;
}

function fullHypotheticalFactors(
  evidenceEntityIds: readonly EntityId[],
): readonly PolicyImplementationFactor[] {
  return [
    "authority",
    "funding",
    "administrative-capacity",
    "enforcement-compliance",
    "uptake-participation",
  ].map((kind) =>
    directPolicyImplementationFactor({
      kind: kind as PolicyImplementationFactor["kind"],
      share: createExactQuantity(1, 1, "rate:share"),
      reasonKey: `implementation:hypothetical-${kind}`,
      explanation:
        "A full-share synthetic modeling assumption for projection only; it is not evidence of legal authority or actual implementation.",
      evidenceEntityIds,
    }),
  );
}

function moneyValue(minorUnits: number): WorldMetricValue {
  return { kind: "money", money: money(minorUnits, "USD") };
}

function formatMoneyMinorUnits(minorUnits: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

function requiredLast<T>(values: readonly T[], label: string): T {
  const value = values.at(-1);
  if (!value) throw new Error(`Run C fixture is missing ${label}.`);
  return value;
}

function stablePresentationId(
  namespace: "working-document",
  stableKey: string,
): RunCWorkingDocumentId;
function stablePresentationId(
  namespace: "working-provision",
  stableKey: string,
): RunCProvisionId;
function stablePresentationId(
  namespace: "working-selection",
  stableKey: string,
): RunCSelectionId;
function stablePresentationId(
  namespace: "working-annotation",
  stableKey: string,
): RunCAnnotationId;
function stablePresentationId(
  namespace:
    | "working-document"
    | "working-provision"
    | "working-selection"
    | "working-annotation",
  stableKey: string,
):
  RunCWorkingDocumentId | RunCProvisionId | RunCSelectionId | RunCAnnotationId {
  return `${namespace}_${stableHash(`${namespace}:v1:${stableKey}`)}` as
    | RunCWorkingDocumentId
    | RunCProvisionId
    | RunCSelectionId
    | RunCAnnotationId;
}

export function runCOperationForVariant(
  world: World,
  variant: RunCWorkingDocumentVariant,
): PolicyOperationRecord {
  const operation = world.history.policyOperations.find(
    (candidate) => candidate.id === variant.policyOperationId,
  );
  if (!operation) throw new Error("Run C policy operation is missing.");
  return operation;
}
