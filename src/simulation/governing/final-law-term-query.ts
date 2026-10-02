import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import type { LawAmountUnit } from "../law-consequence-types";
import type { RentalPriceRule } from "../law-consequence-types";
import {
  startingLawTerms,
  startingLawCategories,
  startingLawSchedules,
  type LawInForce,
} from "./law-in-force";
import {
  assertLawCategories,
  assertLawSchedules,
  type LawScheduleTerm,
} from "../law-structured-terms";
import { measureAnswersAt } from "../vote-bundle";

export interface FinalEnactedLawTerm {
  readonly value: number;
  readonly unit: LawAmountUnit;
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
  readonly rentalPriceRule?: RentalPriceRule;
}

export interface FinalEnactedLawCategories {
  readonly values: readonly string[];
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
}

export interface FinalEnactedLawSchedule {
  readonly term: LawScheduleTerm;
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
}

interface StructuredTermQuery {
  readonly questionKey: string;
  readonly termKey: string;
  readonly onDate?: IsoDate;
  readonly cutoff?: HistoricalCutoff;
}

function structuredQueryDate(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): IsoDate | null {
  const onDate = input.onDate ?? input.cutoff?.asOfDate ?? world.currentDate;
  return onDate <= world.currentDate &&
    law.operativeAt <= onDate &&
    (!input.cutoff || onDate <= input.cutoff.asOfDate)
    ? onDate
    : null;
}

/** Same category reader for adopted and starting text, with explicit provenance. */
export function readFinalEnactedLawCategories(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): FinalEnactedLawCategories | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const categories = startingLawCategories(law, input.questionKey, onDate);
    try {
      assertLawCategories(world, categories);
    } catch {
      return null;
    }
    const matches = categories.filter(
      (category) =>
        category.questionKey === input.questionKey &&
        category.key === input.termKey,
    );
    return matches.length === 1
      ? {
          values: [...matches[0]!.values],
          measureId: law.measureId,
          provisionId: null,
          sourceRecordIds: [law.measureId],
        }
      : null;
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
    onDate,
    input.cutoff,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawCategories ?? [])
          .filter(
            (category) =>
              category.questionKey === input.questionKey &&
              category.key === input.termKey,
          )
          .map((category) => ({ provision, category }))
      : [],
  );
  if (matches.length !== 1) return null;
  const { provision, category } = matches[0]!;
  try {
    assertLawCategories(world, [category]);
  } catch {
    return null;
  }
  return {
    values: [...category.values],
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
  };
}

/** Returns the recorded table to the existing domain calculator; no scalar reduction. */
export function readFinalEnactedLawSchedule(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): FinalEnactedLawSchedule | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const terms = startingLawSchedules(law, input.questionKey, onDate);
    try {
      assertLawSchedules(world, terms);
    } catch {
      return null;
    }
    const matches = terms.filter(
      (term) =>
        term.questionKey === input.questionKey && term.key === input.termKey,
    );
    return matches.length === 1
      ? {
          term: structuredClone(matches[0]!),
          measureId: law.measureId,
          provisionId: null,
          sourceRecordIds: [law.measureId],
        }
      : null;
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
    onDate,
    input.cutoff,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawSchedules ?? [])
          .filter(
            (term) =>
              term.questionKey === input.questionKey &&
              term.key === input.termKey,
          )
          .map((term) => ({ provision, term }))
      : [],
  );
  if (matches.length !== 1) return null;
  const { provision, term } = matches[0]!;
  try {
    assertLawSchedules(world, [term]);
  } catch {
    return null;
  }
  return {
    term: structuredClone(term),
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
  };
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
  onDate: IsoDate = world.currentDate,
  cutoff?: HistoricalCutoff,
) {
  const versions = (world.history.legislativeProvisions ?? []).filter(
    (row) =>
      row.measureId === measureId &&
      row.sequence <= throughSequence &&
      row.recordedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.recordedAt <= cutoff.asOfDate)),
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
    readonly workplaceKey?: string;
  },
): FinalEnactedLawTerm | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const matches = startingLawTerms(
      law,
      input.questionKey,
      onDate,
      input.workplaceKey,
    ).filter(
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
      ...(term.rentalPriceRule
        ? { rentalPriceRule: term.rentalPriceRule }
        : {}),
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
    onDate,
    input.cutoff,
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
    ...(term.rentalPriceRule ? { rentalPriceRule: term.rentalPriceRule } : {}),
  };
}
