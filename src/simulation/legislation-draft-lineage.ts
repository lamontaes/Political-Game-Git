import { createStableId } from "./ids";
import { requireMeasure } from "./legislation";
import type { ProgramParameterValue } from "./legislation-program-families";
import type {
  CurrencyCode,
  EntityId,
  IsoDate,
  LegislativeDraftLineageRecord,
  LegislativeDraftParameterRecord,
  World,
} from "./types";

/**
 * Where a filed bill's text came from.
 *
 * A measure says what a bill is called. Provisions say what it currently reads
 * and what it used to read. Neither says that the text was produced by a named
 * programme family, at a named version of that family, from a named set of
 * parameter values — and that is the fact a docket needs in order to reopen a
 * bill months later and still know what it is.
 *
 * The record is written once, when the bill is filed, and never rewritten. That
 * is deliberate and it is the guarantee the content bank rests on: editing a
 * family in the bank changes what a *new* bill would say, and can never restate
 * a bill somebody already filed, because the filed text lives in append-only
 * provisions and the configuration that produced it is pinned here.
 *
 * Nothing in this module estimates, schedules or realizes anything. It records
 * lineage.
 */

export interface RecordDraftLineageInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly familyKey: string;
  readonly familyVersion: string;
  readonly variantKey: string;
  readonly compiledAt: IsoDate;
  readonly parameterValues: Readonly<Record<string, ProgramParameterValue>>;
  readonly provenanceNote: string;
}

/**
 * Turns the compiler's in-memory values into saved records.
 *
 * Sorted by parameter key so the serialized world is stable: two saves of the
 * same configuration are byte-identical regardless of the order the player
 * happened to move the controls in.
 */
function toParameterRecords(
  values: Readonly<Record<string, ProgramParameterValue>>,
): readonly LegislativeDraftParameterRecord[] {
  return Object.keys(values)
    .sort()
    .map((parameterKey) => {
      const value = values[parameterKey]!;
      switch (value.kind) {
        case "money":
          return {
            parameterKey,
            kind: "money" as const,
            minorUnits: value.minorUnits,
            currency: value.currency as CurrencyCode,
          };
        case "enumerated":
          return {
            parameterKey,
            kind: "enumerated" as const,
            value: value.value,
          };
        case "duration-years":
          return {
            parameterKey,
            kind: "duration-years" as const,
            years: value.years,
          };
        case "integer":
          return { parameterKey, kind: "integer" as const, value: value.value };
      }
    });
}

export function recordDraftLineage(
  world: World,
  input: RecordDraftLineageInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  if (
    (world.history.legislativeDraftLineages ?? []).some(
      (record) => record.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Duplicate legislative draft lineage: ${input.stableKey}`);
  }
  if (
    (world.history.legislativeDraftLineages ?? []).some(
      (record) => record.measureId === measure.id,
    )
  ) {
    // One bill, one lineage. A second one would mean two answers to "which
    // configuration wrote this", and the later answer would win by accident.
    throw new Error(
      `${measure.designation} already records the configuration it was drafted from.`,
    );
  }
  if (!input.familyKey.trim() || !input.variantKey.trim()) {
    throw new Error("A draft lineage names a family and a configuration.");
  }
  if (!input.familyVersion.trim()) {
    throw new Error(
      "A draft lineage pins the family version it was compiled at.",
    );
  }

  const record: LegislativeDraftLineageRecord = {
    id: createStableId(
      "legislative-draft-lineage",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    familyKey: input.familyKey,
    familyVersion: input.familyVersion,
    variantKey: input.variantKey,
    compiledAt: input.compiledAt,
    recordedAt: world.currentDate,
    parameters: toParameterRecords(input.parameterValues),
    provenanceNote: input.provenanceNote,
  };

  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeDraftLineages: [
        ...(world.history.legislativeDraftLineages ?? []),
        record,
      ],
    },
  };
}

export function draftLineageForMeasure(
  world: World,
  measureId: EntityId,
): LegislativeDraftLineageRecord | null {
  return (
    (world.history.legislativeDraftLineages ?? []).find(
      (record) => record.measureId === measureId,
    ) ?? null
  );
}

/** Reads saved parameter records back into the compiler's value shape. */
export function draftParameterValues(
  record: LegislativeDraftLineageRecord,
): Readonly<Record<string, ProgramParameterValue>> {
  const values: Record<string, ProgramParameterValue> = {};
  for (const parameter of record.parameters) {
    switch (parameter.kind) {
      case "money":
        values[parameter.parameterKey] = {
          kind: "money",
          minorUnits: parameter.minorUnits,
          currency: parameter.currency,
        };
        break;
      case "enumerated":
        values[parameter.parameterKey] = {
          kind: "enumerated",
          value: parameter.value,
        };
        break;
      case "duration-years":
        values[parameter.parameterKey] = {
          kind: "duration-years",
          years: parameter.years,
        };
        break;
      case "integer":
        values[parameter.parameterKey] = {
          kind: "integer",
          value: parameter.value,
        };
        break;
    }
  }
  return values;
}

export function draftLineageHistoryRecords(
  world: World,
): readonly LegislativeDraftLineageRecord[] {
  return world.history.legislativeDraftLineages ?? [];
}

export function draftLineageEntityExists(world: World, id: EntityId): boolean {
  return (world.history.legislativeDraftLineages ?? []).some(
    (record) => record.id === id,
  );
}

/**
 * The integrity this record family owes the rest of the world.
 *
 * Every lineage points at a measure that exists, no measure has two, and the
 * saved parameter shapes are the ones the compiler can read back. A world that
 * fails any of these does not load, which is the same standard the provision
 * and commitment records already hold themselves to.
 */
export function assertDraftLineageIntegrity(world: World): void {
  const records = world.history.legislativeDraftLineages ?? [];
  const measures = world.history.legislativeMeasures ?? [];
  const seenMeasures = new Set<EntityId>();
  for (const record of records) {
    if (!measures.some((measure) => measure.id === record.measureId)) {
      throw new Error(
        `Draft lineage ${record.stableKey} names a measure this world does not contain.`,
      );
    }
    if (seenMeasures.has(record.measureId)) {
      throw new Error(
        `Two draft lineages claim the same measure: ${record.stableKey}.`,
      );
    }
    seenMeasures.add(record.measureId);
    if (!record.familyVersion.trim()) {
      throw new Error(
        `Draft lineage ${record.stableKey} records no family version, so the bank could move under it.`,
      );
    }
    for (const parameter of record.parameters) {
      if (
        parameter.kind === "money" &&
        !Number.isSafeInteger(parameter.minorUnits)
      ) {
        throw new Error(
          `Draft lineage ${record.stableKey} records a non-integer amount for '${parameter.parameterKey}'.`,
        );
      }
      if (
        parameter.kind === "integer" &&
        !Number.isSafeInteger(parameter.value)
      ) {
        throw new Error(
          `Draft lineage ${record.stableKey} records a non-integer value for '${parameter.parameterKey}'.`,
        );
      }
    }
  }
}
