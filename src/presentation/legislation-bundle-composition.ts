import {
  adoptProvisionRevisions,
  currentMeasureProvisions,
  recordWorldEvent,
  type EntityId,
  type LegislativeProvisionRecord,
  type World,
} from "../simulation";
import type { CompiledClause } from "../simulation/legislation-drafting";
import {
  bundleProvisionKey,
  compileMeasureBundle,
  type CompiledMeasureBundle,
  type CompiledMeasureComponent,
} from "../simulation/legislation-bundle";
import type {
  ProgramParameterSpec,
  ProgramParameterValue,
} from "../simulation/legislation-program-families";
import { recompileSavedBundle } from "./legislation-bundle-docket";
import type { DocketBill } from "./legislation-docket";
import { resolveActiveMemberSeat } from "./legislative-member-seat";

/**
 * One reading of a multi-part measure, for every surface that shows one.
 *
 * NATIONWIDE1 section 5 asks that the draft text, the provisions it affects,
 * the money it states and the controls a player can still move all come from
 * the same data. They do here: every field below is derived from one recompiled
 * bundle and the measure's own filed provisions, so a funding figure on screen
 * and the section it came from cannot disagree — there is nothing for them to
 * disagree with, because neither is stored.
 *
 * Nothing in this module writes. `previewBundleComposition` compiles what an
 * edit would say and returns it; `saveBundleComposition` records a private
 * working copy that changes no section of the bill; and only
 * `carryAdoptedBundleComposition`, which requires an adopted amendment that
 * already exists in the measure's own history, moves text — through
 * `adoptProvisionRevisions`, the same append-only writer a single-family bill
 * uses. A staff-assisted edit and a member's own edit reach the same three
 * functions, so neither writes history the other would not.
 */

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

/** A section as drafted, beside the filed provision it corresponds to. */
export interface BundleSectionView {
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly text: string;
  /**
   * The filed provision this section currently is, where the measure has one.
   *
   * Null where the recompiled draft states a section the filed measure does
   * not carry — which means the bank or the configuration has moved under the
   * bill, and is reported rather than treated as an addition.
   */
  readonly filed: LegislativeProvisionRecord | null;
  /** Whether the filed text differs from what the configuration now compiles. */
  readonly divergedFromFiled: boolean;
}

/** A control the player can still move, and the value it currently holds. */
export interface BundleControlView {
  readonly componentKey: string;
  readonly parameter: ProgramParameterSpec;
  readonly value: ProgramParameterValue | null;
}

/**
 * Money the measure states, by what kind of statement each figure is.
 *
 * Four separate readings, never one. An authorized ceiling is permission to
 * appropriate later; an appropriation is money made available; revenue is a
 * charge imposed. Adding any two of them together would state something no
 * section of the measure says, so this type gives a caller no way to.
 */
export interface BundleFundingView {
  readonly authorizedCeilingMinorUnits: Readonly<Record<string, number>>;
  readonly appropriatedMinorUnits: Readonly<Record<string, number>>;
  readonly revenueMinorUnits: Readonly<Record<string, number>>;
  /** Per component, so a reader can say which part states which figure. */
  readonly byComponent: readonly BundleComponentFundingView[];
}

export interface BundleComponentFundingView {
  readonly componentKey: string;
  readonly currency: string | null;
  readonly authorizedCeilingMinorUnits: number | null;
  readonly authorizedCeilingLabel: string | null;
  readonly appropriatedMinorUnits: number | null;
  readonly appropriatedLabel: string | null;
  readonly revenueMinorUnits: number | null;
  readonly revenueLabel: string | null;
}

export interface BundleComponentView {
  readonly componentKey: string;
  readonly subject: string;
  readonly familyTitle: string;
  readonly variantLabel: string;
  readonly synopsis: string;
  readonly instrumentLabel: string;
  /** What this component acts upon, where its instrument takes one. */
  readonly actsUponLabel: string | null;
  readonly dependsOn: readonly string[];
  readonly sections: readonly BundleSectionView[];
  readonly declaredLimits: readonly string[];
}

export interface BundleMeasureView {
  readonly designation: string;
  readonly subjectRule: CompiledMeasureBundle["subjectRule"];
  readonly subjects: readonly string[];
  readonly components: readonly BundleComponentView[];
  readonly funding: BundleFundingView;
  readonly controls: readonly BundleControlView[];
  /**
   * Sections the measure carries that no component of the recompiled bundle
   * accounts for.
   *
   * Amended text lives here once an amendment has changed it, and so does any
   * section whose component the bank no longer produces. Reported rather than
   * hidden: a player looking at a bill should see every section of it, and a
   * section the configuration cannot restate is exactly the one worth saying
   * so about.
   */
  readonly unaccountedProvisions: readonly LegislativeProvisionRecord[];
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

function componentFunding(
  component: CompiledMeasureComponent,
): BundleComponentFundingView {
  const currencies = new Set<string>();
  for (const value of Object.values(component.draft.parameterValues)) {
    if (value.kind === "money") currencies.add(value.currency);
  }
  return {
    componentKey: component.componentKey,
    // Read from the typed values, never parsed out of a formatted label: a
    // label is an output of these values, and reading one back as an input is
    // how a currency gets invented.
    currency: currencies.size === 1 ? [...currencies][0]! : null,
    authorizedCeilingMinorUnits: component.draft.authorizedCeilingMinorUnits,
    authorizedCeilingLabel: component.draft.authorizedCeilingLabel,
    appropriatedMinorUnits: component.draft.appropriatedMinorUnits,
    appropriatedLabel: component.draft.appropriatedLabel,
    revenueMinorUnits: component.draft.revenueMinorUnits,
    revenueLabel: component.draft.revenueLabel,
  };
}

/**
 * The whole measure, read from one compiled bundle and its filed provisions.
 *
 * Read-only. It takes a World because the filed text lives there, and it does
 * not write to it: no clock moves, no fact is created, and opening a bill is
 * not an act in the world.
 */
export function bundleMeasureView(
  world: World,
  bill: DocketBill,
  bundle: CompiledMeasureBundle,
): BundleMeasureView {
  const filed = currentMeasureProvisions(world, bill.measureId);
  const accountedFor = new Set<string>();
  const components: BundleComponentView[] = [];
  const controls: BundleControlView[] = [];

  for (const component of bundle.components) {
    const sections: BundleSectionView[] = [];
    for (const clause of component.clauses) {
      const match =
        filed.find((row) => row.provisionKey === clause.provisionKey) ?? null;
      if (match) accountedFor.add(match.provisionKey);
      sections.push({
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        filed: match,
        divergedFromFiled:
          match !== null && clausePayload(match) !== clausePayload(clause),
      });
    }
    for (const parameter of component.draft.parameters) {
      controls.push({
        componentKey: component.componentKey,
        parameter,
        value: component.draft.parameterValues[parameter.key] ?? null,
      });
    }
    components.push({
      componentKey: component.componentKey,
      subject: component.subject,
      familyTitle: component.draft.familyTitle,
      variantLabel: component.draft.variantLabel,
      synopsis: component.draft.synopsis,
      instrumentLabel: component.draft.instrumentRule.label,
      actsUponLabel: component.draft.predicateAuthority?.citationLabel ?? null,
      dependsOn: component.dependsOn,
      sections,
      declaredLimits: component.draft.declaredLimits,
    });
  }

  return {
    designation: bundle.designation,
    subjectRule: bundle.subjectRule,
    subjects: bundle.subjects,
    components,
    funding: {
      authorizedCeilingMinorUnits: bundle.totals.authorizedCeilingMinorUnits,
      appropriatedMinorUnits: bundle.totals.appropriatedMinorUnits,
      revenueMinorUnits: bundle.totals.revenueMinorUnits,
      byComponent: bundle.components.map(componentFunding),
    },
    controls,
    unaccountedProvisions: filed.filter(
      (row) => !accountedFor.has(row.provisionKey),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Editing, before anything is committed                                       */
/* -------------------------------------------------------------------------- */

/** Parameter edits, keyed by the component they apply to. */
export type BundleParameterEdits = Readonly<
  Record<string, Readonly<Record<string, ProgramParameterValue>>>
>;

export interface BundleSectionChange {
  readonly componentKey: string;
  readonly before: LegislativeProvisionRecord;
  readonly after: CompiledClause;
}

export interface BundleCompositionPreview {
  readonly bill: DocketBill;
  readonly baseline: CompiledMeasureBundle;
  readonly proposed: CompiledMeasureBundle;
  readonly changes: readonly BundleSectionChange[];
}

function requireBundle(
  world: World,
  bill: DocketBill,
  personId: EntityId,
  edits: BundleParameterEdits | null,
): CompiledMeasureBundle {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    throw new Error("This working document belongs to another character.");
  }
  const current = recompileSavedBundle(world, bill, personId);
  if ("unavailable" in current) throw new Error(current.unavailable);
  if (edits === null) return current;

  for (const componentKey of Object.keys(edits)) {
    if (
      !current.components.some(
        (component) => component.componentKey === componentKey,
      )
    ) {
      throw new Error(
        `This measure carries no '${componentKey}' component to change.`,
      );
    }
  }
  // Recompiled rather than patched: every edited value goes back through the
  // family's own validation, so a value outside a declared bound is refused
  // here exactly as it would have been at filing, and the conflict, cycle and
  // subject checks all run again over the edited measure.
  return recompileBundleFrom(current, (componentKey, values) => ({
    ...values,
    ...(edits[componentKey] ?? {}),
  }));
}

/**
 * Recompiles a saved measure with each component's values passed through a
 * transform.
 *
 * Kept here rather than in the docket module because it exists for editing:
 * the docket reads a bill as filed, and only a composition surface has a
 * reason to ask what the same bill would say with a value moved. The shape is
 * carried over unchanged — same components, same authorities, same order — so
 * an edit can change what a measure says and never what it is made of.
 */
function recompileBundleFrom(
  saved: CompiledMeasureBundle,
  transform: (
    componentKey: string,
    values: Readonly<Record<string, ProgramParameterValue>>,
  ) => Readonly<Record<string, ProgramParameterValue>>,
): CompiledMeasureBundle {
  return compileMeasureBundle({
    scenarioKey: saved.scenarioKey,
    designation: saved.designation,
    filedOn: saved.filedOn,
    subjectRule: saved.subjectRule,
    components: saved.components.map((component) => ({
      componentKey: component.componentKey,
      familyKey: component.draft.familyKey,
      variantKey: component.draft.variantKey,
      parameterValues: transform(
        component.componentKey,
        component.draft.parameterValues,
      ),
      jurisdictionId: component.jurisdictionId,
      rulePackId: component.draft.rulePackId,
      subject: component.subject,
      dependsOn: component.dependsOn,
      ...(component.draft.predicateAuthority !== null
        ? { predicateAuthority: component.draft.predicateAuthority }
        : {}),
    })),
  });
}

/**
 * What the measure would read with these values, and which filed sections
 * that would change. Writes nothing.
 */
export function previewBundleComposition(
  world: World,
  bill: DocketBill,
  personId: EntityId,
  edits: BundleParameterEdits,
): BundleCompositionPreview {
  const baseline = requireBundle(world, bill, personId, null);
  const proposed = requireBundle(world, bill, personId, edits);
  const filed = currentMeasureProvisions(world, bill.measureId);
  const changes: BundleSectionChange[] = [];

  for (const component of proposed.components) {
    const original = baseline.components.find(
      (row) => row.componentKey === component.componentKey,
    );
    if (!original) {
      throw new Error(
        "This configuration does not support adding a new component.",
      );
    }
    for (const after of component.clauses) {
      const was = original.clauses.find(
        (clause) => clause.provisionKey === after.provisionKey,
      );
      if (!was) {
        throw new Error(
          "This configuration does not support adding a new section.",
        );
      }
      if (clausePayload(was) === clausePayload(after)) continue;
      const before = filed.find(
        (row) => row.provisionKey === after.provisionKey,
      );
      if (!before || clausePayload(before) !== clausePayload(was)) {
        throw new Error(
          `Section ${after.sectionNumber} changed outside this typed draft. Its current text must be reconciled before editing it here.`,
        );
      }
      changes.push({ componentKey: component.componentKey, before, after });
    }
  }
  return { bill, baseline, proposed, changes };
}

/* -------------------------------------------------------------------------- */
/* Committing                                                                  */
/* -------------------------------------------------------------------------- */

const PROPOSAL_EVENT = "legislation.bundle-working-copy";
const PARAMETER_EVENT = "legislation.bundle-adopted-parameters";

export interface SaveBundleCompositionInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly memberSeatStableKey?: string;
  readonly expectedProvisionIds: readonly EntityId[];
  readonly edits: BundleParameterEdits;
}

function checkedPreview(
  world: World,
  bill: DocketBill,
  input: SaveBundleCompositionInput,
): BundleCompositionPreview {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId
  ) {
    throw new Error("Only the current player may prepare these changes.");
  }
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === bill.measureId,
  );
  if (!measure) throw new Error("This bill's measure is no longer recorded.");
  const seat = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: measure.jurisdictionId,
    legislativeRulePackId: measure.rulePackId,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  if (
    seat.kind !== "seated" ||
    seat.seat.governingJurisdictionId !== bill.jurisdictionId ||
    seat.seat.legislativeRulePackId !== measure.rulePackId
  ) {
    throw new Error(
      "This character has no supported member seat for this bill.",
    );
  }
  const currentIds = currentMeasureProvisions(world, bill.measureId).map(
    (provision) => provision.id,
  );
  if (
    JSON.stringify(currentIds) !== JSON.stringify(input.expectedProvisionIds)
  ) {
    throw new Error(
      "The measure changed after this comparison. Review its current text first.",
    );
  }
  const preview = previewBundleComposition(
    world,
    bill,
    input.playerPersonId,
    input.edits,
  );
  if (!preview.changes.length) {
    throw new Error("Choose at least one change to save.");
  }
  return preview;
}

/** The values this working copy proposes, as one serializable shape. */
function proposedValues(
  preview: BundleCompositionPreview,
): Readonly<Record<string, Readonly<Record<string, ProgramParameterValue>>>> {
  const values: Record<
    string,
    Readonly<Record<string, ProgramParameterValue>>
  > = {};
  for (const component of preview.proposed.components) {
    values[component.componentKey] = component.draft.parameterValues;
  }
  return values;
}

/** The family versions this working copy was prepared against. */
function proposedVersions(
  preview: BundleCompositionPreview,
): Readonly<Record<string, string>> {
  const versions: Record<string, string> = {};
  for (const component of preview.proposed.components) {
    versions[component.componentKey] = component.draft.familyVersion;
  }
  return versions;
}

/**
 * An explicit private working document. No vote, no adoption, and no section
 * of the bill moves — the measure reads exactly as it did before this call.
 */
export function saveBundleComposition(
  world: World,
  bill: DocketBill,
  input: SaveBundleCompositionInput,
): { readonly world: World; readonly proposalEventId: EntityId } {
  const preview = checkedPreview(world, bill, input);
  const next = recordWorldEvent(world, {
    stableKey: `bundle-working-copy:${input.playerPersonId}:${world.history.nextSequence}`,
    type: PROPOSAL_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: bill.jurisdictionId,
    participants: [
      {
        personId: input.playerPersonId,
        role: "agency:author",
        detail: "Saved proposed changes to a working document.",
      },
    ],
    involvedEntityIds: [bill.measureId, input.playerPersonId],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation.document"],
    summary: `Saved proposed changes to ${bill.designation}.`,
    context: {
      location: null,
      socialContext: input.scenarioKey,
      pressure: null,
      choice: JSON.stringify({
        familyVersions: proposedVersions(preview),
        values: proposedValues(preview),
        expectedProvisionIds: input.expectedProvisionIds,
      }),
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, proposalEventId: next.history.events.at(-1)!.id };
}

/** Read only and actor-private, including after a save and reload. */
export function savedBundleComposition(
  world: World,
  bill: DocketBill,
  personId: EntityId,
): BundleParameterEdits | null {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    return null;
  }
  const event = world.history.events
    .filter(
      (entry) =>
        entry.type === PROPOSAL_EVENT &&
        entry.visibility === "private" &&
        entry.participants.some((party) => party.personId === personId) &&
        entry.involvedEntityIds.includes(bill.measureId),
    )
    .at(-1);
  if (!event) return null;
  const saved: unknown = JSON.parse(event.context.choice ?? "null");
  if (!saved || typeof saved !== "object" || !("values" in saved)) return null;
  const currentIds = currentMeasureProvisions(world, bill.measureId).map(
    (provision) => provision.id,
  );
  if (
    !("expectedProvisionIds" in saved) ||
    JSON.stringify(currentIds) !==
      JSON.stringify(
        (saved as { expectedProvisionIds: unknown[] }).expectedProvisionIds,
      )
  ) {
    return null;
  }
  return (saved as { values: BundleParameterEdits }).values;
}

/**
 * Carries adopted text into the measure, once — and only once the measure's
 * own history already records an amendment adopting exactly this working copy.
 *
 * The revision goes through `adoptProvisionRevisions`, so a bundle's section
 * gets the same append-only supersession, the same amendment linkage and the
 * same history a single-family bill's section gets. Nothing here writes a
 * provision record directly.
 */
export function carryAdoptedBundleComposition(
  world: World,
  bill: DocketBill,
  input: SaveBundleCompositionInput & {
    readonly proposalEventId: EntityId;
    readonly amendmentId: EntityId;
  },
): World {
  const preview = checkedPreview(world, bill, input);
  const proposal = world.history.events.find(
    (entry) =>
      entry.id === input.proposalEventId &&
      entry.type === PROPOSAL_EVENT &&
      entry.participants.some(
        (party) => party.personId === input.playerPersonId,
      ) &&
      entry.involvedEntityIds.includes(bill.measureId),
  );
  const saved = proposal ? JSON.parse(proposal.context.choice ?? "null") : null;
  if (
    !saved ||
    JSON.stringify(saved.familyVersions) !==
      JSON.stringify(proposedVersions(preview)) ||
    JSON.stringify(saved.values) !== JSON.stringify(proposedValues(preview)) ||
    JSON.stringify(saved.expectedProvisionIds) !==
      JSON.stringify(input.expectedProvisionIds)
  ) {
    throw new Error(
      "The adopted text must match the saved working copy exactly.",
    );
  }
  const amendment = world.history.legislativeAmendments?.find(
    (entry) =>
      entry.id === input.amendmentId &&
      entry.measureId === bill.measureId &&
      entry.offeredByPersonId === input.playerPersonId &&
      entry.status === "adopted",
  );
  const vote =
    amendment &&
    world.history.legislativeVotes?.find(
      (entry) =>
        entry.id === amendment.voteId &&
        entry.purpose === "amendment" &&
        entry.outcome === "passed" &&
        entry.provenance.sourceEntityIds.includes(input.proposalEventId),
    );
  const measure = world.history.legislativeMeasures!.find(
    (entry) => entry.id === bill.measureId,
  )!;
  const seat = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: bill.jurisdictionId,
    legislativeRulePackId: measure.rulePackId,
    chamberKey: amendment?.chamberKey,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  if (
    !amendment ||
    !vote ||
    seat.kind !== "seated" ||
    amendment.chamberKey !== seat.seat.chamberKey ||
    !proposal ||
    proposal.sequence >= amendment.sequence
  ) {
    throw new Error(
      "No adopted amendment from this member's chamber records these proposed changes.",
    );
  }

  const revised = adoptProvisionRevisions(
    world,
    preview.changes.map(({ before, after }) => ({
      stableKey: `${amendment.stableKey}:${after.provisionKey}`,
      measureId: bill.measureId,
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
    stableKey: `bundle-adopted-parameters:${amendment.id}`,
    type: PARAMETER_EVENT,
    occurredAt: revised.currentDate,
    recordedAt: revised.currentDate,
    jurisdictionId: bill.jurisdictionId,
    participants: [
      { personId: input.playerPersonId, role: "agency:author", detail: null },
    ],
    involvedEntityIds: [bill.measureId, input.playerPersonId],
    personFactConstraints: [],
    visibility: "private",
    tags: ["legislation.document"],
    summary: `Saved the adopted parameter choices for ${bill.designation}.`,
    context: {
      location: null,
      socialContext: input.scenarioKey,
      pressure: null,
      choice: JSON.stringify({
        amendmentId: amendment.id,
        familyVersions: proposedVersions(preview),
        values: proposedValues(preview),
      }),
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The namespaced key a component's section carries. Re-exported for surfaces. */
export { bundleProvisionKey };
