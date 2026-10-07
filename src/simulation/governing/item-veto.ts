import itemVetoTable from "../../../data/research/legislative-procedure/item-veto.json" with { type: "json" };
import { createStableId } from "../ids";
import {
  requireMeasure,
  measureActions,
  measurePosition,
  rulePackForMeasure,
} from "../legislation";
import { rulePackById } from "../legislature-rule-packs";
import { latestPrivateBelief } from "../queries";
import type { EntityId, ItemVetoRecord, World } from "../types";
import { sectionsBefore } from "../vote-bundle";
import { recordWorldEvent } from "../world";
import { formViewFromRecordedPrinciples } from "../principled-view-formation";
import { eventById } from "../event-index";

/**
 * The executive's item veto (Build 25 step 5, design D-5).
 *
 * 50 of the 56 places give their governor an item veto, and 44 of those
 * reach only appropriation bills (Research 6, item-veto.json, read from each
 * constitution). The President has none (Clinton v. City of New York, 1998).
 * A governor who signs a bill may strike the parts they cannot accept, and
 * those parts never become law, though every vote taken before the signing
 * still read them.
 *
 * GAME ASSUMPTION (hand-set until each state's case law is read): a section a
 * floor amendment carried into the bill is an "item" the veto reaches. Courts
 * differ on whether a policy rider in a money bill is an item; the reading
 * here is the one that lets a governor answer a rider at all.
 */

interface ItemVetoRow {
  readonly code: string;
  readonly itemVeto: string;
  readonly scope: string;
  readonly citation: string;
}

const PLACES = (itemVetoTable as { places: ItemVetoRow[] }).places;

export interface ItemVetoPower {
  /** Which bills it reaches. */
  readonly reaches: "appropriation-bills" | "any-bill";
  readonly citation: string;
}

/** The player's selection is bound to the opened matter and the current bill
 * snapshot. It never supplies a signature, section text or legal authority. */
export interface ExecutiveItemVetoSelection {
  readonly matterId: EntityId;
  readonly measureActionSequence: number;
  readonly provisionIds: readonly EntityId[];
}

/**
 * The item-veto power of the executive who acts on bills of this pack, or
 * null where there is none. A scope the table records as "other" (a narrower
 * or unusual rule) starts at the most common scope, money bills only:
 * ESTIMATED FROM AVERAGE, 44 of the 50 places with an item veto.
 */
export function itemVetoPower(rulePackId: string): ItemVetoPower | null {
  const pack = rulePackById(rulePackId);
  // A council pack's unknown grant is not the governor's grant for its state.
  if (
    pack.executive.lineItemVeto.kind !== "known" ||
    !pack.executive.lineItemVeto.value
  )
    return null;
  const code = pack.jurisdictionKey.replace(/^US-/, "");
  const row = PLACES.find((candidate) => candidate.code === code);
  if (!row || row.itemVeto !== "yes") return null;
  return {
    reaches: row.scope === "any-bill" ? "any-bill" : "appropriation-bills",
    citation: row.citation,
  };
}

/** The executive's item veto where it reaches this bill, or null. */
export function itemVetoReaching(
  world: World,
  measureId: EntityId,
): ItemVetoPower | null {
  const measure = requireMeasure(world, measureId);
  const grant = rulePackForMeasure(world, measureId).executive.lineItemVeto;
  if (grant.kind !== "known" || !grant.value) return null;
  const power = itemVetoPower(measure.rulePackId);
  if (!power) return null;
  if (
    power.reaches === "appropriation-bills" &&
    measure.subjectClass !== "appropriation"
  )
    return null;
  return power;
}

/** The existing modeled scope: current floor-added sections, not arbitrary
 * base clauses or sections introduced after the executive's snapshot. */
export function executiveItemVetoOptions(world: World, measureId: EntityId) {
  if (!itemVetoReaching(world, measureId)) return [];
  const struck = new Set(
    (world.history.itemVetoes ?? [])
      .filter((record) => record.measureId === measureId)
      .map((record) => record.provisionId),
  );
  return sectionsBefore(world, measureId, world.history.nextSequence).filter(
    (section) =>
      !!section.originAmendmentId &&
      !!section.answers &&
      !struck.has(section.id),
  );
}

/** Called before any governing decision or signature is written. */
export function executiveItemVetoSelectionProblem(
  world: World,
  measureId: EntityId,
  selection: ExecutiveItemVetoSelection,
): string | null {
  if (!Array.isArray(selection.provisionIds))
    return "The item-veto selection must identify current bill items.";
  const action = measureActions(world, measureId).at(-1);
  if (
    !action ||
    !Number.isSafeInteger(selection.measureActionSequence) ||
    selection.measureActionSequence !== action.sequence
  )
    return "The bill changed after this item-veto choice was opened.";
  if (new Set(selection.provisionIds).size !== selection.provisionIds.length)
    return "An item may be selected only once.";
  if (selection.provisionIds.length === 0) return null;
  if (!itemVetoReaching(world, measureId))
    return "No executable item-veto power reaches this bill.";
  const eligible = new Set(
    executiveItemVetoOptions(world, measureId).map((section) => section.id),
  );
  return selection.provisionIds.every((id) => eligible.has(id))
    ? null
    : "That section is not an eligible item in the presented bill.";
}

/**
 * The sections of a bill its signer would strike: the ones a floor
 * amendment carried in that answer a question against the signer's saved
 * view. Read-only.
 */
export function itemsToStrike(
  world: World,
  measureId: EntityId,
  signerPersonId: EntityId,
): readonly { readonly provisionId: EntityId; readonly reason: string }[] {
  const power = itemVetoReaching(world, measureId);
  if (!power) return [];
  const struck: { provisionId: EntityId; reason: string }[] = [];
  for (const section of sectionsBefore(
    world,
    measureId,
    world.history.nextSequence,
  )) {
    if (!section.originAmendmentId || !section.answers) continue;
    const { propositionId, answer } = section.answers;
    // Only a saved view counts. A signer with none is undecided and strikes
    // nothing. applyItemVetoes forms the view first, through the one belief
    // pipeline, so no one acts on an unsaved reading of their principles.
    const belief = latestPrivateBelief(world, signerPersonId, propositionId);
    const view =
      belief?.position === "support" || belief?.position === "oppose"
        ? { answer: belief.position === "support" ? "yes" : "no" }
        : null;
    if (!view || view.answer === answer) continue;
    const question =
      world.policyCatalog.propositions[propositionId]?.name ?? section.heading;
    struck.push({
      provisionId: section.id,
      reason: `The governor struck "${question}" with the item veto (${power.citation}): it was added on the floor and cuts against the governor's own view.`,
    });
  }
  return struck;
}

/**
 * Right after a signing, records an item veto of each section the signer
 * would strike. World unchanged where the bill was not just signed, the
 * executive has no item veto, or nothing is struck. The player's own
 * signature strikes nothing on its own: that is the player's choice.
 */
export function applyItemVetoes(
  world: World,
  measureId: EntityId,
  signerPersonId: EntityId | null,
  selection?: ExecutiveItemVetoSelection,
): World {
  if (!signerPersonId) return world;
  if (selection && !Array.isArray(selection.provisionIds)) return world;
  if (
    world.control.kind === "person" &&
    world.control.personId === signerPersonId &&
    !selection
  )
    return world;
  const signing = (world.history.executiveDispositions ?? [])
    .filter((record) => record.measureId === measureId)
    .at(-1);
  if (!signing || signing.action !== "signed") return world;
  const measure = requireMeasure(world, measureId);
  if (!itemVetoReaching(world, measureId)) return world;
  if (selection) {
    const action = measureActions(world, measureId).find(
      (record) =>
        record.kind === "signed" &&
        eventById(world, record.eventId)?.involvedEntityIds.includes(
          signing.id,
        ),
    );
    const event = action ? eventById(world, action.eventId) : null;
    const matter = world.history.events.find(
      (record) =>
        record.id === selection.matterId &&
        record.type === "governing.matter-opened" &&
        record.tags.includes(`measure:${measureId}`),
    );
    const decision = world.history.events.find(
      (record) =>
        record.type === "governing.matter-decided" &&
        record.tags.includes(`matter:${selection.matterId}`) &&
        record.tags.includes("choice:bill:sign") &&
        record.tags.includes("decided-by:player") &&
        record.tags.includes(
          `item-veto-snapshot:${selection.measureActionSequence}`,
        ) &&
        record.participants.some(
          (person) =>
            person.personId === signerPersonId &&
            person.role === "agency:decider",
        ),
    );
    if (
      world.control.kind !== "person" ||
      world.control.personId !== signerPersonId ||
      measurePosition(world, measureId).phase !== "awaiting-enactment" ||
      !decision ||
      !event ||
      decision.sequence >= event.sequence ||
      decision.tags.filter((tag) => tag.startsWith("item-veto-item:"))
        .length !== selection.provisionIds.length ||
      !selection.provisionIds.every((id) =>
        decision.tags.includes(`item-veto-item:${id}`),
      ) ||
      !event?.participants.some(
        (person) =>
          person.personId === signerPersonId && person.role === "focus:subject",
      ) ||
      !matter?.participants.some(
        (person) =>
          person.personId === signerPersonId &&
          person.role === "agency:officeholder",
      )
    )
      return world;
    const eligible = executiveItemVetoOptions(world, measureId);
    if (
      new Set(selection.provisionIds).size !== selection.provisionIds.length ||
      !selection.provisionIds.every((id) =>
        eligible.some((section) => section.id === id),
      )
    )
      return world;
  }
  let next = world;
  // A signer with no view on a floor-added question forms one from their
  // recorded principles before deciding what to strike.
  for (const section of selection
    ? []
    : sectionsBefore(world, measureId, world.history.nextSequence)) {
    if (!section.originAmendmentId || !section.answers) continue;
    next = formViewFromRecordedPrinciples(next, {
      stableKey: `item-veto-view:${signing.id}:${section.answers.propositionId}`,
      personId: signerPersonId,
      propositionId: section.answers.propositionId,
    });
  }
  const chosen = selection
    ? executiveItemVetoOptions(next, measureId)
        .filter((section) => selection.provisionIds.includes(section.id))
        .map((section) => ({
          provisionId: section.id,
          reason: `The executive struck "${section.heading}" from ${measure.designation} by recorded player choice (${itemVetoReaching(next, measureId)!.citation}).`,
        }))
    : itemsToStrike(next, measureId, signerPersonId);
  for (const item of chosen) {
    const stableKey = `item-veto:${signing.id}:${item.provisionId}`;
    if ((next.history.itemVetoes ?? []).some((r) => r.stableKey === stableKey))
      continue;
    const eventStableKey = `event:${stableKey}`;
    next = recordWorldEvent(next, {
      stableKey: eventStableKey,
      type: "legislation.item-vetoed",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: measure.jurisdictionId,
      involvedEntityIds: [measure.id, item.provisionId, signerPersonId],
      participants: [
        {
          personId: signerPersonId,
          role: "agency:actor",
          detail: "Struck one section with the item veto",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["legislation", "legislation.item-veto"],
      summary: item.reason,
      context: {
        location: {
          jurisdictionId: measure.jurisdictionId,
          label:
            next.jurisdictions[measure.jurisdictionId]?.name ?? "jurisdiction",
          setting: null,
        },
        socialContext: `${measure.designation}, signed with one section struck.`,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = next.history.events.find(
      (candidate) => candidate.stableKey === eventStableKey,
    );
    if (!event) throw new Error("Failed to record the item veto.");
    const record: ItemVetoRecord = {
      id: createStableId("item-veto", stableKey),
      stableKey,
      sequence: next.history.nextSequence,
      measureId,
      provisionId: item.provisionId,
      executiveDispositionId: signing.id,
      dispositionSequence: signing.sequence,
      actorPersonId: signerPersonId,
      rationale: item.reason,
      eventId: event.id,
    };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        itemVetoes: [...(next.history.itemVetoes ?? []), record],
      },
    };
  }
  return next;
}
