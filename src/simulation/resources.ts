import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  activeDwellingOccupanciesAt,
  dwellingOccupancyStateHistory,
  housingTenureStateHistory,
  outstandingDebtAt,
  resourceFlowTermsAt,
  resourceFlowTermsHistory,
  resourceObligationStateHistory,
  resourcePositionAt,
  sameEndpoint,
  samePositionOwner,
} from "./resource-queries";
import {
  assertOpenTaxonomyKey,
  DWELLING_CLASSIFICATION_NAMESPACES,
  DWELLING_OCCUPANCY_NAMESPACES,
  HOUSING_TENURE_NAMESPACES,
  RESOURCE_CADENCE_NAMESPACES,
  RESOURCE_FLOW_BASIS_NAMESPACES,
  RESOURCE_OBLIGATION_BASIS_NAMESPACES,
  RESOURCE_OUTCOME_REASON_NAMESPACES,
  RESOURCE_RESTRICTION_NAMESPACES,
} from "./taxonomy";
import type {
  CurrencyCode,
  Dwelling,
  DwellingClassification,
  DwellingOccupancy,
  DwellingOccupancyKind,
  DwellingOccupancyStateRecord,
  DwellingOccupant,
  EntityId,
  HousingTenure,
  HousingTenureHolder,
  HousingTenureKind,
  HousingTenureStateRecord,
  LifeRecordProvenance,
  MoneyAmount,
  ResidenceRole,
  ResourceCadenceKind,
  ResourceEndpoint,
  ResourceFlow,
  ResourceFlowBasisKind,
  ResourceFlowBasisReference,
  ResourceFlowStatus,
  ResourceFlowTermsRecord,
  ResourceObligation,
  ResourceObligationBasisKind,
  ResourceObligationStateRecord,
  ResourceObligationStatus,
  ResourceOutcomeReasonKind,
  ResourcePosition,
  ResourcePositionOwner,
  ResourceRestrictionKind,
  ResourceTransferOutcome,
  ResourceTransferOutcomeStatus,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function makeCurrencyCode(value: string): CurrencyCode {
  if (!CURRENCY_CODE.test(value)) {
    throw new Error(`Currency code must be three uppercase letters: ${value}`);
  }
  return value as CurrencyCode;
}

export function money(minorUnits: number, currency: string): MoneyAmount {
  const amount = { minorUnits, currency: makeCurrencyCode(currency) };
  validateMoney(amount, "Money amount");
  return amount;
}

export interface CreateResourcePositionInput {
  readonly stableKey: string;
  readonly owner: ResourcePositionOwner;
  readonly openedAt: string;
  readonly openingBalance: MoneyAmount;
  readonly provenance: LifeRecordProvenance;
}

export interface CreateResourceFlowInput {
  readonly stableKey: string;
  readonly source: ResourceEndpoint;
  readonly recipient: ResourceEndpoint;
  readonly startsAt: string;
  readonly initialStatus?: "active" | "expected";
  readonly amount: MoneyAmount;
  readonly cadenceKind: ResourceCadenceKind;
  readonly basisKind: ResourceFlowBasisKind;
  readonly basisReference: ResourceFlowBasisReference;
  readonly restrictionKind: ResourceRestrictionKind | null;
  readonly jurisdictionId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordResourceFlowTermsInput {
  readonly stableKey: string;
  readonly resourceFlowId: EntityId;
  readonly effectiveAt: string;
  readonly status: ResourceFlowStatus;
  readonly amount: MoneyAmount;
  readonly cadenceKind: ResourceCadenceKind;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesTermsId: EntityId;
}

export interface RecordResourceTransferOutcomeInput {
  readonly stableKey: string;
  readonly resourceFlowId: EntityId;
  readonly periodStartsAt: string;
  readonly periodEndsAt: string;
  readonly occurredAt: string;
  readonly status: ResourceTransferOutcomeStatus;
  readonly attemptedAmount: MoneyAmount;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
  readonly note: string | null;
  readonly provenance: LifeRecordProvenance;
}

export interface CreateWorkCompensationInput {
  readonly stableKey: string;
  readonly workRelationshipId: EntityId;
  readonly startsAt: string;
  readonly initialStatus?: "active" | "expected";
  readonly amount: MoneyAmount;
  readonly cadenceKind: ResourceCadenceKind;
  readonly restrictionKind: ResourceRestrictionKind | null;
  readonly jurisdictionId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

export interface ResolveWorkCompensationPeriodInput {
  readonly stableKey: string;
  readonly workRelationshipId: EntityId;
  readonly periodStartsAt: string;
  readonly periodEndsAt: string;
  readonly occurredAt: string;
  readonly status: ResourceTransferOutcomeStatus;
  readonly transferredAmount?: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
  readonly note: string | null;
  readonly provenance: LifeRecordProvenance;
}

export interface CreateResourceObligationInput {
  readonly stableKey: string;
  readonly resourceFlowId: EntityId;
  readonly establishedAt: string;
  readonly basisKind: ResourceObligationBasisKind;
  readonly principal: MoneyAmount | null;
  readonly careResponsibilityId: EntityId | null;
  readonly housingTenureId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordResourceObligationStateInput {
  readonly stableKey: string;
  readonly resourceObligationId: EntityId;
  readonly effectiveAt: string;
  readonly status: ResourceObligationStatus;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export interface CreateDwellingInput {
  readonly stableKey: string;
  readonly establishedAt: string;
  readonly jurisdictionId: EntityId;
  readonly locationLabel: string;
  readonly classification: DwellingClassification;
  readonly provenance: LifeRecordProvenance;
}

export interface StartDwellingOccupancyInput {
  readonly stableKey: string;
  readonly occupant: DwellingOccupant;
  readonly dwellingId: EntityId;
  readonly startedAt: string;
  readonly residenceRole: ResidenceRole;
  readonly kind: DwellingOccupancyKind;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordDwellingOccupancyStateInput {
  readonly stableKey: string;
  readonly dwellingOccupancyId: EntityId;
  readonly effectiveAt: string;
  readonly status: DwellingOccupancyStateRecord["status"];
  readonly residenceRole: ResidenceRole;
  readonly kind: DwellingOccupancyKind;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export interface CreateHousingTenureInput {
  readonly stableKey: string;
  readonly holder: HousingTenureHolder;
  readonly dwellingId: EntityId;
  readonly startedAt: string;
  readonly kind: HousingTenureKind;
  readonly context: string | null;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordHousingTenureStateInput {
  readonly stableKey: string;
  readonly housingTenureId: EntityId;
  readonly effectiveAt: string;
  readonly status: HousingTenureStateRecord["status"];
  readonly context: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export function createResourcePosition(
  world: World,
  input: CreateResourcePositionInput,
): World {
  assertUniqueStableKey(
    world.history.resourcePositions,
    input.stableKey,
    "resource position",
  );
  const openedAt = entityDate(
    world,
    input.owner,
    input.openedAt,
    "Resource position",
  );
  validateMoney(input.openingBalance, "Opening resource position");
  if (
    world.history.resourcePositions.some(
      (record) =>
        samePositionOwner(record.owner, input.owner) &&
        record.openingBalance.currency === input.openingBalance.currency,
    )
  ) {
    throw new Error(
      "A tracked owner may have only one liquid position per currency.",
    );
  }
  validateLifeProvenance(world, input.provenance, openedAt);
  const record: ResourcePosition = {
    id: createStableId("resource-position", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    owner: { ...input.owner },
    openedAt,
    openingBalance: { ...input.openingBalance },
    provenance: { ...input.provenance },
  };
  return appendOne(world, "resourcePositions", record);
}

export function createResourceFlow(
  world: World,
  input: CreateResourceFlowInput,
): World {
  assertUniqueStableKey(
    world.history.resourceFlows,
    input.stableKey,
    "resource flow",
  );
  const recordedAt = makeIsoDate(world.currentDate);
  const startsAt = makeIsoDate(input.startsAt);
  const initialStatus = input.initialStatus ?? "active";
  validateEndpoint(world, input.source, startsAt, "Resource-flow source");
  validateEndpoint(world, input.recipient, startsAt, "Resource-flow recipient");
  if (sameEndpoint(input.source, input.recipient)) {
    throw new Error(
      "A resource flow requires distinct source and recipient endpoints.",
    );
  }
  if (initialStatus === "active" && startsAt > recordedAt) {
    throw new Error("An active resource flow cannot start in the future.");
  }
  if (initialStatus === "expected" && startsAt <= recordedAt) {
    throw new Error("An expected resource flow must start in the future.");
  }
  validateMoney(input.amount, "Resource-flow amount", true);
  assertOpenTaxonomyKey(
    input.cadenceKind,
    RESOURCE_CADENCE_NAMESPACES,
    "Resource cadence",
  );
  assertOpenTaxonomyKey(
    input.basisKind,
    RESOURCE_FLOW_BASIS_NAMESPACES,
    "Resource-flow basis",
  );
  if (input.restrictionKind !== null) {
    assertOpenTaxonomyKey(
      input.restrictionKind,
      RESOURCE_RESTRICTION_NAMESPACES,
      "Resource restriction",
    );
  }
  if (
    input.jurisdictionId !== null &&
    !world.jurisdictions[input.jurisdictionId]
  ) {
    throw new Error(
      `Missing resource-flow jurisdiction: ${input.jurisdictionId}`,
    );
  }
  validateBasisReference(world, input.basisReference, startsAt);
  validateLifeProvenance(world, input.provenance, recordedAt);
  const flow: ResourceFlow = {
    id: createStableId("resource-flow", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    source: { ...input.source },
    recipient: { ...input.recipient },
    recordedAt,
    startsAt,
    basisKind: input.basisKind,
    basisReference: { ...input.basisReference },
    restrictionKind: input.restrictionKind,
    jurisdictionId: input.jurisdictionId,
    provenance: { ...input.provenance },
  };
  const termsKey = `${input.stableKey}:terms:initial`;
  const terms: ResourceFlowTermsRecord = {
    id: createStableId("resource-flow-terms", `${world.id}:${termsKey}`),
    stableKey: termsKey,
    sequence: world.history.nextSequence + 1,
    resourceFlowId: flow.id,
    effectiveAt: initialStatus === "expected" ? recordedAt : startsAt,
    status: initialStatus,
    amount: { ...input.amount },
    cadenceKind: input.cadenceKind,
    reason: null,
    provenance: { ...input.provenance },
    supersedesTermsId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    resourceFlows: [...world.history.resourceFlows, flow],
    resourceFlowTerms: [...world.history.resourceFlowTerms, terms],
  });
}

export function recordResourceFlowTerms(
  world: World,
  input: RecordResourceFlowTermsInput,
): World {
  const flow = requireRecord(
    world.history.resourceFlows,
    input.resourceFlowId,
    "resource flow",
  );
  const effectiveAt = pastOrCurrentDate(
    world,
    input.effectiveAt,
    "Resource-flow terms",
  );
  const previous = resourceFlowTermsHistory(world, flow.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesTermsId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error(
      "Resource-flow terms must supersede the latest prior terms.",
    );
  }
  if (previous.status === "ended")
    throw new Error("An ended resource flow cannot be reopened.");
  if (input.status === "expected")
    throw new Error("Expected is valid only for initial resource-flow terms.");
  if (input.status === "active" && effectiveAt < flow.startsAt) {
    throw new Error(
      "A resource flow cannot become active before its start date.",
    );
  }
  validateMoney(input.amount, "Resource-flow amount", true);
  assertOpenTaxonomyKey(
    input.cadenceKind,
    RESOURCE_CADENCE_NAMESPACES,
    "Resource cadence",
  );
  if (input.status === "ended")
    assertNonEmpty(input.reason, "Ended resource-flow reason");
  else assertOptional(input.reason, "Resource-flow reason");
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: ResourceFlowTermsRecord = {
    ...input,
    id: createStableId("resource-flow-terms", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    amount: { ...input.amount },
    provenance: { ...input.provenance },
  };
  return appendOne(world, "resourceFlowTerms", record);
}

export function recordResourceTransferOutcome(
  world: World,
  input: RecordResourceTransferOutcomeInput,
): World {
  const flow = requireRecord(
    world.history.resourceFlows,
    input.resourceFlowId,
    "resource flow",
  );
  const periodStartsAt = makeIsoDate(input.periodStartsAt);
  const periodEndsAt = makeIsoDate(input.periodEndsAt);
  const occurredAt = pastOrCurrentDate(
    world,
    input.occurredAt,
    "Resource transfer outcome",
  );
  if (
    periodStartsAt < flow.startsAt ||
    periodEndsAt < periodStartsAt ||
    occurredAt < periodEndsAt
  ) {
    throw new Error("Resource transfer period/outcome chronology is invalid.");
  }
  const terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: occurredAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (!terms || terms.status !== "active") {
    throw new Error("A transfer outcome requires active resource-flow terms.");
  }
  validateMoney(input.attemptedAmount, "Attempted transfer", true);
  validateMoney(input.transferredAmount, "Transferred amount");
  if (!sameMoney(input.attemptedAmount, terms.amount)) {
    throw new Error(
      "Attempted transfer must match the effective expected terms.",
    );
  }
  if (input.transferredAmount.currency !== input.attemptedAmount.currency) {
    throw new Error("Attempted and transferred currency must match.");
  }
  validateOutcomeAmounts(
    input.status,
    input.attemptedAmount,
    input.transferredAmount,
  );
  if (input.status === "completed") {
    if (input.reasonKind !== null)
      assertOpenTaxonomyKey(
        input.reasonKind,
        RESOURCE_OUTCOME_REASON_NAMESPACES,
        "Resource outcome reason",
      );
  } else {
    if (input.reasonKind === null)
      throw new Error("A non-completed outcome requires a structured reason.");
    assertOpenTaxonomyKey(
      input.reasonKind,
      RESOURCE_OUTCOME_REASON_NAMESPACES,
      "Resource outcome reason",
    );
  }
  assertOptional(input.note, "Resource outcome note");
  validateLifeProvenance(world, input.provenance, occurredAt);
  const sourceOwner = endpointPositionOwner(flow.source);
  if (sourceOwner && input.transferredAmount.minorUnits > 0) {
    const sourcePosition = resourcePositionAt(
      world,
      sourceOwner,
      input.transferredAmount.currency,
      {
        asOfDate: occurredAt,
        historySequenceExclusive: world.history.nextSequence,
      },
    );
    if (
      sourcePosition &&
      sourcePosition.liquidBalance.minorUnits <
        input.transferredAmount.minorUnits
    ) {
      throw new Error(
        "A committed transfer cannot overdraw a tracked liquid position.",
      );
    }
  }
  const obligation = world.history.resourceObligations.find(
    (record) => record.resourceFlowId === flow.id && record.principal !== null,
  );
  if (obligation?.principal) {
    const outstanding = outstandingDebtAt(world, obligation.id);
    if (
      outstanding &&
      input.transferredAmount.minorUnits > outstanding.minorUnits
    ) {
      throw new Error(
        "A debt payment cannot exceed the outstanding principal.",
      );
    }
  }
  const record: ResourceTransferOutcome = {
    ...input,
    id: createStableId(
      "resource-transfer-outcome",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    periodStartsAt,
    periodEndsAt,
    occurredAt,
    attemptedAmount: { ...input.attemptedAmount },
    transferredAmount: { ...input.transferredAmount },
    provenance: { ...input.provenance },
  };
  return appendOne(world, "resourceTransferOutcomes", record);
}

export function createWorkCompensation(
  world: World,
  input: CreateWorkCompensationInput,
): World {
  const work = requireRecord(
    world.history.workRelationships,
    input.workRelationshipId,
    "work relationship",
  );
  if (!work.organizationId)
    throw new Error("Work compensation requires a source organization.");
  if (work.compensation !== "paid" && work.compensation !== "mixed") {
    throw new Error(
      "Unpaid or in-kind work cannot receive monetary compensation terms.",
    );
  }
  if (
    world.history.resourceFlows.some(
      (flow) =>
        flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === work.id,
    )
  ) {
    throw new Error(
      "A work relationship already has a monetary compensation flow.",
    );
  }
  return createResourceFlow(world, {
    stableKey: input.stableKey,
    source: { kind: "organization", organizationId: work.organizationId },
    recipient: { kind: "person", personId: work.personId },
    startsAt: input.startsAt,
    initialStatus: input.initialStatus,
    amount: input.amount,
    cadenceKind: input.cadenceKind,
    basisKind: "compensation:work",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: input.restrictionKind,
    jurisdictionId: input.jurisdictionId,
    provenance: input.provenance,
  });
}

export function recordWorkCompensationTerms(
  world: World,
  input: Omit<RecordResourceFlowTermsInput, "resourceFlowId"> & {
    readonly workRelationshipId: EntityId;
  },
): World {
  const flow = requireWorkCompensationFlow(world, input.workRelationshipId);
  return recordResourceFlowTerms(world, { ...input, resourceFlowId: flow.id });
}

export function resolveWorkCompensationPeriod(
  world: World,
  input: ResolveWorkCompensationPeriodInput,
): World {
  const flow = requireWorkCompensationFlow(world, input.workRelationshipId);
  const terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: makeIsoDate(input.occurredAt),
    historySequenceExclusive: world.history.nextSequence,
  });
  if (!terms) throw new Error("Work compensation has no effective terms.");
  const transferred =
    input.transferredAmount ??
    (input.status === "completed"
      ? terms.amount
      : money(0, terms.amount.currency));
  return recordResourceTransferOutcome(world, {
    stableKey: input.stableKey,
    resourceFlowId: flow.id,
    periodStartsAt: input.periodStartsAt,
    periodEndsAt: input.periodEndsAt,
    occurredAt: input.occurredAt,
    status: input.status,
    attemptedAmount: terms.amount,
    transferredAmount: transferred,
    reasonKind: input.reasonKind,
    note: input.note,
    provenance: input.provenance,
  });
}

export function createResourceObligation(
  world: World,
  input: CreateResourceObligationInput,
): World {
  const flow = requireRecord(
    world.history.resourceFlows,
    input.resourceFlowId,
    "resource flow",
  );
  if (
    world.history.resourceObligations.some(
      (record) => record.resourceFlowId === flow.id,
    )
  ) {
    throw new Error(
      "A resource flow may have only one major obligation identity.",
    );
  }
  if (endpointPositionOwner(flow.source) === null) {
    throw new Error(
      "A personal obligation must be owed by a person or household.",
    );
  }
  const establishedAt = pastOrCurrentDate(
    world,
    input.establishedAt,
    "Resource obligation",
  );
  if (establishedAt < flow.startsAt)
    throw new Error("An obligation cannot predate its flow arrangement.");
  assertOpenTaxonomyKey(
    input.basisKind,
    RESOURCE_OBLIGATION_BASIS_NAMESPACES,
    "Resource obligation basis",
  );
  if (input.principal !== null) {
    validateMoney(input.principal, "Debt principal", true);
    const terms = resourceFlowTermsAt(world, flow.id);
    if (!terms || terms.amount.currency !== input.principal.currency) {
      throw new Error("Debt principal must use the linked flow currency.");
    }
  }
  if (input.careResponsibilityId !== null && input.housingTenureId !== null) {
    throw new Error("An obligation may link one structural context, not two.");
  }
  if (input.careResponsibilityId !== null)
    requireRecord(
      world.history.careResponsibilities,
      input.careResponsibilityId,
      "care responsibility",
    );
  if (input.housingTenureId !== null)
    requireRecord(
      world.history.housingTenures,
      input.housingTenureId,
      "housing tenure",
    );
  validateLifeProvenance(world, input.provenance, establishedAt);
  const obligation: ResourceObligation = {
    id: createStableId("resource-obligation", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    resourceFlowId: flow.id,
    establishedAt,
    basisKind: input.basisKind,
    principal: input.principal ? { ...input.principal } : null,
    careResponsibilityId: input.careResponsibilityId,
    housingTenureId: input.housingTenureId,
    provenance: { ...input.provenance },
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: ResourceObligationStateRecord = {
    id: createStableId("resource-obligation-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    resourceObligationId: obligation.id,
    effectiveAt: establishedAt,
    status: "active",
    reason: null,
    provenance: { ...input.provenance },
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    resourceObligations: [...world.history.resourceObligations, obligation],
    resourceObligationStates: [
      ...world.history.resourceObligationStates,
      state,
    ],
  });
}

export function recordResourceObligationState(
  world: World,
  input: RecordResourceObligationStateInput,
): World {
  const obligation = requireRecord(
    world.history.resourceObligations,
    input.resourceObligationId,
    "resource obligation",
  );
  const effectiveAt = pastOrCurrentDate(
    world,
    input.effectiveAt,
    "Resource obligation state",
  );
  const previous = resourceObligationStateHistory(world, obligation.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error(
      "Resource obligation state must supersede the latest state.",
    );
  }
  if (previous.status !== "active")
    throw new Error("A terminal obligation cannot be reopened.");
  if (input.status === "active")
    throw new Error("An obligation transition must be terminal.");
  assertNonEmpty(input.reason, "Resource obligation terminal reason");
  if (input.status === "satisfied" && obligation.principal) {
    const outstanding = outstandingDebtAt(world, obligation.id);
    if (outstanding?.minorUnits !== 0)
      throw new Error(
        "Debt cannot be satisfied while principal remains outstanding.",
      );
  }
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: ResourceObligationStateRecord = {
    ...input,
    id: createStableId(
      "resource-obligation-state",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: { ...input.provenance },
  };
  return appendOne(world, "resourceObligationStates", record);
}

export function createDwelling(
  world: World,
  input: CreateDwellingInput,
): World {
  const establishedAt = pastOrCurrentDate(
    world,
    input.establishedAt,
    "Dwelling",
  );
  if (!world.jurisdictions[input.jurisdictionId])
    throw new Error(`Missing dwelling jurisdiction: ${input.jurisdictionId}`);
  assertNonEmpty(input.locationLabel, "Dwelling location label");
  assertOpenTaxonomyKey(
    input.classification,
    DWELLING_CLASSIFICATION_NAMESPACES,
    "Dwelling classification",
  );
  validateLifeProvenance(world, input.provenance, establishedAt);
  const record: Dwelling = {
    id: createStableId("dwelling", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    establishedAt,
    jurisdictionId: input.jurisdictionId,
    locationLabel: input.locationLabel,
    classification: input.classification,
    provenance: { ...input.provenance },
  };
  return appendOne(world, "dwellings", record);
}

export function startDwellingOccupancy(
  world: World,
  input: StartDwellingOccupancyInput,
): World {
  const dwelling = requireRecord(
    world.history.dwellings,
    input.dwellingId,
    "dwelling",
  );
  const startedAt = entityDate(
    world,
    input.occupant,
    input.startedAt,
    "Dwelling occupancy",
  );
  if (startedAt < dwelling.establishedAt)
    throw new Error("Dwelling occupancy cannot predate the dwelling.");
  validateResidenceRole(input.residenceRole);
  if (input.residenceRole === "primary") {
    const cutoff = {
      asOfDate: startedAt,
      historySequenceExclusive: world.history.nextSequence,
    };
    const overlapsPrimary = activeDwellingOccupanciesAt(world, cutoff).some(
      (record) =>
        sameEndpoint(record.occupant, input.occupant) &&
        dwellingOccupancyStateHistory(world, record.id, cutoff).at(-1)
          ?.residenceRole === "primary",
    );
    if (overlapsPrimary) {
      throw new Error(
        "An occupant cannot have overlapping primary dwelling occupancy.",
      );
    }
  }
  assertOpenTaxonomyKey(
    input.kind,
    DWELLING_OCCUPANCY_NAMESPACES,
    "Dwelling occupancy kind",
  );
  validateLifeProvenance(world, input.provenance, startedAt);
  const occupancy: DwellingOccupancy = {
    id: createStableId("dwelling-occupancy", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    occupant: { ...input.occupant },
    dwellingId: dwelling.id,
    startedAt,
    provenance: { ...input.provenance },
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: DwellingOccupancyStateRecord = {
    id: createStableId("dwelling-occupancy-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    dwellingOccupancyId: occupancy.id,
    effectiveAt: startedAt,
    status: "active",
    residenceRole: input.residenceRole,
    kind: input.kind,
    reason: null,
    provenance: { ...input.provenance },
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    dwellingOccupancies: [...world.history.dwellingOccupancies, occupancy],
    dwellingOccupancyStates: [...world.history.dwellingOccupancyStates, state],
  });
}

export function recordDwellingOccupancyState(
  world: World,
  input: RecordDwellingOccupancyStateInput,
): World {
  const occupancy = requireRecord(
    world.history.dwellingOccupancies,
    input.dwellingOccupancyId,
    "dwelling occupancy",
  );
  const effectiveAt = entityDate(
    world,
    occupancy.occupant,
    input.effectiveAt,
    "Dwelling occupancy state",
  );
  const previous = dwellingOccupancyStateHistory(world, occupancy.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error(
      "Dwelling occupancy state must supersede the latest state.",
    );
  }
  if (previous.status === "ended")
    throw new Error("Ended occupancy cannot be reopened.");
  if (input.status !== "ended")
    throw new Error("An occupancy transition must end occupancy.");
  validateResidenceRole(input.residenceRole);
  assertOpenTaxonomyKey(
    input.kind,
    DWELLING_OCCUPANCY_NAMESPACES,
    "Dwelling occupancy kind",
  );
  assertNonEmpty(input.reason, "Dwelling occupancy end reason");
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: DwellingOccupancyStateRecord = {
    ...input,
    id: createStableId(
      "dwelling-occupancy-state",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: { ...input.provenance },
  };
  return appendOne(world, "dwellingOccupancyStates", record);
}

export function createHousingTenure(
  world: World,
  input: CreateHousingTenureInput,
): World {
  const dwelling = requireRecord(
    world.history.dwellings,
    input.dwellingId,
    "dwelling",
  );
  const startedAt = entityDate(
    world,
    input.holder,
    input.startedAt,
    "Housing tenure",
  );
  if (startedAt < dwelling.establishedAt)
    throw new Error("Housing tenure cannot predate the dwelling.");
  assertOpenTaxonomyKey(
    input.kind,
    HOUSING_TENURE_NAMESPACES,
    "Housing tenure kind",
  );
  assertOptional(input.context, "Housing tenure context");
  validateLifeProvenance(world, input.provenance, startedAt);
  const tenure: HousingTenure = {
    id: createStableId("housing-tenure", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    holder: { ...input.holder },
    dwellingId: dwelling.id,
    startedAt,
    kind: input.kind,
    provenance: { ...input.provenance },
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: HousingTenureStateRecord = {
    id: createStableId("housing-tenure-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    housingTenureId: tenure.id,
    effectiveAt: startedAt,
    status: "active",
    context: input.context,
    provenance: { ...input.provenance },
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    housingTenures: [...world.history.housingTenures, tenure],
    housingTenureStates: [...world.history.housingTenureStates, state],
  });
}

export function recordHousingTenureState(
  world: World,
  input: RecordHousingTenureStateInput,
): World {
  const tenure = requireRecord(
    world.history.housingTenures,
    input.housingTenureId,
    "housing tenure",
  );
  const effectiveAt = entityDate(
    world,
    tenure.holder,
    input.effectiveAt,
    "Housing tenure state",
  );
  const previous = housingTenureStateHistory(world, tenure.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error("Housing tenure state must supersede the latest state.");
  }
  if (previous.status === "ended")
    throw new Error("Ended tenure cannot be reopened.");
  if (input.status !== "ended")
    throw new Error("A tenure transition must end tenure.");
  assertOptional(input.context, "Housing tenure context");
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: HousingTenureStateRecord = {
    ...input,
    id: createStableId(
      "housing-tenure-state",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: { ...input.provenance },
  };
  return appendOne(world, "housingTenureStates", record);
}

function requireWorkCompensationFlow(
  world: World,
  workRelationshipId: EntityId,
): ResourceFlow {
  requireRecord(
    world.history.workRelationships,
    workRelationshipId,
    "work relationship",
  );
  const flow = world.history.resourceFlows.find(
    (record) =>
      record.basisReference.kind === "work" &&
      record.basisReference.workRelationshipId === workRelationshipId,
  );
  if (!flow)
    throw new Error(`Missing work compensation flow: ${workRelationshipId}`);
  return flow;
}

function validateOutcomeAmounts(
  status: ResourceTransferOutcomeStatus,
  attempted: MoneyAmount,
  transferred: MoneyAmount,
): void {
  if (
    status === "completed" &&
    transferred.minorUnits !== attempted.minorUnits
  ) {
    throw new Error("A completed outcome must transfer the attempted amount.");
  }
  if (
    status === "partial" &&
    !(
      transferred.minorUnits > 0 &&
      transferred.minorUnits < attempted.minorUnits
    )
  ) {
    throw new Error(
      "A partial outcome must transfer more than zero and less than attempted.",
    );
  }
  if (
    (status === "missed" || status === "blocked") &&
    transferred.minorUnits !== 0
  ) {
    throw new Error("A missed or blocked outcome transfers no resources.");
  }
}

function validateMoney(
  amount: MoneyAmount,
  label: string,
  positive = false,
): void {
  makeCurrencyCode(amount.currency);
  if (
    !Number.isSafeInteger(amount.minorUnits) ||
    amount.minorUnits < 0 ||
    (positive && amount.minorUnits === 0)
  ) {
    throw new Error(
      `${label} must use non-negative safe integer minor units${positive ? " greater than zero" : ""}.`,
    );
  }
}

function sameMoney(left: MoneyAmount, right: MoneyAmount): boolean {
  return (
    left.minorUnits === right.minorUnits && left.currency === right.currency
  );
}

function validateEndpoint(
  world: World,
  endpoint: ResourceEndpoint,
  date: string,
  label: string,
): void {
  entityDate(
    world,
    endpoint,
    date > world.currentDate ? world.currentDate : date,
    label,
  );
}

function validateBasisReference(
  world: World,
  reference: ResourceFlowBasisReference,
  date: string,
): void {
  switch (reference.kind) {
    case "work": {
      const work = requireRecord(
        world.history.workRelationships,
        reference.workRelationshipId,
        "work relationship",
      );
      if (work.startedAt > date)
        throw new Error(
          "Compensation flow cannot predate its work relationship.",
        );
      return;
    }
    case "care": {
      const care = requireRecord(
        world.history.careResponsibilities,
        reference.careResponsibilityId,
        "care responsibility",
      );
      if (care.startedAt > date)
        throw new Error("Care flow cannot predate its responsibility.");
      return;
    }
    case "housing": {
      const tenure = requireRecord(
        world.history.housingTenures,
        reference.housingTenureId,
        "housing tenure",
      );
      if (tenure.startedAt > date)
        throw new Error("Housing flow cannot predate its tenure.");
      return;
    }
    case "general":
      return;
  }
}

function endpointPositionOwner(
  endpoint: ResourceEndpoint,
): ResourcePositionOwner | null {
  return endpoint.kind === "organization" ? null : { ...endpoint };
}

function entityDate(
  world: World,
  reference:
    | ResourceEndpoint
    | ResourcePositionOwner
    | DwellingOccupant
    | HousingTenureHolder,
  value: string,
  label: string,
) {
  const date = makeIsoDate(value);
  if (date > world.currentDate)
    throw new Error(`${label} cannot be in the future.`);
  switch (reference.kind) {
    case "person": {
      const person = world.people[reference.personId];
      if (!person || person.birthDate > date)
        throw new Error(`${label} has an unavailable person.`);
      break;
    }
    case "household": {
      const household = requireRecord(
        world.history.households,
        reference.householdId,
        "household",
      );
      if (household.formedAt > date)
        throw new Error(`${label} predates its household.`);
      break;
    }
    case "organization": {
      const organization = requireRecord(
        world.history.organizations,
        reference.organizationId,
        "organization",
      );
      if (organization.formedAt > date)
        throw new Error(`${label} predates its organization.`);
      break;
    }
  }
  return date;
}

function pastOrCurrentDate(world: World, value: string, label: string) {
  const date = makeIsoDate(value);
  if (date > world.currentDate)
    throw new Error(`${label} cannot be in the future.`);
  return date;
}

function validateResidenceRole(role: ResidenceRole): void {
  if (!(["primary", "secondary", "shared"] as const).includes(role)) {
    throw new Error(`Invalid dwelling residence role: ${String(role)}`);
  }
}

function validateLifeProvenance(
  world: World,
  provenance: LifeRecordProvenance,
  effectiveAt: string,
): void {
  switch (provenance.kind) {
    case "authored":
      assertNonEmpty(provenance.note, "Authored resource provenance note");
      return;
    case "generated":
      assertNonEmpty(
        provenance.generatorKey,
        "Generated resource provenance key",
      );
      return;
    case "simulated-event": {
      const event = world.history.events.find(
        (record) => record.id === provenance.eventId,
      );
      if (
        !event ||
        event.sequence >= world.history.nextSequence ||
        event.occurredAt > effectiveAt
      ) {
        throw new Error("Resource provenance references an unavailable event.");
      }
      return;
    }
    case "source-record":
      assertNonEmpty(provenance.reference, "Resource source-record reference");
      if (makeIsoDate(provenance.asOf) > effectiveAt)
        throw new Error(
          "Resource source provenance cannot postdate the record.",
        );
      return;
  }
}

function appendOne<K extends keyof World["history"]>(
  world: World,
  family: K,
  record: World["history"][K] extends readonly (infer T)[] ? T : never,
): World {
  const records = world.history[family];
  if (!Array.isArray(records))
    throw new Error("History family is not appendable.");
  assertUniqueStableKey(
    records as readonly { readonly stableKey: string }[],
    (record as { readonly stableKey: string }).stableKey,
    String(family),
  );
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    [family]: [...records, record],
  });
}

function commit(world: World, history: World["history"]): World {
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function requireRecord<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
  label: string,
): T {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Missing ${label}: ${id}`);
  return record;
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  assertNonEmpty(stableKey, `${label} stable key`);
  if (records.some((record) => record.stableKey === stableKey))
    throw new Error(`${label} stable key already exists: ${stableKey}`);
}

function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${label} must be a non-empty string.`);
}
