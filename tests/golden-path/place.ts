import { createHash } from "node:crypto";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../../src/simulation/life-places";
export function drawPlace(commit: string, specId: string) {
  const seed = createHash("sha256").update(`${commit}:${specId}`).digest("hex");
  const identities = [...lifePlaceStateIdentities()].sort((a, b) =>
    a.jurisdictionKey.localeCompare(b.jurisdictionKey),
  );
  if (identities.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const identity =
    identities[parseInt(seed.slice(0, 8), 16) % identities.length];
  const localities = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: identity.jurisdictionKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  if (!localities.length)
    throw new Error(`No recorded locality for ${identity.jurisdictionKey}`);
  const locality =
    localities[parseInt(seed.slice(8, 16), 16) % localities.length];
  return {
    seed,
    key: locality.key,
    name: locality.displayName,
    state: identity.jurisdictionKey,
  };
}
