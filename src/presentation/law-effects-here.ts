import { lawInForce } from "../simulation/governing/law-in-force";
import type { LawLevel } from "../simulation/law-hierarchy";
import { OUTCOME_LINKS } from "../simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeAt,
  placeOutcomeValue,
  placeOutcomeValueText,
  type PlaceOutcomeRecord,
} from "../simulation/outcome-web/place-outcomes";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { proseDate } from "./prose-dates";

/**
 * What the laws in force have done to the place a player lives in, read from
 * the outcome web's own monthly records. Nothing is written and nothing is
 * added: every line names a law whose answer now differs from where the place
 * began, the condition that law moved, and the value with and without it.
 * A law that moved nothing is not mentioned, and a place with no records
 * says nothing (an unknown level is never narrated as steady).
 */
export interface LawEffectHere {
  readonly key: string;
  readonly measure: string;
  readonly measureName: string;
  readonly questionKey: string;
  readonly questionName: string;
  readonly question: string;
  readonly level: LawLevel;
  readonly answer: "yes" | "no";
  readonly inForceSince: IsoDate;
  readonly month: IsoDate;
  readonly value: number;
  readonly valueText: string;
  /** Model estimate without this law's contribution; not an observed outcome. */
  readonly withoutLaw: number;
  readonly withoutLawText: string;
  readonly direction: "higher" | "lower";
  readonly headline: string;
  readonly sentence: string;
}

const LAW_CAUSE_PREFIX = "law:";

const LEVEL_WORDS: Readonly<Record<LawLevel, string>> = {
  "federal-constitution": "The U.S. Constitution",
  "federal-statute": "Federal law",
  "state-constitution": "The state constitution",
  "state-statute": "State law",
  "local-charter": "The local charter",
  "local-ordinance": "Local law",
};

/** A rounded value reads the same way the records write it. */
function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function withoutCause(
  record: PlaceOutcomeRecord,
  causeKey: string,
): number | null {
  const definition = PLACE_OUTCOME_BASES[record.measure];
  if (!definition || record.structural === undefined) return null;
  const rest = record.causes.filter((cause) => cause.key !== causeKey);
  const factors = rest.map((cause) => cause.factor);
  const multiplier = factors.reduce((total, factor) => total * factor, 1);
  return placeOutcomeValue(definition, record.structural, multiplier, factors);
}

export function lawEffectsHere(
  world: World,
  jurisdictionId: EntityId,
): readonly LawEffectHere[] {
  const propositions = Object.values(world.policyCatalog?.propositions ?? {});
  const effects: LawEffectHere[] = [];
  for (const measure of PLACE_OUTCOME_MEASURES) {
    const definition = PLACE_OUTCOME_BASES[measure]!;
    const record = placeOutcomeAt(
      world,
      measure,
      jurisdictionId,
      world.currentDate,
    );
    if (!record) continue;
    for (const cause of record.causes) {
      if (cause.factor === 1) continue;
      const link = OUTCOME_LINKS.find(
        (candidate) => candidate.key === cause.key,
      );
      if (!link || !link.from.startsWith(LAW_CAUSE_PREFIX)) continue;
      const questionKey = link.from.slice(LAW_CAUSE_PREFIX.length);
      const question = propositions.find(
        (proposition) => proposition.stableKey === questionKey,
      );
      if (!question) continue;
      const law = lawInForce(world, jurisdictionId, question.id, record.month);
      if (!law) continue;
      const without = withoutCause(record, cause.key);
      if (without === null) continue;
      const value = rounded(record.value);
      const withoutLaw = rounded(without);
      // A change too small to show at the precision the record keeps is not
      // an effect a reader could see.
      if (value === withoutLaw) continue;
      const direction = value > withoutLaw ? "higher" : "lower";
      const valueText = placeOutcomeValueText(definition, value);
      const withoutLawText = placeOutcomeValueText(definition, withoutLaw);
      const answer = law.answer === "yes" ? "yes" : "no";
      const level = LEVEL_WORDS[law.level];
      effects.push({
        key: `${measure}:${cause.key}`,
        measure,
        measureName: definition.name,
        questionKey,
        questionName: question.name,
        question: question.question,
        level: law.level,
        answer,
        inForceSince: law.operativeAt,
        month: record.month,
        value,
        valueText,
        withoutLaw,
        withoutLawText,
        direction,
        headline: `${sentenceCase(definition.name)} runs ${direction} because of a change in the law`,
        sentence:
          `${level} now says ${answer} to “${question.name}”, in force since ${proseDate(law.operativeAt)}. ` +
          `Here it stands at ${valueText}. The model estimates that without that change it would stand at ${withoutLawText}.`,
      });
    }
  }
  // The largest relative change first, so the story a reader would notice
  // leads; ties keep the catalog's own order.
  return effects.sort(
    (left, right) =>
      Math.abs(right.value - right.withoutLaw) /
        Math.max(Math.abs(right.withoutLaw), 1e-9) -
      Math.abs(left.value - left.withoutLaw) /
        Math.max(Math.abs(left.withoutLaw), 1e-9),
  );
}
