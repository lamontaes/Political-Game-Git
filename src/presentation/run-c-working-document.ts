import {
  assertWorldIntegrity,
  personName,
  recordPolicyAnalysisKnowledge,
  recordWorldEvent,
} from "../simulation";
import type {
  EntityId,
  EventKnowledgeRecord,
  MetricScope,
  PolicyEstimateRecord,
  PolicyOperationRecord,
  World,
} from "../simulation";
import type { RunBFixture } from "./office-scene-context";
import type { RunCLegislativeConversationProgress } from "./run-b-conversation-progress";

export const RUN_C_DOCUMENT_STABLE_KEY =
  "run-c:working-document:transit-access-pilot";
export const RUN_C_WIDE_VARIANT_KEY = "pilot-cap-8m";
export const RUN_C_NARROW_VARIANT_KEY = "pilot-cap-4m";
export const RUN_C_REVISION_EVENT_STABLE_KEY = `${RUN_C_DOCUMENT_STABLE_KEY}:select-narrow`;
export const RUN_C_TARGET_SEGMENT_KEY = "transit.pilot-eligible-riders";
export const RUN_C_HIDDEN_ANALYSIS_TEXT =
  "Internal sensitivity case: uptake could reduce modeled delivery to one half.";

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
  readonly documentRole: RunCDocumentVariantRole;
  readonly documentRoleLabel: string;
  readonly authorPersonId: EntityId;
  readonly authorLabel: string;
  readonly provenanceLabel: string;
  readonly qualification: string;
  readonly modeledChange: string;
  readonly scopeLabel: string;
  readonly knowledgeId: EntityId;
}

export type RunCDocumentVariantRole = "current" | "prepared" | "previous";

export interface RunCDocumentVariantRoleProjection {
  readonly role: RunCDocumentVariantRole;
  readonly label: string;
}

export interface RunCDocumentProjection {
  readonly activeVariantKey: RunCVariantKey;
  readonly activeVariant: RunCWorkingDocumentVariant;
  readonly preparedVariant: RunCWorkingDocumentVariant | null;
  readonly variantRoles: Readonly<
    Record<RunCVariantKey, RunCDocumentVariantRoleProjection>
  >;
  readonly paperStatusLabel: string;
  readonly annotationSummary: string;
  readonly staffAnalyses: readonly RunCStaffAnalysisProjection[];
  readonly revisionCommitted: boolean;
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
  const revisionCommitted = revision !== undefined;
  const variantRoles: Readonly<
    Record<RunCVariantKey, RunCDocumentVariantRoleProjection>
  > = revisionCommitted
    ? {
        [RUN_C_WIDE_VARIANT_KEY]: {
          role: "previous",
          label: "Earlier office working version",
        },
        [RUN_C_NARROW_VARIANT_KEY]: {
          role: "current",
          label: "Current office working draft",
        },
      }
    : {
        [RUN_C_WIDE_VARIANT_KEY]: {
          role: "current",
          label: "Current office working draft",
        },
        [RUN_C_NARROW_VARIANT_KEY]: {
          role: "prepared",
          label: "Prepared narrower revision",
        },
      };
  const activeVariant = fixture.document.variants[activeVariantKey];

  return {
    activeVariantKey,
    activeVariant,
    preparedVariant: revisionCommitted
      ? null
      : fixture.document.variants[RUN_C_NARROW_VARIANT_KEY],
    variantRoles,
    paperStatusLabel: `${activeVariant.amountDisplay} · ${variantRoles[activeVariantKey].label}`,
    annotationSummary: revisionCommitted
      ? "The $4,000,000 narrower version is now the current office working draft; the $8,000,000 language is the earlier office version."
      : "The $8,000,000 language is the current office working draft; $4,000,000 is the prepared narrower revision.",
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
        ? [
            projectKnownAnalysis(
              world,
              fixture,
              variant,
              variantRoles[variantKey],
              knowledge,
            ),
          ]
        : [];
    }),
    revisionCommitted,
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
      summary: `${personName(world.people[fixture.playerPersonId]!)} reviewed ${world.people[fixture.document.preparedByPersonId]!.familyName}'s staff projection for the ${variant.amountDisplay} Transit Access Pilot working provision.`,
      believedSummary: `${world.people[fixture.document.preparedByPersonId]!.familyName}'s analysis treats the ${variant.amountDisplay} amount as a projected maximum outlay for the same eligible-rider scope, not as enacted or implemented policy.`,
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
      `Run C legislative discussion requires ${world.people[fixture.document.preparedByPersonId]!.familyName}'s analysis knowledge.`,
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
    summary: `${personName(inputWorld.people[fixture.playerPersonId]!)} instructed staff to use the prepared $4,000,000 provision in the Transit Access Pilot office working draft.`,
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

function projectKnownAnalysis(
  world: World,
  fixture: RunCFixture,
  variant: RunCWorkingDocumentVariant,
  documentRole: RunCDocumentVariantRoleProjection,
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
    documentRole: documentRole.role,
    documentRoleLabel: documentRole.label,
    authorPersonId: fixture.scenePerson.personId,
    authorLabel: `${personName(world.people[fixture.document.preparedByPersonId]!)} · staff analysis`,
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

export function formatMoneyMinorUnits(minorUnits: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
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
