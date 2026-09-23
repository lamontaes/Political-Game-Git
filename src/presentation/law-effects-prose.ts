import {
  enactedLawEffects,
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
      if (line.status === "refused")
        return `The tax on ${line.baseLabel} has not taken effect. ${line.reason ?? ""}`.trim();
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
      const program = title ? ` for ${title.toLowerCase()}` : "";
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
      const restored =
        line.unitsRestored > 0
          ? ` The work it paid for has returned ${line.unitsRestored} ${line.unitsRestored === 1 ? "unit" : "units"} to service.`
          : "";
      const window =
        line.status === "expired"
          ? `The ${amount} it provided${program} could be spent until ${proseDate(line.availableThrough)}.`
          : `It made ${amount} available to spend${program} through ${proseDate(line.availableThrough)}.`;
      return `${window} ${spent}${failed}${restored}`;
    }
    case "transit":
      return line.status === "available"
        ? `Its transit money${line.amountMinorUnits !== null ? `, ${dollars(line.amountMinorUnits)},` : ""} is available to run service.`
        : `Its transit money has not reached service. ${line.reason ?? ""}`.trim();
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
