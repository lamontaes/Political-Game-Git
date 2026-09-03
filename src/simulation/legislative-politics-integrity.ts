import { makeIsoDate } from "./dates";
import type { EntityId, LegislativeCommitmentCondition, World } from "./types";

/**
 * Integrity rules for the political layer over legislation.
 *
 * The load-bearing one is the third check below: a snapshot may not claim that
 * a bill's text changed unless it also carries the amendment the chamber
 * adopted to change it. Everything a negotiation produces is otherwise just a
 * record of what people said, and a save that lost the amendment but kept the
 * rewritten section would be a save that lets conversation legislate.
 */

const RECORD_KINDS = {
  provision: "legislative-provision",
  commitment: "legislative-commitment",
  negotiation: "legislative-negotiation",
} as const;

function assertIdentity(
  ids: Set<EntityId>,
  record: { readonly id: EntityId; readonly sequence: number },
  kind: string,
): void {
  if (ids.has(record.id)) {
    throw new Error(`Duplicate history record identity: ${record.id}`);
  }
  ids.add(record.id);
  if (!record.id.startsWith(`${kind}_`)) {
    throw new Error(
      `Record ID does not match entity kind ${kind}: ${record.id}`,
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0) {
    throw new Error(
      `Record sequence must be a non-negative safe integer: ${record.id}`,
    );
  }
}

export function assertLegislativePoliticsIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const provisions = world.history.legislativeProvisions ?? [];
  const commitments = world.history.legislativeCommitments ?? [];
  const negotiations = world.history.legislativeNegotiations ?? [];
  const measures = world.history.legislativeMeasures ?? [];
  const amendments = world.history.legislativeAmendments ?? [];
  const eventIds = new Set(world.history.events.map((event) => event.id));
  const claimById = new Map(
    world.history.claims.map((claim) => [claim.id, claim]),
  );
  const measureById = new Map(measures.map((measure) => [measure.id, measure]));

  const provisionById = new Map<EntityId, (typeof provisions)[number]>();
  const supersededBy = new Map<EntityId, EntityId>();
  const amendmentCarriedBy = new Map<EntityId, EntityId>();

  for (const provision of provisions) {
    assertIdentity(ids, provision, RECORD_KINDS.provision);
    provisionById.set(provision.id, provision);
    const measure = measureById.get(provision.measureId);
    if (!measure) {
      throw new Error(
        `Legislative provision references a missing measure: ${provision.id}`,
      );
    }
    makeIsoDate(provision.recordedAt);
    if (!eventIds.has(provision.eventId)) {
      throw new Error(
        `Legislative provision references a missing event: ${provision.id}`,
      );
    }
    if (
      !provision.provisionKey.trim() ||
      !provision.heading.trim() ||
      !provision.text.trim()
    ) {
      throw new Error(
        `Legislative provision is missing its key, heading or text: ${provision.id}`,
      );
    }
    if (
      !Number.isSafeInteger(provision.sectionNumber) ||
      provision.sectionNumber < 1
    ) {
      throw new Error(
        `Legislative provision has an impossible section number: ${provision.id}`,
      );
    }
    if (provision.applicationScope.jurisdictionId !== measure.jurisdictionId) {
      throw new Error(
        `Legislative provision applies outside its own measure's jurisdiction: ${provision.id}`,
      );
    }
    if (!world.jurisdictions[provision.applicationScope.jurisdictionId]) {
      throw new Error(
        `Legislative provision references a missing jurisdiction: ${provision.id}`,
      );
    }
    if (
      (provision.fiscalExposureMinorUnits === null) !==
      (provision.fiscalExposureLabel === null)
    ) {
      throw new Error(
        `Legislative provision states an exposure in only one of its two forms: ${provision.id}`,
      );
    }
    if (
      provision.fiscalExposureMinorUnits !== null &&
      (!Number.isSafeInteger(provision.fiscalExposureMinorUnits) ||
        provision.fiscalExposureMinorUnits < 0)
    ) {
      throw new Error(
        `Legislative provision states an impossible exposure: ${provision.id}`,
      );
    }
    if (
      provision.beneficiary.kind === "particularized" &&
      (!provision.beneficiary.beneficiaryLabel.trim() ||
        !provision.beneficiary.statedGround.trim())
    ) {
      throw new Error(
        `A particularized provision must name its beneficiary and its stated ground: ${provision.id}`,
      );
    }
    if (
      provision.beneficiary.kind === "general-application" &&
      !provision.beneficiary.appliesToLabel.trim()
    ) {
      throw new Error(
        `A general-application provision must say who it reaches: ${provision.id}`,
      );
    }

    // Only an adopted amendment may change a bill.
    if (provision.supersedesProvisionId !== null) {
      const superseded = provisionById.get(provision.supersedesProvisionId);
      if (!superseded || superseded.measureId !== provision.measureId) {
        throw new Error(
          `Legislative provision supersedes a section of another measure: ${provision.id}`,
        );
      }
      if (superseded.provisionKey !== provision.provisionKey) {
        throw new Error(
          `A provision revision changed the section's identity: ${provision.id}`,
        );
      }
      const already = supersededBy.get(superseded.id);
      if (already) {
        throw new Error(
          `Two versions claim to replace the same section: ${provision.id}`,
        );
      }
      supersededBy.set(superseded.id, provision.id);
      if (provision.originAmendmentId === null) {
        throw new Error(
          `A bill's text changed without an amendment to carry it: ${provision.id}`,
        );
      }
    }
    if (provision.originAmendmentId !== null) {
      const amendment = amendments.find(
        (record) => record.id === provision.originAmendmentId,
      );
      if (!amendment || amendment.measureId !== provision.measureId) {
        throw new Error(
          `Legislative provision cites an amendment to another measure: ${provision.id}`,
        );
      }
      if (amendment.status !== "adopted") {
        throw new Error(
          `A rejected amendment cannot be carrying text in the bill: ${provision.id}`,
        );
      }
      if (amendmentCarriedBy.has(amendment.id)) {
        throw new Error(
          `One amendment is carrying two sections into the bill: ${provision.id}`,
        );
      }
      amendmentCarriedBy.set(amendment.id, provision.id);
    }
  }

  // At most one live version of any section.
  const liveByKey = new Map<string, EntityId>();
  for (const provision of provisions) {
    if (supersededBy.has(provision.id)) continue;
    const key = `${provision.measureId}:${provision.provisionKey}`;
    const existing = liveByKey.get(key);
    if (existing) {
      throw new Error(
        `A measure carries two live versions of the same section: ${provision.id}`,
      );
    }
    liveByKey.set(key, provision.id);
  }

  for (const commitment of commitments) {
    assertIdentity(ids, commitment, RECORD_KINDS.commitment);
    if (!world.people[commitment.holderPersonId]) {
      throw new Error(
        `Legislative commitment references a missing holder: ${commitment.id}`,
      );
    }
    if (!measureById.has(commitment.subject.measureId)) {
      throw new Error(
        `Legislative commitment references a missing measure: ${commitment.id}`,
      );
    }
    makeIsoDate(commitment.statedAt);
    if (!eventIds.has(commitment.eventId)) {
      throw new Error(
        `Legislative commitment references a missing event: ${commitment.id}`,
      );
    }
    if (commitment.claimId !== null) {
      const claim = claimById.get(commitment.claimId);
      if (!claim) {
        throw new Error(
          `Legislative commitment references a missing claim: ${commitment.id}`,
        );
      }
      if (claim.speakerPersonId !== commitment.holderPersonId) {
        throw new Error(
          `Legislative commitment cites somebody else's words: ${commitment.id}`,
        );
      }
    }
    if (!commitment.statement.trim()) {
      throw new Error(
        `Legislative commitment records no statement: ${commitment.id}`,
      );
    }
    for (const personId of commitment.heardByPersonIds) {
      if (!world.people[personId]) {
        throw new Error(
          `Legislative commitment lists a missing listener: ${commitment.id}`,
        );
      }
    }
    if (
      commitment.audience === "private" &&
      commitment.heardByPersonIds.length > 2
    ) {
      throw new Error(
        `A private commitment cannot have a room full of listeners: ${commitment.id}`,
      );
    }
    assertConditions(commitment.id, commitment.conditions);
  }

  for (const negotiation of negotiations) {
    assertIdentity(ids, negotiation, RECORD_KINDS.negotiation);
    if (!measureById.has(negotiation.measureId)) {
      throw new Error(
        `Legislative negotiation references a missing measure: ${negotiation.id}`,
      );
    }
    if (
      !world.people[negotiation.initiatorPersonId] ||
      !world.people[negotiation.counterpartyPersonId]
    ) {
      throw new Error(
        `Legislative negotiation references a missing person: ${negotiation.id}`,
      );
    }
    if (negotiation.initiatorPersonId === negotiation.counterpartyPersonId) {
      throw new Error(
        `Legislative negotiation has one person on both sides: ${negotiation.id}`,
      );
    }
    makeIsoDate(negotiation.occurredAt);
    if (!eventIds.has(negotiation.eventId)) {
      throw new Error(
        `Legislative negotiation references a missing event: ${negotiation.id}`,
      );
    }
    if (!negotiation.request.trim()) {
      throw new Error(
        `Legislative negotiation records no request: ${negotiation.id}`,
      );
    }
    if (
      negotiation.provisionKey !== null &&
      !provisions.some(
        (provision) =>
          provision.measureId === negotiation.measureId &&
          provision.provisionKey === negotiation.provisionKey,
      )
    ) {
      throw new Error(
        `Legislative negotiation names a section the measure never had: ${negotiation.id}`,
      );
    }
    if (
      negotiation.decisionTraceId !== null &&
      !world.history.decisionTraces.some(
        (trace) => trace.id === negotiation.decisionTraceId,
      )
    ) {
      throw new Error(
        `Legislative negotiation references a missing decision trace: ${negotiation.id}`,
      );
    }
  }
}

function assertConditions(
  commitmentId: EntityId,
  conditions: readonly LegislativeCommitmentCondition[],
): void {
  const keys = new Set<string>();
  for (const condition of conditions) {
    if (!condition.key.trim() || !condition.description.trim()) {
      throw new Error(
        `Commitment condition is missing its key or description: ${commitmentId}`,
      );
    }
    if (keys.has(condition.key)) {
      throw new Error(
        `Duplicate commitment condition key: ${commitmentId}/${condition.key}`,
      );
    }
    keys.add(condition.key);
    if (
      condition.kind === "fiscal-ceiling" &&
      (!Number.isSafeInteger(condition.ceilingMinorUnits) ||
        condition.ceilingMinorUnits < 0)
    ) {
      throw new Error(
        `Commitment fiscal ceiling is not a usable amount: ${commitmentId}`,
      );
    }
  }
}
