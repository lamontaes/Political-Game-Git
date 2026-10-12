/** Test and measurement place draw: one of the 56 jurisdictions, then a recorded locality. */
import { createHash } from "node:crypto";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../../src/simulation/life-places";

export interface DrawnPlace {
  seed: string;
  key: string;
  name: string;
  state: string;
}

/** Hash the seed, pick one of the 56 jurisdictions, then one recorded locality. */
export function drawPlace(seed: string, purpose: string): DrawnPlace {
  const hash = createHash("sha256").update(`${seed}:${purpose}`).digest("hex");
  const identities = [...lifePlaceStateIdentities()].sort((a, b) =>
    a.jurisdictionKey.localeCompare(b.jurisdictionKey),
  );
  if (identities.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const identity = identities[parseInt(hash.slice(0, 8), 16) % 56]!;
  const localities = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: identity.jurisdictionKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  if (!localities.length)
    throw new Error(`No recorded locality for ${identity.jurisdictionKey}`);
  const locality =
    localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
  return {
    seed: hash,
    key: locality.key,
    name: locality.displayName,
    state: identity.jurisdictionKey,
  };
}
