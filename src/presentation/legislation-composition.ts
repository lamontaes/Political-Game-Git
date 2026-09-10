import {
  adoptProvisionRevisions,
  currentMeasureProvisions,
  recordWorldEvent,
  type EntityId,
  type LegislativeProvisionRecord,
  type World,
} from "../simulation";
import {
  compileBillDraft,
  type CompiledBillDraft,
  type CompiledClause,
} from "../simulation/legislation-drafting";
import type { ProgramParameterValue } from "../simulation/legislation-program-families";
import {
  docketBill,
  recompileSavedBill,
  type DocketBill,
} from "./legislation-docket";
import { resolveActiveMemberSeat } from "./legislative-member-seat";

export interface TypedSectionChange {
  readonly before: LegislativeProvisionRecord;
  readonly after: CompiledClause;
}
export interface BillCompositionPreview {
  readonly bill: DocketBill;
  readonly baseline: CompiledBillDraft;
  readonly proposed: CompiledBillDraft;
  readonly changes: readonly TypedSectionChange[];
}
const PARAMETER_EVENT = "legislation.typed-amendment-parameters";

function compileFrom(
  base: CompiledBillDraft,
  parameterValues: Readonly<Record<string, ProgramParameterValue>>,
): CompiledBillDraft {
  return compileBillDraft({
    familyKey: base.familyKey,
    variantKey: base.variantKey,
    scenarioKey: base.scenarioKey,
    jurisdictionId: base.jurisdictionId,
    rulePackId: base.rulePackId,
    designation: base.designation,
    filedOn: base.filedOn,
    parameterValues,
    ...(base.predicateAuthority
      ? { predicateAuthority: base.predicateAuthority }
      : {}),
  });
}

/** Read only: original lineage plus explicit adopted typed edits, never prose parsing. */
export function currentCompositionDraft(
  world: World,
  bill: DocketBill,
  personId: EntityId,
): CompiledBillDraft {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("This working document belongs to another character.");
  const original = recompileSavedBill(world, bill, personId);
  if ("unavailable" in original) throw new Error(original.unavailable);
  const latest = world.history.events
    .filter(
      (e) =>
        e.type === PARAMETER_EVENT &&
        e.participants.some((p) => p.personId === personId) &&
        e.involvedEntityIds.includes(bill.measureId),
    )
    .at(-1);
  if (!latest) return original;
  const saved: unknown = JSON.parse(latest.context.choice ?? "null");
  if (
    !saved ||
    typeof saved !== "object" ||
    !("amendmentId" in saved) ||
    !("parameters" in saved) ||
    !("familyVersion" in saved) ||
    saved.familyVersion !== original.familyVersion ||
    !(world.history.legislativeAmendments ?? []).some(
      (a) =>
        a.id === saved.amendmentId &&
        a.measureId === bill.measureId &&
        a.status === "adopted",
    )
  ) {
    throw new Error(
      "The saved amendment parameters cannot be reconciled with the bill's history.",
    );
  }
  // The compiler validates each typed value and rejects unknown parameter keys.
  return compileFrom(
    original,
    saved.parameters as Readonly<Record<string, ProgramParameterValue>>,
  );
}

function clausePayload(
  clause: CompiledClause | LegislativeProvisionRecord,
): string {
  return JSON.stringify({
    provisionKey: clause.provisionKey,
    sectionNumber: clause.sectionNumber,
    heading: clause.heading,
    text: clause.text,
    beneficiary: clause.beneficiary,
    fiscalExposureLabel: clause.fiscalExposureLabel,
    fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
    fiscalPeriod: clause.fiscalPeriod ?? null,
  });
}

/** Multiple compatible edits are compiled together, including dependent timing clauses. */
export function previewBillComposition(
  world: World,
  bill: DocketBill,
  personId: EntityId,
  parameterValues: Readonly<Record<string, ProgramParameterValue>>,
): BillCompositionPreview {
  const baseline = currentCompositionDraft(world, bill, personId);
  const proposed = compileFrom(baseline, {
    ...baseline.parameterValues,
    ...parameterValues,
  });
  const current = currentMeasureProvisions(world, bill.measureId);
  const changes: TypedSectionChange[] = [];
  for (const after of proposed.clauses) {
    const original = baseline.clauses.find(
      (c) => c.provisionKey === after.provisionKey,
    );
    if (!original)
      throw new Error(
        "This configuration does not support adding a new section.",
      );
    if (clausePayload(original) === clausePayload(after)) continue;
    const before = current.find((c) => c.provisionKey === after.provisionKey);
    if (!before || clausePayload(before) !== clausePayload(original)) {
      throw new Error(
        `Section ${after.sectionNumber} changed outside this typed draft. Its current text must be reconciled before editing it here.`,
      );
    }
    changes.push({ before, after });
  }
  return { bill, baseline, proposed, changes };
}

export interface SaveBillCompositionInput {
  readonly scenarioKey: string;
  readonly docketKey: string;
  readonly playerPersonId: EntityId;
  readonly expectedProvisionIds: readonly EntityId[];
  readonly parameterValues: Readonly<Record<string, ProgramParameterValue>>;
}
const PROPOSAL_EVENT = "legislation.typed-amendment-working-copy";

function checkedPreview(world: World, input: SaveBillCompositionInput) {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId
  )
    throw new Error("Only the current player may prepare these changes.");
  const bill = docketBill(world, input);
  if (!bill) throw new Error("This bill is no longer on the docket.");
  const seat = resolveActiveMemberSeat(world, input.playerPersonId);
  if (
    seat.kind !== "seated" ||
    seat.seat.governingJurisdictionId !== bill.jurisdictionId ||
    seat.seat.legislativeRulePackId !==
      (world.history.legislativeMeasures ?? []).find(
        (m) => m.id === bill.measureId,
      )?.rulePackId
  )
    throw new Error(
      "This character has no supported member seat for this bill.",
    );
  const currentIds = currentMeasureProvisions(world, bill.measureId).map(
    (p) => p.id,
  );
  if (JSON.stringify(currentIds) !== JSON.stringify(input.expectedProvisionIds))
    throw new Error(
      "The bill changed after this comparison. Review its current text first.",
    );
  const preview = previewBillComposition(
    world,
    bill,
    input.playerPersonId,
    input.parameterValues,
  );
  if (!preview.changes.length)
    throw new Error("Choose at least one change to save.");
  return preview;
}

/** An explicit private working document, with no vote, appointment or passage implied. */
export function saveBillComposition(
  world: World,
  input: SaveBillCompositionInput,
): { readonly world: World; readonly proposalEventId: EntityId } {
  const preview = checkedPreview(world, input);
  const next = recordWorldEvent(world, {
    stableKey: `typed-amendment-working-copy:${input.playerPersonId}:${world.history.nextSequence}`,
    type: PROPOSAL_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: preview.bill.jurisdictionId,
    participants: [
      {
        personId: input.playerPersonId,
        role: "agency:author",
        detail: "Saved proposed changes to a working document.",
      },
    ],
    involvedEntityIds: [preview.bill.measureId, input.playerPersonId],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation.document"],
    summary: `Saved proposed changes to ${preview.bill.designation}.`,
    context: {
      location: null,
      socialContext: input.scenarioKey,
      pressure: null,
      choice: JSON.stringify({
        familyVersion: preview.proposed.familyVersion,
        parameters: preview.proposed.parameterValues,
        expectedProvisionIds: input.expectedProvisionIds,
      }),
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, proposalEventId: next.history.events.at(-1)!.id };
}

/** Read only and actor-private, including after save/reload. */
export function savedBillComposition(
  world: World,
  bill: DocketBill,
  personId: EntityId,
): Readonly<Record<string, ProgramParameterValue>> | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const event = world.history.events
    .filter(
      (e) =>
        e.type === PROPOSAL_EVENT &&
        e.visibility === "private" &&
        e.participants.some((p) => p.personId === personId) &&
        e.involvedEntityIds.includes(bill.measureId),
    )
    .at(-1);
  if (!event) return null;
  const saved = JSON.parse(event.context.choice ?? "null");
  if (!saved || saved.familyVersion !== bill.familyVersion) return null;
  const currentIds = currentMeasureProvisions(world, bill.measureId).map(
    (p) => p.id,
  );
  if (JSON.stringify(currentIds) !== JSON.stringify(saved.expectedProvisionIds))
    return null;
  return previewBillComposition(world, bill, personId, saved.parameters)
    .proposed.parameterValues;
}

/** Carries text only after the existing engine records adoption linked to this working copy. */
export function carryAdoptedBillComposition(
  world: World,
  input: SaveBillCompositionInput & {
    readonly proposalEventId: EntityId;
    readonly amendmentId: EntityId;
  },
): World {
  const preview = checkedPreview(world, input);
  const proposal = world.history.events.find(
    (e) =>
      e.id === input.proposalEventId &&
      e.type === PROPOSAL_EVENT &&
      e.participants.some((p) => p.personId === input.playerPersonId) &&
      e.involvedEntityIds.includes(preview.bill.measureId),
  );
  const saved = proposal ? JSON.parse(proposal.context.choice ?? "null") : null;
  if (
    !saved ||
    saved.familyVersion !== preview.proposed.familyVersion ||
    JSON.stringify(saved.parameters) !==
      JSON.stringify(preview.proposed.parameterValues) ||
    JSON.stringify(saved.expectedProvisionIds) !==
      JSON.stringify(input.expectedProvisionIds)
  )
    throw new Error(
      "The adopted text must match the saved working copy exactly.",
    );
  const amendment = world.history.legislativeAmendments?.find(
    (a) =>
      a.id === input.amendmentId &&
      a.measureId === preview.bill.measureId &&
      a.offeredByPersonId === input.playerPersonId &&
      a.status === "adopted",
  );
  const vote =
    amendment &&
    world.history.legislativeVotes?.find(
      (v) =>
        v.id === amendment.voteId &&
        v.purpose === "amendment" &&
        v.outcome === "passed" &&
        v.provenance.sourceEntityIds.includes(input.proposalEventId),
    );
  const seat = resolveActiveMemberSeat(world, input.playerPersonId);
  if (
    !amendment ||
    !vote ||
    seat.kind !== "seated" ||
    amendment.chamberKey !== seat.seat.chamberKey ||
    !proposal ||
    proposal.sequence >= amendment.sequence
  )
    throw new Error(
      "No adopted amendment from this member's chamber records these proposed changes.",
    );
  const revised = adoptProvisionRevisions(
    world,
    preview.changes.map(({ before, after }) => ({
      stableKey: `${amendment.stableKey}:${after.provisionKey}`,
      measureId: preview.bill.measureId,
      amendmentId: amendment.id,
      supersedesProvisionId: before.id,
      provisionKey: after.provisionKey,
      sectionNumber: after.sectionNumber,
      heading: after.heading,
      text: after.text,
      beneficiary: after.beneficiary,
      applicationScope: before.applicationScope,
      fiscalExposureLabel: after.fiscalExposureLabel,
      fiscalExposureMinorUnits: after.fiscalExposureMinorUnits,
      ...(after.fiscalPeriod ? { fiscalPeriod: after.fiscalPeriod } : {}),
    })),
  );
  return recordWorldEvent(revised, {
    stableKey: `typed-amendment-parameters:${amendment.id}`,
    type: PARAMETER_EVENT,
    occurredAt: revised.currentDate,
    recordedAt: revised.currentDate,
    jurisdictionId: preview.bill.jurisdictionId,
    participants: [
      { personId: input.playerPersonId, role: "agency:author", detail: null },
    ],
    involvedEntityIds: [preview.bill.measureId, input.playerPersonId],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation.document"],
    summary: `Saved the adopted parameter choices for ${preview.bill.designation}.`,
    context: {
      location: null,
      socialContext: input.scenarioKey,
      pressure: null,
      choice: JSON.stringify({
        amendmentId: amendment.id,
        familyVersion: preview.proposed.familyVersion,
        parameters: preview.proposed.parameterValues,
      }),
      motivation: null,
      immediateReaction: null,
    },
  });
}
