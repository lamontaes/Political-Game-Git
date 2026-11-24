import { createHash } from "node:crypto";

/** Seeded opening geography only; this never selects an actor's outcome. */
export function selectBenchPlace(seed, jurisdictions, places) {
  if (typeof seed !== "string" || !seed.trim())
    throw new Error("A nonempty seed is required.");
  const keys = jurisdictions.map((row) => row.jurisdictionKey);
  if (!keys.length || new Set(keys).size !== keys.length)
    throw new Error("The jurisdiction catalog must be nonempty and unique.");
  const groups = new Map(keys.map((key) => [key, []]));
  for (const place of places) {
    if (place.scope === "locality")
      groups.get(place.stateJurisdictionKey)?.push(place);
  }
  const missing = [...groups].filter(([, rows]) => !rows.length);
  if (missing.length)
    throw new Error(
      `Locality coverage missing: ${missing.map(([key]) => key).join(", ")}`,
    );
  const rank = (domain, key) =>
    createHash("sha256")
      .update(JSON.stringify(["M0-bench", seed, domain, key]))
      .digest("hex");
  const least = (rows, keyOf, domain) =>
    rows.reduce((best, row) =>
      rank(domain, keyOf(row)) < rank(domain, keyOf(best)) ? row : best,
    );
  const jurisdictionKey = least(keys, (key) => key, "jurisdiction");
  return least(groups.get(jurisdictionKey), (row) => row.key, "locality");
}
