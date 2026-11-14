/**
 * Where a line is said, as one string: the fields the pickers treat as
 * alternatives (scene talk's `fitting`, the mined banks' `variants`). The
 * rules run (`line-rules.ts`, `spotsOf`) and play (`bank-parts.ts`, a use a
 * rule pulled in its spot) read the same id, so a pull made by the run is the
 * use play leaves out. The facts a use requires or excludes are not part of
 * it: they only decide which alternative the world allows.
 */

/** The spot identity fields of a use: what the pickers treat as alternatives. */
export const SPOT_FIELDS = [
  "subject",
  "role",
  "move",
  "choice",
  "key",
  "step",
  "purpose",
  "after",
  "outcome",
] as const;

/** One use's spot within its piece's bank. */
export function useSpotId(use: Readonly<Record<string, unknown>>): string {
  return SPOT_FIELDS.map((field) => {
    const value = use[field];
    return value === undefined || value === null ? "" : String(value);
  }).join("|");
}
