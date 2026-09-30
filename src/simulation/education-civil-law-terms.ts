import { lawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate, World } from "./types";

export const CURRICULUM_QUESTION =
  "us-policy-positions:education.state-curriculum-standards";
export const LIBRARY_QUESTION =
  "us-policy-positions:civil-family-community.local-control-of-library-materials";

/** Read saved terms from the governing measure without restoring a sponsor factory. */
export function educationCivilLawTermsInForce(
  world: World,
  jurisdictionId: EntityId,
  questionKey: typeof CURRICULUM_QUESTION | typeof LIBRARY_QUESTION,
  onDate: IsoDate,
) {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  );
  if (!proposition) return null;
  const law = lawInForce(world, jurisdictionId, proposition.id, onDate);
  if (!law || law.answer !== "yes") return null;
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === law.measureId,
  );
  // Legacy saves may contain filed terms not yet declared by the shared schema.
  // Missing or malformed terms retain the law reading, but cannot create a bill.
  const saved = measure as unknown as { policyTerms?: unknown } | undefined;
  const rows = Array.isArray(saved?.policyTerms) ? saved.policyTerms : [];
  const row = rows.find(
    (candidate: unknown) =>
      candidate !== null &&
      typeof candidate === "object" &&
      "questionKey" in candidate &&
      candidate.questionKey === questionKey,
  ) as { values?: unknown } | undefined;
  const values: Record<string, number> = {};
  if (row?.values && typeof row.values === "object") {
    for (const [key, value] of Object.entries(row.values)) {
      if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0 &&
        (key !== "phaseInMonths" || value > 0)
      )
        values[key] = value;
    }
  }
  return { law, terms: row ? { values } : null };
}
