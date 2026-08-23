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
  DWELLING_CLASSIFICATION_NAMESPACES,
  DWELLING_OCCUPANCY_NAMESPACES,
  HOUSING_TENURE_NAMESPACES,
  isOpenTaxonomyKey,
  RESOURCE_CADENCE_NAMESPACES,
  RESOURCE_FLOW_BASIS_NAMESPACES,
  RESOURCE_OBLIGATION_BASIS_NAMESPACES,
  RESOURCE_OUTCOME_REASON_NAMESPACES,
  RESOURCE_RESTRICTION_NAMESPACES,
} from "./taxonomy";
import type {
  DwellingOccupant,
  EntityId,
  HousingTenureHolder,
  LifeRecordProvenance,
  MoneyAmount,
  ResourceEndpoint,
  ResourcePositionOwner,
  World,
} from "./types";

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function resourceHousingHistoryRecords(world: World): readonly {
  readonly sequence: number;
}[] {
  const h = world.history;
  return [
    ...h.resourcePositions,
    ...h.resourceFlows,
    ...h.resourceFlowTerms,
    ...h.resourceTransferOutcomes,
    ...h.resourceObligations,
    ...h.resourceObligationStates,
    ...h.dwellings,
    ...h.dwellingOccupancies,
    ...h.dwellingOccupancyStates,
    ...h.housingTenures,
    ...h.housingTenureStates,
  ];
}

export function resourceHousingEntityExists(
  world: World,
  id: EntityId,
): boolean {
  const h = world.history;
  return [
    h.resourcePositions,
    h.resourceFlows,
    h.resourceObligations,
    h.dwellings,
    h.dwellingOccupancies,
    h.housingTenures,
  ].some((records) => records.some((record) => record.id === id));
}

export function resourceHousingEntityAvailableAt(
  world: World,
  id: EntityId,
  date: string,
  historySequenceExclusive: number,
): boolean {
  const h = world.history;
  const record = [
    ...h.resourcePositions.map((item) => ({
      id: item.id,
      date: item.openedAt,
      sequence: item.sequence,
    })),
    ...h.resourceFlows.map((item) => ({
      id: item.id,
      date: earlier(item.recordedAt, item.startsAt),
      sequence: item.sequence,
    })),
    ...h.resourceObligations.map((item) => ({
      id: item.id,
      date: item.establishedAt,
      sequence: item.sequence,
    })),
    ...h.dwellings.map((item) => ({
      id: item.id,
      date: item.establishedAt,
      sequence: item.sequence,
    })),
    ...h.dwellingOccupancies.map((item) => ({
      id: item.id,
      date: item.startedAt,
      sequence: item.sequence,
    })),
    ...h.housingTenures.map((item) => ({
      id: item.id,
      date: item.startedAt,
      sequence: item.sequence,
    })),
  ].find((item) => item.id === id);
  return (
    record !== undefined &&
    record.date <= date &&
    record.sequence < historySequenceExclusive
  );
}

export function assertResourceHousingIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const h = world.history;
  const families = [
    [h.resourcePositions, "resource position", "resource-position"],
    [h.resourceFlows, "resource flow", "resource-flow"],
    [h.resourceFlowTerms, "resource-flow terms", "resource-flow-terms"],
    [
      h.resourceTransferOutcomes,
      "resource transfer outcome",
      "resource-transfer-outcome",
    ],
    [h.resourceObligations, "resource obligation", "resource-obligation"],
    [
      h.resourceObligationStates,
      "resource obligation state",
      "resource-obligation-state",
    ],
    [h.dwellings, "dwelling", "dwelling"],
    [h.dwellingOccupancies, "dwelling occupancy", "dwelling-occupancy"],
    [
      h.dwellingOccupancyStates,
      "dwelling occupancy state",
      "dwelling-occupancy-state",
    ],
    [h.housingTenures, "housing tenure", "housing-tenure"],
    [h.housingTenureStates, "housing tenure state", "housing-tenure-state"],
  ] as const;
  for (const [records, label, kind] of families) {
    assertOrdered(records, label);
    const keys = new Set<string>();
    for (const record of records) {
      nonEmpty(record.stableKey, `${label} stable key`);
      if (keys.has(record.stableKey))
        throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
      keys.add(record.stableKey);
      if (ids.has(record.id))
        throw new Error(`Duplicate entity ID: ${record.id}`);
      ids.add(record.id);
      if (
        record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)
      ) {
        throw new Error(
          `${label} ID does not match its stable key: ${record.id}`,
        );
      }
    }
  }

  for (const position of h.resourcePositions) {
    entityReference(
      world,
      position.owner,
      position.openedAt,
      position.sequence,
      position.id,
    );
    money(position.openingBalance, "resource-position opening balance");
    provenance(
      world,
      position.provenance,
      position.openedAt,
      position.sequence,
    );
    if (
      h.resourcePositions.some(
        (other) =>
          other.sequence < position.sequence &&
          samePositionOwner(other.owner, position.owner) &&
          other.openingBalance.currency === position.openingBalance.currency,
      )
    ) {
      throw new Error(`Duplicate tracked liquid position: ${position.id}`);
    }
  }

  for (const flow of h.resourceFlows) {
    dateInWorld(world, flow.recordedAt, flow.id);
    makeIsoDate(flow.startsAt);
    entityReference(
      world,
      flow.source,
      flow.recordedAt,
      flow.sequence,
      flow.id,
    );
    entityReference(
      world,
      flow.recipient,
      flow.recordedAt,
      flow.sequence,
      flow.id,
    );
    if (sameEndpoint(flow.source, flow.recipient))
      throw new Error(`Resource flow has identical endpoints: ${flow.id}`);
    if (!isOpenTaxonomyKey(flow.basisKind, RESOURCE_FLOW_BASIS_NAMESPACES))
      throw new Error(`Invalid resource-flow basis: ${flow.id}`);
    if (
      flow.restrictionKind !== null &&
      !isOpenTaxonomyKey(flow.restrictionKind, RESOURCE_RESTRICTION_NAMESPACES)
    )
      throw new Error(`Invalid resource restriction: ${flow.id}`);
    if (
      flow.jurisdictionId !== null &&
      !world.jurisdictions[flow.jurisdictionId]
    )
      throw new Error(`Resource flow has missing jurisdiction: ${flow.id}`);
    validateBasisReference(
      world,
      flow.basisReference,
      flow.sequence,
      flow.startsAt,
      flow.id,
    );
    provenance(world, flow.provenance, flow.recordedAt, flow.sequence);
    const terms = resourceFlowTermsHistory(world, flow.id);
    if (
      !terms[0] ||
      terms[0].supersedesTermsId !== null ||
      !["active", "expected"].includes(terms[0].status)
    ) {
      throw new Error(`Resource flow lacks valid initial terms: ${flow.id}`);
    }
    if (terms[0].status === "active" && terms[0].effectiveAt !== flow.startsAt)
      throw new Error(
        `Active resource flow has invalid initial date: ${flow.id}`,
      );
    if (
      terms[0].status === "expected" &&
      (terms[0].effectiveAt !== flow.recordedAt ||
        flow.startsAt <= flow.recordedAt)
    )
      throw new Error(
        `Expected resource flow has invalid initial chronology: ${flow.id}`,
      );
  }

  for (const terms of h.resourceFlowTerms) {
    const flow = byId(h.resourceFlows, terms.resourceFlowId);
    if (!flow || flow.sequence >= terms.sequence)
      throw new Error(`Resource-flow terms have a dangling flow: ${terms.id}`);
    dateInWorld(world, terms.effectiveAt, terms.id);
    member(
      ["expected", "active", "ended"],
      terms.status,
      "resource-flow status",
    );
    money(terms.amount, "resource-flow amount", true);
    if (!isOpenTaxonomyKey(terms.cadenceKind, RESOURCE_CADENCE_NAMESPACES))
      throw new Error(`Invalid resource cadence: ${terms.id}`);
    supersession(
      terms,
      terms.supersedesTermsId,
      h.resourceFlowTerms,
      (record) => record.resourceFlowId,
      (record) => record.effectiveAt,
      "resource-flow terms",
    );
    const prior = terms.supersedesTermsId
      ? byId(h.resourceFlowTerms, terms.supersedesTermsId)
      : undefined;
    if (
      prior?.status === "ended" ||
      (prior && terms.status === "expected") ||
      (terms.status === "active" && terms.effectiveAt < flow.startsAt)
    )
      throw new Error(`Invalid resource-flow lifecycle: ${terms.id}`);
    if (terms.status === "ended")
      nonEmpty(terms.reason, "resource-flow end reason");
    else optional(terms.reason, "resource-flow reason");
    provenance(world, terms.provenance, terms.effectiveAt, terms.sequence);
  }

  for (const outcome of h.resourceTransferOutcomes) {
    const flow = byId(h.resourceFlows, outcome.resourceFlowId);
    if (!flow || flow.sequence >= outcome.sequence)
      throw new Error(`Resource outcome has a dangling flow: ${outcome.id}`);
    dateInWorld(world, outcome.occurredAt, outcome.id);
    makeIsoDate(outcome.periodStartsAt);
    makeIsoDate(outcome.periodEndsAt);
    if (
      outcome.periodStartsAt < flow.startsAt ||
      outcome.periodEndsAt < outcome.periodStartsAt ||
      outcome.occurredAt < outcome.periodEndsAt
    )
      throw new Error(`Invalid resource outcome chronology: ${outcome.id}`);
    if (
      h.resourceTransferOutcomes.some(
        (other) =>
          other.sequence < outcome.sequence &&
          other.resourceFlowId === outcome.resourceFlowId &&
          settlementPeriodsOverlap(
            outcome.periodStartsAt,
            outcome.periodEndsAt,
            other.periodStartsAt,
            other.periodEndsAt,
          ),
      )
    ) {
      throw new Error(
        `Resource outcome has an overlapping settlement period: ${outcome.id}`,
      );
    }
    money(outcome.attemptedAmount, "attempted resource amount", true);
    money(outcome.transferredAmount, "transferred resource amount");
    if (outcome.attemptedAmount.currency !== outcome.transferredAmount.currency)
      throw new Error(`Resource outcome currencies disagree: ${outcome.id}`);
    const terms = resourceFlowTermsAt(world, flow.id, {
      asOfDate: outcome.periodStartsAt,
      historySequenceExclusive: outcome.sequence,
    });
    if (
      h.resourceFlowTerms.some(
        (record) =>
          record.resourceFlowId === flow.id &&
          record.sequence < outcome.sequence &&
          record.effectiveAt > outcome.periodStartsAt &&
          record.effectiveAt <= outcome.periodEndsAt,
      )
    ) {
      throw new Error(
        `Resource outcome crosses an unprorated terms change: ${outcome.id}`,
      );
    }
    if (
      !terms ||
      terms.status !== "active" ||
      !sameMoney(terms.amount, outcome.attemptedAmount)
    )
      throw new Error(
        `Resource outcome lacks matching active terms: ${outcome.id}`,
      );
    validateOutcome(
      outcome.status,
      outcome.attemptedAmount.minorUnits,
      outcome.transferredAmount.minorUnits,
      outcome.id,
    );
    if (
      outcome.status !== "completed" &&
      (outcome.reasonKind === null ||
        !isOpenTaxonomyKey(
          outcome.reasonKind,
          RESOURCE_OUTCOME_REASON_NAMESPACES,
        ))
    )
      throw new Error(`Resource outcome lacks a valid reason: ${outcome.id}`);
    if (
      outcome.reasonKind !== null &&
      !isOpenTaxonomyKey(outcome.reasonKind, RESOURCE_OUTCOME_REASON_NAMESPACES)
    )
      throw new Error(`Invalid resource outcome reason: ${outcome.id}`);
    optional(outcome.note, "resource outcome note");
    provenance(world, outcome.provenance, outcome.occurredAt, outcome.sequence);
    const owner = endpointOwner(flow.source);
    if (owner && outcome.transferredAmount.minorUnits > 0) {
      const before = resourcePositionAt(
        world,
        owner,
        outcome.transferredAmount.currency,
        {
          asOfDate: outcome.occurredAt,
          historySequenceExclusive: outcome.sequence,
        },
      );
      if (
        before &&
        before.liquidBalance.minorUnits < outcome.transferredAmount.minorUnits
      )
        throw new Error(
          `Resource outcome overdrew its tracked source: ${outcome.id}`,
        );
    }
  }

  for (const obligation of h.resourceObligations) {
    const flow = byId(h.resourceFlows, obligation.resourceFlowId);
    if (
      !flow ||
      flow.sequence >= obligation.sequence ||
      flow.source.kind === "organization"
    )
      throw new Error(
        `Resource obligation has an invalid flow: ${obligation.id}`,
      );
    dateInWorld(world, obligation.establishedAt, obligation.id);
    if (obligation.establishedAt < flow.startsAt)
      throw new Error(
        `Resource obligation predates its flow: ${obligation.id}`,
      );
    if (
      h.resourceObligations.some(
        (other) =>
          other.sequence < obligation.sequence &&
          other.resourceFlowId === obligation.resourceFlowId,
      )
    ) {
      throw new Error(
        `Resource flow has duplicate major obligations: ${obligation.id}`,
      );
    }
    if (
      !isOpenTaxonomyKey(
        obligation.basisKind,
        RESOURCE_OBLIGATION_BASIS_NAMESPACES,
      )
    )
      throw new Error(`Invalid resource obligation basis: ${obligation.id}`);
    if (obligation.principal) {
      money(obligation.principal, "resource obligation principal", true);
      const terms = resourceFlowTermsAt(world, flow.id, {
        asOfDate: obligation.establishedAt,
        historySequenceExclusive: obligation.sequence,
      });
      if (!terms || terms.amount.currency !== obligation.principal.currency)
        throw new Error(
          `Resource obligation principal currency mismatch: ${obligation.id}`,
        );
      let paid = 0;
      for (const outcome of h.resourceTransferOutcomes) {
        if (
          outcome.resourceFlowId !== flow.id ||
          outcome.sequence <= obligation.sequence ||
          outcome.occurredAt < obligation.establishedAt
        ) {
          continue;
        }
        paid += outcome.transferredAmount.minorUnits;
        if (
          !Number.isSafeInteger(paid) ||
          paid > obligation.principal.minorUnits
        ) {
          throw new Error(`Resource obligation is overpaid: ${obligation.id}`);
        }
      }
    }
    if (
      obligation.careResponsibilityId !== null &&
      obligation.housingTenureId !== null
    )
      throw new Error(
        `Resource obligation has multiple structural contexts: ${obligation.id}`,
      );
    priorReference(
      h.careResponsibilities,
      obligation.careResponsibilityId,
      obligation.sequence,
      obligation.id,
      "care responsibility",
    );
    priorReference(
      h.housingTenures,
      obligation.housingTenureId,
      obligation.sequence,
      obligation.id,
      "housing tenure",
    );
    provenance(
      world,
      obligation.provenance,
      obligation.establishedAt,
      obligation.sequence,
    );
    const states = resourceObligationStateHistory(world, obligation.id);
    if (
      !states[0] ||
      states[0].status !== "active" ||
      states[0].effectiveAt !== obligation.establishedAt
    )
      throw new Error(
        `Resource obligation lacks initial state: ${obligation.id}`,
      );
  }

  for (const state of h.resourceObligationStates) {
    const obligation = byId(h.resourceObligations, state.resourceObligationId);
    if (!obligation || obligation.sequence >= state.sequence)
      throw new Error(
        `Resource obligation state has a dangling parent: ${state.id}`,
      );
    dateInWorld(world, state.effectiveAt, state.id);
    member(
      ["active", "satisfied", "ended"],
      state.status,
      "resource obligation status",
    );
    supersession(
      state,
      state.supersedesStateId,
      h.resourceObligationStates,
      (record) => record.resourceObligationId,
      (record) => record.effectiveAt,
      "resource obligation state",
    );
    const prior = state.supersedesStateId
      ? byId(h.resourceObligationStates, state.supersedesStateId)
      : undefined;
    if (prior && (prior.status !== "active" || state.status === "active"))
      throw new Error(`Invalid resource obligation lifecycle: ${state.id}`);
    if (state.status !== "active")
      nonEmpty(state.reason, "resource obligation terminal reason");
    if (state.status === "satisfied" && obligation.principal) {
      const outstanding = outstandingDebtAt(world, obligation.id, {
        asOfDate: state.effectiveAt,
        historySequenceExclusive: state.sequence,
      });
      if (outstanding?.minorUnits !== 0)
        throw new Error(`Satisfied debt retains principal: ${state.id}`);
    }
    provenance(world, state.provenance, state.effectiveAt, state.sequence);
  }

  for (const dwelling of h.dwellings) {
    dateInWorld(world, dwelling.establishedAt, dwelling.id);
    if (!world.jurisdictions[dwelling.jurisdictionId])
      throw new Error(`Dwelling has missing jurisdiction: ${dwelling.id}`);
    nonEmpty(dwelling.locationLabel, "dwelling location label");
    if (
      !isOpenTaxonomyKey(
        dwelling.classification,
        DWELLING_CLASSIFICATION_NAMESPACES,
      )
    )
      throw new Error(`Invalid dwelling classification: ${dwelling.id}`);
    provenance(
      world,
      dwelling.provenance,
      dwelling.establishedAt,
      dwelling.sequence,
    );
  }

  for (const occupancy of h.dwellingOccupancies) {
    const dwelling = byId(h.dwellings, occupancy.dwellingId);
    if (
      !dwelling ||
      dwelling.sequence >= occupancy.sequence ||
      dwelling.establishedAt > occupancy.startedAt
    )
      throw new Error(
        `Dwelling occupancy has invalid dwelling: ${occupancy.id}`,
      );
    entityReference(
      world,
      occupancy.occupant,
      occupancy.startedAt,
      occupancy.sequence,
      occupancy.id,
    );
    provenance(
      world,
      occupancy.provenance,
      occupancy.startedAt,
      occupancy.sequence,
    );
    const states = dwellingOccupancyStateHistory(world, occupancy.id);
    if (
      !states[0] ||
      states[0].status !== "active" ||
      states[0].effectiveAt !== occupancy.startedAt
    )
      throw new Error(
        `Dwelling occupancy lacks initial state: ${occupancy.id}`,
      );
    if (
      states[0].residenceRole === "primary" &&
      activeDwellingOccupanciesAt(world, {
        asOfDate: occupancy.startedAt,
        historySequenceExclusive: occupancy.sequence,
      }).some((other) => sameEndpoint(other.occupant, occupancy.occupant))
    ) {
      throw new Error(
        `Dwelling occupancy overlaps a primary residence: ${occupancy.id}`,
      );
    }
  }

  for (const state of h.dwellingOccupancyStates) {
    const occupancy = byId(h.dwellingOccupancies, state.dwellingOccupancyId);
    if (!occupancy || occupancy.sequence >= state.sequence)
      throw new Error(
        `Dwelling occupancy state has dangling parent: ${state.id}`,
      );
    entityReference(
      world,
      occupancy.occupant,
      state.effectiveAt,
      state.sequence,
      state.id,
    );
    member(["active", "ended"], state.status, "dwelling occupancy status");
    member(
      ["primary", "secondary", "shared"],
      state.residenceRole,
      "dwelling residence role",
    );
    if (!isOpenTaxonomyKey(state.kind, DWELLING_OCCUPANCY_NAMESPACES))
      throw new Error(`Invalid dwelling occupancy kind: ${state.id}`);
    supersession(
      state,
      state.supersedesStateId,
      h.dwellingOccupancyStates,
      (record) => record.dwellingOccupancyId,
      (record) => record.effectiveAt,
      "dwelling occupancy state",
    );
    const prior = state.supersedesStateId
      ? byId(h.dwellingOccupancyStates, state.supersedesStateId)
      : undefined;
    if (prior && (prior.status === "ended" || state.status !== "ended"))
      throw new Error(`Invalid dwelling occupancy lifecycle: ${state.id}`);
    if (state.status === "ended")
      nonEmpty(state.reason, "dwelling occupancy end reason");
    provenance(world, state.provenance, state.effectiveAt, state.sequence);
  }

  for (const tenure of h.housingTenures) {
    const dwelling = byId(h.dwellings, tenure.dwellingId);
    if (
      !dwelling ||
      dwelling.sequence >= tenure.sequence ||
      dwelling.establishedAt > tenure.startedAt
    )
      throw new Error(`Housing tenure has invalid dwelling: ${tenure.id}`);
    entityReference(
      world,
      tenure.holder,
      tenure.startedAt,
      tenure.sequence,
      tenure.id,
    );
    if (!isOpenTaxonomyKey(tenure.kind, HOUSING_TENURE_NAMESPACES))
      throw new Error(`Invalid housing tenure kind: ${tenure.id}`);
    provenance(world, tenure.provenance, tenure.startedAt, tenure.sequence);
    const states = housingTenureStateHistory(world, tenure.id);
    if (
      !states[0] ||
      states[0].status !== "active" ||
      states[0].effectiveAt !== tenure.startedAt
    )
      throw new Error(`Housing tenure lacks initial state: ${tenure.id}`);
  }

  for (const state of h.housingTenureStates) {
    const tenure = byId(h.housingTenures, state.housingTenureId);
    if (!tenure || tenure.sequence >= state.sequence)
      throw new Error(`Housing tenure state has dangling parent: ${state.id}`);
    entityReference(
      world,
      tenure.holder,
      state.effectiveAt,
      state.sequence,
      state.id,
    );
    member(["active", "ended"], state.status, "housing tenure status");
    optional(state.context, "housing tenure context");
    supersession(
      state,
      state.supersedesStateId,
      h.housingTenureStates,
      (record) => record.housingTenureId,
      (record) => record.effectiveAt,
      "housing tenure state",
    );
    const prior = state.supersedesStateId
      ? byId(h.housingTenureStates, state.supersedesStateId)
      : undefined;
    if (prior && (prior.status === "ended" || state.status !== "ended"))
      throw new Error(`Invalid housing tenure lifecycle: ${state.id}`);
    provenance(world, state.provenance, state.effectiveAt, state.sequence);
  }
}

function entityReference(
  world: World,
  reference:
    | ResourceEndpoint
    | ResourcePositionOwner
    | DwellingOccupant
    | HousingTenureHolder,
  date: string,
  sequence: number,
  recordId: EntityId,
): void {
  makeIsoDate(date);
  switch (reference.kind) {
    case "person": {
      const person = world.people[reference.personId];
      if (!person || person.birthDate > date)
        throw new Error(`Record has unavailable person reference: ${recordId}`);
      return;
    }
    case "household": {
      const household = byId(world.history.households, reference.householdId);
      if (
        !household ||
        household.sequence >= sequence ||
        household.formedAt > date
      )
        throw new Error(
          `Record has unavailable household reference: ${recordId}`,
        );
      return;
    }
    case "organization": {
      const organization = byId(
        world.history.organizations,
        reference.organizationId,
      );
      if (
        !organization ||
        organization.sequence >= sequence ||
        organization.formedAt > date
      )
        throw new Error(
          `Record has unavailable organization reference: ${recordId}`,
        );
      return;
    }
  }
}

function validateBasisReference(
  world: World,
  reference: World["history"]["resourceFlows"][number]["basisReference"],
  sequence: number,
  date: string,
  recordId: EntityId,
): void {
  switch (reference.kind) {
    case "work":
      priorDatedReference(
        world.history.workRelationships,
        reference.workRelationshipId,
        sequence,
        date,
        recordId,
        "work relationship",
        (record) => record.startedAt,
      );
      return;
    case "care":
      priorDatedReference(
        world.history.careResponsibilities,
        reference.careResponsibilityId,
        sequence,
        date,
        recordId,
        "care responsibility",
        (record) => record.startedAt,
      );
      return;
    case "housing":
      priorDatedReference(
        world.history.housingTenures,
        reference.housingTenureId,
        sequence,
        date,
        recordId,
        "housing tenure",
        (record) => record.startedAt,
      );
      return;
    case "general":
      return;
  }
}

function provenance(
  world: World,
  value: LifeRecordProvenance,
  effectiveAt: string,
  sequence: number,
): void {
  switch (value.kind) {
    case "authored":
      nonEmpty(value.note, "authored resource provenance note");
      return;
    case "generated":
      nonEmpty(value.generatorKey, "generated resource provenance key");
      return;
    case "simulated-event": {
      const event = byId(world.history.events, value.eventId);
      if (
        !event ||
        event.sequence >= sequence ||
        event.occurredAt > effectiveAt
      )
        throw new Error("Resource provenance references an unavailable event.");
      return;
    }
    case "source-record":
      nonEmpty(value.reference, "resource source-record reference");
      if (value.asOf > effectiveAt)
        throw new Error("Resource source provenance postdates its record.");
      return;
  }
}

function supersession<
  T extends { readonly id: EntityId; readonly sequence: number },
>(
  record: T,
  priorId: EntityId | null,
  records: readonly T[],
  parent: (value: T) => EntityId,
  date: (value: T) => string,
  label: string,
): void {
  const siblings = records.filter(
    (candidate) =>
      parent(candidate) === parent(record) &&
      candidate.sequence < record.sequence,
  );
  const prior = priorId ? byId(records, priorId) : undefined;
  if (siblings.length === 0) {
    if (priorId !== null)
      throw new Error(`Initial ${label} cannot supersede a record.`);
    return;
  }
  if (
    !prior ||
    prior.sequence >= record.sequence ||
    parent(prior) !== parent(record) ||
    date(prior) > date(record) ||
    siblings.at(-1)?.id !== prior.id
  ) {
    throw new Error(`Invalid ${label} supersession.`);
  }
}

function priorReference<
  T extends { readonly id: EntityId; readonly sequence: number },
>(
  records: readonly T[],
  id: EntityId | null,
  sequence: number,
  recordId: EntityId,
  label: string,
): void {
  if (id === null) return;
  const record = byId(records, id);
  if (!record || record.sequence >= sequence)
    throw new Error(`${recordId} has unavailable ${label}.`);
}

function priorDatedReference<
  T extends { readonly id: EntityId; readonly sequence: number },
>(
  records: readonly T[],
  id: EntityId,
  sequence: number,
  date: string,
  recordId: EntityId,
  label: string,
  recordDate: (value: T) => string,
): void {
  const record = byId(records, id);
  if (!record || record.sequence >= sequence || recordDate(record) > date)
    throw new Error(`${recordId} has unavailable ${label}.`);
}

function validateOutcome(
  status: string,
  attempted: number,
  transferred: number,
  id: EntityId,
): void {
  if (status === "completed" && transferred !== attempted)
    throw new Error(`Completed outcome amount mismatch: ${id}`);
  if (status === "partial" && !(transferred > 0 && transferred < attempted))
    throw new Error(`Partial outcome amount mismatch: ${id}`);
  if ((status === "missed" || status === "blocked") && transferred !== 0)
    throw new Error(`Non-transfer outcome has transferred money: ${id}`);
  member(
    ["completed", "partial", "missed", "blocked"],
    status,
    "resource outcome status",
  );
}

function settlementPeriodsOverlap(
  leftStartsAt: string,
  leftEndsAt: string,
  rightStartsAt: string,
  rightEndsAt: string,
): boolean {
  return leftStartsAt <= rightEndsAt && rightStartsAt <= leftEndsAt;
}

function money(value: MoneyAmount, label: string, positive = false): void {
  if (
    !CURRENCY_CODE.test(value.currency) ||
    !Number.isSafeInteger(value.minorUnits) ||
    value.minorUnits < 0 ||
    (positive && value.minorUnits === 0)
  )
    throw new Error(`Invalid ${label}.`);
}

function sameMoney(left: MoneyAmount, right: MoneyAmount): boolean {
  return (
    left.currency === right.currency && left.minorUnits === right.minorUnits
  );
}

function endpointOwner(
  endpoint: ResourceEndpoint,
): ResourcePositionOwner | null {
  return endpoint.kind === "organization" ? null : { ...endpoint };
}

function dateInWorld(world: World, value: string, recordId: EntityId): void {
  if (makeIsoDate(value) > world.currentDate)
    throw new Error(`Record date is in the future: ${recordId}`);
}

function assertOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  )
    throw new Error(`${label} history is not in append-sequence order.`);
}

function byId<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
): T | undefined {
  return records.find((record) => record.id === id);
}

function member<T extends string>(
  values: readonly T[],
  value: string,
  label: string,
): void {
  if (!values.includes(value as T))
    throw new Error(`Invalid ${label}: ${value}`);
}

function optional(value: string | null, label: string): void {
  if (value !== null) nonEmpty(value, label);
}

function nonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${label} must be a non-empty string.`);
}

function earlier<T extends string>(left: T, right: T): T {
  return left < right ? left : right;
}
