import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import type { LawAmountUnit } from "../law-consequence-types";
import { startingLawTerms, type LawInForce } from "./law-in-force";
import { measureAnswersAt } from "../vote-bundle";

export interface FinalEnactedLawTerm {
  readonly value: number;
  readonly unit: LawAmountUnit;
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
}

export function finalTermEnactment(
  world: World,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate = world.currentDate,
  cutoff?: HistoricalCutoff,
) {
  if (law.origin !== "enacted" || law.operativeAt > onDate) return null;
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) =>
      row.measureId === law.measureId &&
      row.outcome === "enacted" &&
      row.resolvedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.resolvedAt <= cutoff.asOfDate)),
  );
  return enactment &&
    measureAnswersAt(world, law.measureId, enactment.sequence).some(
      (answer) =>
        world.policyCatalog.propositions[answer.propositionId]?.stableKey ===
          questionKey && answer.answer === law.answer,
    )
    ? enactment
    : null;
}

export function finalTermProvisions(
  world: World,
  measureId: EntityId,
  throughSequence = Infinity,
) {
  const versions = (world.history.legislativeProvisions ?? []).filter(
    (row) =>
      row.measureId === measureId &&
      row.sequence <= throughSequence &&
      row.recordedAt <= world.currentDate,
  );
  const replaced = new Set(
    versions.flatMap((row) =>
      row.supersedesProvisionId ? [row.supersedesProvisionId] : [],
    ),
  );
  return versions.filter((row) => !replaced.has(row.id));
}

/** Reads only the adopted text at enactment, never filing parameters or defaults. */
export function readFinalEnactedLawTerm(
  world: World,
  law: LawInForce,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
    readonly onDate?: IsoDate;
    readonly cutoff?: HistoricalCutoff;
  },
): FinalEnactedLawTerm | null {
  const onDate = input.onDate ?? world.currentDate;
  if (onDate > world.currentDate) return null;
  if (law.origin === "in-force-at-start") {
    const matches = startingLawTerms(law, input.questionKey, onDate).filter(
      (term) =>
        term.questionKey === input.questionKey && term.key === input.termKey,
    );
    if (matches.length !== 1) return null;
    const term = matches[0]!;
    if (term.unit !== input.unit || !Number.isFinite(term.value)) return null;
    return {
      value: term.value,
      unit: term.unit,
      measureId: law.measureId,
      provisionId: null,
      sourceRecordIds: [law.measureId],
    };
  }
  const enactment = finalTermEnactment(
    world,
    law,
    input.questionKey,
    onDate,
    input.cutoff,
  );
  if (!enactment) return null;
  const matches = finalTermProvisions(
    world,
    law.measureId,
    enactment.sequence,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawTerms ?? [])
          .filter(
            (term) =>
              term.questionKey === input.questionKey &&
              term.key === input.termKey,
          )
          .map((term) => ({ provision, term }))
      : [],
  );
  // Conflicting sections are unsupported, rather than selecting whichever appeared first.
  if (matches.length !== 1) return null;
  const { provision, term } = matches[0]!;
  if (term.unit !== input.unit) return null;
  return {
    value: term.value,
    unit: term.unit,
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
  };
}
