import { createStableId } from "./ids";
import { STATES } from "./state-reference";
import type { EntityId } from "./types";

/**
 * The three authored state contexts predate the national placeholder pattern.
 * Keep their IDs while resolving state identity without loading scenarios.
 */
const AUTHORED_STATE_SLUGS: Readonly<Record<string, string>> = {
  "US-AK": "us-ak-state-placeholder",
  "US-KY": "us-ky-commonwealth-placeholder",
  "US-NE": "us-ne-state-placeholder",
};

export function canonicalStateJurisdictionId(
  jurisdictionKey: string,
): EntityId | null {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  if (!usps || !STATES[usps] || usps === "DC") return null;
  const slug =
    AUTHORED_STATE_SLUGS[jurisdictionKey] ??
    `state-${jurisdictionKey.toLowerCase()}-placeholder`;
  return createStableId("jurisdiction", `definition:${slug}`);
}
