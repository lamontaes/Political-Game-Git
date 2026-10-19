import budgets from "../../data/research/money/government-budgets-2026.json" with { type: "json" };

const PLACE_KEYS = Object.keys(budgets.places).sort();

/** Validate that a sourced place table represents the full research corpus. */
export function validatePlaceTable<T extends { readonly placeKey: string }>(
  name: string,
  rows: readonly T[],
): readonly T[] {
  const keys = rows.map((row) => row.placeKey);
  const unique = new Set(keys);
  if (unique.size !== keys.length)
    throw new Error(`${name} contains duplicate place rows`);
  const missing = PLACE_KEYS.filter((key) => !unique.has(key));
  const unexpected = keys.filter((key) => !PLACE_KEYS.includes(key));
  if (missing.length || unexpected.length)
    throw new Error(
      `${name} place coverage differs from the 56-place corpus (missing: ${missing.join(", ")}; unexpected: ${unexpected.join(", ")})`,
    );
  return rows;
}
