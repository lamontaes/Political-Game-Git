import { createStableId } from "./ids";
import { assertExactQuantity, compareExactQuantities } from "./quantity";
import { assertDottedContentKey } from "./taxonomy";
import type {
  ExactQuantity,
  MortalityRateEntry,
  MortalityTableDefinition,
  VitalityCatalog,
  VitalitySemanticKey,
} from "./types";

export interface MortalityTableDefinitionInput {
  readonly stableKey: string;
  readonly label: string;
  readonly description: string;
  readonly sourceKey: VitalitySemanticKey;
  readonly rates: readonly MortalityRateEntry[];
}

export interface VitalityCatalogInput {
  readonly mortalityTables: readonly MortalityTableDefinition[];
}

const ZERO_SHARE: ExactQuantity = {
  numerator: 0,
  denominator: 1,
  unit: "rate:share",
};
const ONE_SHARE: ExactQuantity = {
  numerator: 1,
  denominator: 1,
  unit: "rate:share",
};
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function createMortalityTableDefinition(
  input: MortalityTableDefinitionInput,
): MortalityTableDefinition {
  return {
    ...input,
    id: createStableId(
      "mortality-table-definition",
      `definition:${input.stableKey}`,
    ),
    rates: input.rates.map((entry) => ({
      age: entry.age,
      annualProbability: { ...entry.annualProbability },
    })),
  };
}

export function createVitalityCatalog(
  input: VitalityCatalogInput,
): VitalityCatalog {
  const catalog: VitalityCatalog = {
    catalogVersion: "vitality-catalog-v1",
    mortalityTables: Object.fromEntries(
      input.mortalityTables.map((table) => [
        table.id,
        cloneMortalityTableDefinition(table),
      ]),
    ),
    mortalityTableOrder: input.mortalityTables.map((table) => table.id),
  };
  assertVitalityCatalogIntegrity(catalog);
  return cloneVitalityCatalog(catalog);
}

export function createSyntheticVitalityCatalog(): VitalityCatalog {
  const exactRates = (numerator: 0 | 1): readonly MortalityRateEntry[] =>
    Array.from({ length: 121 }, (_, age) => ({
      age,
      annualProbability: {
        numerator,
        denominator: 1,
        unit: "rate:share" as const,
      },
    }));
  return createVitalityCatalog({
    mortalityTables: [
      createMortalityTableDefinition({
        stableKey: "vitality.synthetic-survival",
        label: "Synthetic survival fixture",
        description:
          "Non-actuarial zero-probability table for deterministic engine validation.",
        sourceKey: "source:synthetic-validation-only",
        rates: exactRates(0),
      }),
      createMortalityTableDefinition({
        stableKey: "vitality.synthetic-certain-death",
        label: "Synthetic certain-death fixture",
        description:
          "Non-actuarial unit-probability table for deterministic engine validation.",
        sourceKey: "source:synthetic-validation-only",
        rates: exactRates(1),
      }),
    ],
  });
}

export function cloneVitalityCatalog(
  catalog: VitalityCatalog,
): VitalityCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    mortalityTables: Object.fromEntries(
      Object.entries(catalog.mortalityTables).map(([id, table]) => [
        id,
        cloneMortalityTableDefinition(table),
      ]),
    ),
    mortalityTableOrder: [...catalog.mortalityTableOrder],
  };
}

export function cloneMortalityTableDefinition(
  table: MortalityTableDefinition,
): MortalityTableDefinition {
  return {
    ...table,
    rates: table.rates.map((entry) => ({
      age: entry.age,
      annualProbability: { ...entry.annualProbability },
    })),
  };
}

export function mortalityRateAtAge(
  table: MortalityTableDefinition,
  age: number,
): MortalityRateEntry | null {
  const entry = table.rates.find((candidate) => candidate.age === age);
  return entry
    ? { age: entry.age, annualProbability: { ...entry.annualProbability } }
    : null;
}

export function assertVitalityCatalogIntegrity(catalog: VitalityCatalog): void {
  if (catalog.catalogVersion !== "vitality-catalog-v1") {
    throw new Error("Unsupported vitality catalog version.");
  }
  const ids = Object.keys(catalog.mortalityTables).sort();
  const orderedIds = [...catalog.mortalityTableOrder].sort();
  if (
    new Set(catalog.mortalityTableOrder).size !==
      catalog.mortalityTableOrder.length ||
    JSON.stringify(ids) !== JSON.stringify(orderedIds)
  ) {
    throw new Error("Vitality catalog order and mortality tables disagree.");
  }
  const stableKeys = new Set<string>();
  for (const id of catalog.mortalityTableOrder) {
    const table = catalog.mortalityTables[id];
    if (!table || table.id !== id) {
      throw new Error(`Missing or miskeyed mortality table: ${id}`);
    }
    assertDottedContentKey(table.stableKey, "Mortality-table stable key");
    if (
      table.id !==
      createStableId(
        "mortality-table-definition",
        `definition:${table.stableKey}`,
      )
    ) {
      throw new Error(
        `Mortality-table ID does not match its stable key: ${id}`,
      );
    }
    if (stableKeys.has(table.stableKey)) {
      throw new Error(
        `Duplicate mortality-table stable key: ${table.stableKey}`,
      );
    }
    stableKeys.add(table.stableKey);
    assertNonEmpty(table.label, "Mortality-table label");
    assertNonEmpty(table.description, "Mortality-table description");
    assertSemanticKey(table.sourceKey, "Mortality-table source key");
    if (table.rates.length === 0) {
      throw new Error(`Mortality table has no explicit rates: ${id}`);
    }
    let priorAge = -1;
    for (const entry of table.rates) {
      if (
        !Number.isSafeInteger(entry.age) ||
        entry.age < 0 ||
        entry.age <= priorAge
      ) {
        throw new Error(
          `Mortality-table ages must be strictly increasing non-negative integers: ${id}`,
        );
      }
      priorAge = entry.age;
      assertExactQuantity(entry.annualProbability);
      if (
        entry.annualProbability.unit !== "rate:share" ||
        compareExactQuantities(entry.annualProbability, ZERO_SHARE) < 0 ||
        compareExactQuantities(entry.annualProbability, ONE_SHARE) > 0
      ) {
        throw new Error(
          `Mortality probability must be an exact bounded rate:share: ${id}`,
        );
      }
    }
  }
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
