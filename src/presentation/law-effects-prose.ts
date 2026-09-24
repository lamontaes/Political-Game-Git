import {
  enactedLawEffects,
  type DeliveredServiceFact,
  type LawEffectLine,
} from "../simulation/enacted-law-effects";
import {
  amendableRuleFieldLabel,
  isAmendableRuleField,
} from "../simulation/enacted-rule-changes";
import { programFamilyTitle } from "../simulation/governing/program-families";
import { formatMinorUnits } from "../simulation/legislation-program-families";
import type { EntityId, World } from "../simulation/types";
import { proseDate } from "./prose-dates";

/**
 * What an enacted law changed, one plain sentence per effect, for the bill's
 * own page. Empty for a bill that is not law.
 *
 * Every sentence reads a record the law actually wrote, or says that the game
 * does not act on that part yet. None names a source or a research question:
 * the owner keeps provenance off player surfaces.
 */
export function lawEffectSentences(
  world: World,
  measureId: EntityId,
): readonly string[] {
  const effects = enactedLawEffects(world, measureId);
  if (!effects) return [];
  return effects.lines.map(sentenceFor);
}

const dollars = (minorUnits: number) => formatMinorUnits(minorUnits, "USD");

function sentenceFor(line: LawEffectLine): string {
  switch (line.kind) {
    case "tax": {
      // The reason stays in the record: it is written for the tax engine, not
      // for a reader, and an older save can hold a tax enacted before every
      // route adopted one.
      if (line.status === "refused")
        return `The tax on ${line.baseLabel} has not taken effect, and nothing is being collected under it.`;
      if (line.status === "scheduled")
        return `The tax on ${line.baseLabel} takes effect on ${proseDate(line.effectiveAt!)}. Nothing is collected before then.`;
      const collected =
        line.collections === 0
          ? "Nothing has been collected under it yet."
          : `It has collected ${dollars(line.collectedMinorUnits)} from ${line.collections} ${line.collections === 1 ? "payment" : "payments"} so far.`;
      const blocked =
        line.blockedCollections > 0
          ? ` ${line.blockedCollections} ${line.blockedCollections === 1 ? "payment was" : "payments were"} due and could not be collected.`
          : "";
      return `The tax on ${line.baseLabel} took effect on ${proseDate(line.effectiveAt!)}. ${collected}${blocked}`;
    }
    case "appropriation": {
      // The general appropriations family names no subject of its own; the
      // bill's title already says what it funds.
      const familyKey = line.programKey.split(":")[0] ?? "";
      const title =
        familyKey === "appropriations" ? null : programFamilyTitle(familyKey);
      const program = title
        ? ` for ${title.charAt(0).toLowerCase()}${title.slice(1)}`
        : "";
      const amount = dollars(line.amountMinorUnits);
      if (line.status === "scheduled")
        return `It provides ${amount}${program}, which can be spent from ${proseDate(line.availableFrom)}.`;
      const spent =
        line.committedMinorUnits === 0
          ? "None of it has been committed yet."
          : `${dollars(line.committedMinorUnits)} has been committed and ${dollars(line.paidMinorUnits)} paid out.`;
      const failed =
        line.failedPayments > 0
          ? ` ${line.failedPayments} ${line.failedPayments === 1 ? "payment" : "payments"} failed.`
          : "";
      const delivered = line.deliveredServices
        .map(deliveredServiceSentence)
        .join(" ");
      const window =
        line.status === "expired"
          ? `The ${amount} it provided${program} could be spent until ${proseDate(line.availableThrough)}.`
          : `It made ${amount} available to spend${program} through ${proseDate(line.availableThrough)}.`;
      return `${window} ${spent}${failed}${delivered ? ` ${delivered}` : ""}`;
    }
    case "transit":
      return line.status === "available"
        ? `Its transit money${line.amountMinorUnits !== null ? `, ${dollars(line.amountMinorUnits)},` : ""} is available to run service.`
        : "Its transit money has not reached service yet.";
    case "rule-change": {
      const rule = isAmendableRuleField(line.field)
        ? amendableRuleFieldLabel(line.field)
        : "a rule of office";
      return line.status === "in-effect"
        ? `It changed the ${rule}, in effect since ${proseDate(line.operativeAt)}.`
        : `It changes the ${rule} on ${proseDate(line.operativeAt)}.`;
    }
    case "not-modeled":
      // PLACEHOLDER: the effect of this part is waiting on research. The
      // sentence says only that nothing acts on it, never what it would do.
      return `${line.heading}: nothing in the world acts on this part of the law yet.`;
    case "no-operative-text":
      return "This law has no operative text, so it changes nothing in the world.";
  }
}

export function deliveredServiceSentence(
  delivery: DeliveredServiceFact,
): string {
  const date = proseDate(delivery.deliveredAt);
  if (delivery.restoredUnits === null)
    return `On ${date}, paid work for ${delivery.serviceLabel} in ${delivery.placeLabel} was delivered; the number of ${pluralUnitLabel(delivery.unitLabel)} returned to service is not established.`;
  if (delivery.restoredUnits === 0)
    return `On ${date}, paid work for ${delivery.serviceLabel} in ${delivery.placeLabel} was delivered, but no ${pluralUnitLabel(delivery.unitLabel)} were returned to service.`;
  return `On ${date}, paid work for ${delivery.serviceLabel} in ${delivery.placeLabel} returned ${countedUnitLabel(delivery.unitLabel, delivery.restoredUnits)} to service.`;
}

function countedUnitLabel(label: string, count: number): string {
  return `${count} ${count === 1 ? singularUnitLabel(label) : pluralUnitLabel(label)}`;
}

function pluralUnitLabel(label: string): string {
  if (/buses$/i.test(label) || /miles$/i.test(label)) return label;
  if (/bus$/i.test(label)) return `${label}es`;
  if (/unit$/i.test(label)) return `${label}s`;
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  return label.endsWith("s") ? label : `${label}s`;
}

function singularUnitLabel(label: string): string {
  if (/buses$/i.test(label)) return label.slice(0, -2);
  if (/miles$/i.test(label)) return label.slice(0, -1);
  if (/units$/i.test(label)) return label.slice(0, -1);
  if (/ies$/i.test(label)) return `${label.slice(0, -3)}y`;
  return label.endsWith("s") ? label.slice(0, -1) : label;
}
