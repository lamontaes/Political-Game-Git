import itemVetoTable from "../../../data/research/legislative-procedure/item-veto.json" with { type: "json" };
import { createStableId } from "../ids";
import { requireMeasure } from "../legislation";
import { rulePackById } from "../legislature-rule-packs";
import { latestPrivateBelief } from "../queries";
import type { EntityId, ItemVetoRecord, World } from "../types";
import { sectionsBefore } from "../vote-bundle";
import { recordWorldEvent } from "../world";
import { principleView } from "./officeholder-principles";

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

/**
 * The item-veto power of the executive who acts on bills of this pack, or
 * null where there is none. A scope the table records as "other" (a narrower
 * or unusual rule) starts at the most common scope, money bills only:
 * ESTIMATED FROM AVERAGE, 44 of the 50 places with an item veto.
 */
export function itemVetoPower(rulePackId: string): ItemVetoPower | null {
  const code = rulePackById(rulePackId).jurisdictionKey.replace(/^US-/, "");
  const row = PLACES.find((candidate) => candidate.code === code);
  if (!row || row.itemVeto !== "yes") return null;
  return {
    reaches: row.scope === "any-bill" ? "any-bill" : "appropriation-bills",
    citation: row.citation,
  };
}

/**
 * The sections of a bill its signer would strike: the ones a floor
 * amendment carried in that answer a question against the signer's own view
 * or principles. Read-only.
 */
export function itemsToStrike(
  world: World,
  measureId: EntityId,
  signerPersonId: EntityId,
): readonly { readonly provisionId: EntityId; readonly reason: string }[] {
  const measure = requireMeasure(world, measureId);
  const power = itemVetoPower(measure.rulePackId);
  if (!power) return [];
  if (
    power.reaches === "appropriation-bills" &&
    measure.subjectClass !== "appropriation"
  )
    return [];
  const struck: { provisionId: EntityId; reason: string }[] = [];
  for (const section of sectionsBefore(
    world,
    measureId,
    world.history.nextSequence,
  )) {
    if (!section.originAmendmentId || !section.answers) continue;
    const { propositionId, answer } = section.answers;
    const belief = latestPrivateBelief(world, signerPersonId, propositionId);
    const view =
      belief?.position === "support" || belief?.position === "oppose"
        ? { answer: belief.position === "support" ? "yes" : "no" }
        : belief
          ? null
          : principleView(world, signerPersonId, propositionId);
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
): World {
  if (!signerPersonId) return world;
  if (
    world.control.kind === "person" &&
    world.control.personId === signerPersonId
  )
    return world;
  const signing = (world.history.executiveDispositions ?? [])
    .filter((record) => record.measureId === measureId)
    .at(-1);
  if (!signing || signing.action !== "signed") return world;
  const measure = requireMeasure(world, measureId);
  let next = world;
  for (const item of itemsToStrike(world, measureId, signerPersonId)) {
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
