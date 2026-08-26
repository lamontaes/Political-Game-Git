export const RUN_A_CIVIC_CONCEPT_ID = "committee-referral";
export const RUN_A_LEARNING_STORAGE_KEY =
  "political-game:run-a:learned-concepts:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LearnedConceptSnapshot {
  readonly version: 1;
  readonly concepts: readonly string[];
}

function isKnownConcept(value: unknown): value is string {
  return value === RUN_A_CIVIC_CONCEPT_ID;
}

export function loadLearnedConcepts(storage: StorageLike): readonly string[] {
  const serialized = storage.getItem(RUN_A_LEARNING_STORAGE_KEY);
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<LearnedConceptSnapshot>;
    if (parsed.version !== 1 || !Array.isArray(parsed.concepts)) {
      return [];
    }
    return [...new Set(parsed.concepts.filter(isKnownConcept))].sort();
  } catch {
    return [];
  }
}

export function persistLearnedConcepts(
  storage: StorageLike,
  concepts: readonly string[],
): void {
  const snapshot: LearnedConceptSnapshot = {
    version: 1,
    concepts: [...new Set(concepts.filter(isKnownConcept))].sort(),
  };
  storage.setItem(RUN_A_LEARNING_STORAGE_KEY, JSON.stringify(snapshot));
}
