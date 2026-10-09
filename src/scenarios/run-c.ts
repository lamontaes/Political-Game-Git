import {
  assertWorldIntegrity,
  createExactQuantity,
  directPolicyImplementationFactor,
  makeIsoDate,
  money,
  personName,
  recordPolicyAlternative,
  recordPolicyAnalysisKnowledge,
  recordPolicyBaseline,
  recordPolicyEstimate,
  recordPolicyImplementationProfile,
  recordPolicyOperation,
  recordPolicyProjectionRoot,
  stableHash,
  worldMetricDefinitionByStableKey,
} from "../simulation";
import type {
  EntityId,
  MetricReferencePeriod,
  MetricScope,
  PolicyImplementationFactor,
  World,
  WorldMetricValue,
} from "../simulation";
import { createRunBFixture } from "./run-b";
import type { RunBFixture } from "../presentation/office-scene-context";
import {
  RUN_C_DOCUMENT_STABLE_KEY,
  RUN_C_WIDE_VARIANT_KEY,
  RUN_C_NARROW_VARIANT_KEY,
  RUN_C_TARGET_SEGMENT_KEY,
  RUN_C_HIDDEN_ANALYSIS_TEXT,
} from "../presentation/run-c-working-document";
import type {
  RunCWorkingDocumentId,
  RunCProvisionId,
  RunCSelectionId,
  RunCAnnotationId,
  RunCVariantKey,
  RunCWorkingProvision,
  RunCWorkingDocumentVariant,
  RunCWorkingDocumentDefinition,
  RunCFixture,
} from "../presentation/run-c-working-document";

const AUTHORED = {
  kind: "authored" as const,
  note: "Synthetic Stage 6.5 Run C working-document fixture.",
};

export function createRunCFixture(seedInput?: string): RunCFixture {
  const runB = createRunBFixture(seedInput);
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
    summary: `${personName(world.people[collinsPersonId]!)} reviewed the staff projection for the current Transit Access Pilot working provision.`,
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
    summary: `${personName(world.people[collinsPersonId]!)} reviewed the staff projection for the prepared narrower Transit Access Pilot provision.`,
    believedSummary:
      "The prepared $4,000,000 provision models half the maximum outlay for the same target scope while remaining only a working proposal.",
    accuracy: "accurate",
    confidence: "medium",
    visibility: "limited",
  });

  const document = createDocumentDefinition(world, {
    collinsPersonId,
    playerPersonId: runB.playerPersonId,
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
    privateUnavailableReason: runB.roomContext.privateUnavailableReason,
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

function createDocumentDefinition(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
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
  },
): RunCWorkingDocumentDefinition {
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
        label: `${world.people[input.collinsPersonId]!.familyName} · staff projection attached`,
        teaser: `Read the attached note to add ${world.people[input.collinsPersonId]!.familyName}'s analysis to ${world.people[input.playerPersonId]!.givenName}'s known record.`,
      },
    ],
  };
}

function createVariant(input: {
  readonly key: RunCVariantKey;
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
