import { addDays } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import {
  statehoodAdmittedOn,
  STATEHOOD_QUESTION,
  statehoodPlace,
} from "../governing/statehood-admission";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { stateJurisdictionForKey } from "../life-places";
import { applyStatehoodTurnover } from "../living-world/statehood-seats";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type { World } from "../types";
/** Resolve an admitted canonical row; a bare sidecar or unregistered subject is not authority. */
export function questionForRow(world: World, row: LawConsequenceRow) {
  const questions = Object.values(world.policyCatalog.propositions).filter(
    (question) =>
      question.consequences?.some((candidate) => candidate.id === row.id),
  );
  if (questions.length !== 1)
    throw new Error(
      `Consequence ${row.id}: expected one canonical catalog question`,
    );
  return questions[0]!;
}
export function checkRow(
  row: LawConsequenceRow,
  kind: LawConsequenceRow["kind"],
  selector: string,
  action: string,
  key: string,
) {
  if (
    row.kind !== kind ||
    row.who.selector !== selector ||
    row.what !== action ||
    (row.decision?.op !== "term" && row.decision?.op !== "record") ||
    row.decision?.key !== key ||
    row.decision?.type !== "boolean" ||
    row.amount ||
    row.conditions.length ||
    row.who.predicates.length ||
    row.lag.days !== 0
  )
    throw new Error(`Consequence ${row.id}: unsupported ${kind} row binding`);
}

export const institutionRuleRegistration: LawConsequenceKindRegistration = {
  kind: "institution-rule",
  owner: "Team1",
  selectors: ["admitted-congress-jurisdiction"],
  actions: ["seat-admitted-congress"],
  predicates: [],
  units: [],
  resolve(
    world: World,
    row: LawConsequenceRow,
    context: LawConsequenceContext,
  ): readonly ResolvedLawConsequence[] {
    checkRow(
      row,
      "institution-rule",
      "admitted-congress-jurisdiction",
      "seat-admitted-congress",
      "operative-law-answer",
    );
    if (context.activity !== row.when || context.onDate !== world.currentDate)
      return [];
    const question = questionForRow(world, row);
    if (question.stableKey !== STATEHOOD_QUESTION)
      throw new Error(
        `Consequence ${row.id}: Congress admission authority not supported for ${question.stableKey}`,
      );
    const law = lawInForce(
      world,
      NATIONAL_ELECTION_JURISDICTION.id,
      question.id,
      context.onDate,
      "enacted-only",
    );
    const admitted = statehoodAdmittedOn(world, context.onDate);
    if (!law || law.answer !== "yes" || !admitted) return [];
    if (context.governingLawId && context.governingLawId !== law.measureId)
      return [];
    const jurisdictionId = stateJurisdictionForKey(
      `US-${statehoodPlace()}`,
    )!.id;
    if (!context.subjectIds.includes(jurisdictionId)) return [];
    return [
      {
        row,
        law,
        questionKey: question.stableKey,
        jurisdictionId,
        subject: { kind: "place", id: jurisdictionId },
        activityId: context.activityId,
        effectiveAt: admitted,
        sourceRecordIds: [context.activityId, law.measureId],
        value: { type: "boolean", value: true },
      },
    ];
  },
  apply(world: World, resolved: ResolvedLawConsequence): World {
    checkRow(
      resolved.row,
      "institution-rule",
      "admitted-congress-jurisdiction",
      "seat-admitted-congress",
      "operative-law-answer",
    );
    const jurisdiction = stateJurisdictionForKey(`US-${statehoodPlace()}`)!.id;
    if (
      resolved.subject.kind !== "place" ||
      resolved.subject.id !== jurisdiction ||
      resolved.jurisdictionId !== jurisdiction ||
      resolved.questionKey !== STATEHOOD_QUESTION ||
      resolved.value.type !== "boolean" ||
      !resolved.value.value ||
      resolved.law.answer !== "yes"
    )
      throw new Error(
        `Consequence ${resolved.row.id}: invalid resolved Congress admission`,
      );
    // Existing domain producer creates actual people/tenures and their canonical law stamps.
    // Its stable tenure keys provide idempotence; no second seat or election writer.
    return applyStatehoodTurnover(addDays(resolved.effectiveAt, -1), world);
  },
};
