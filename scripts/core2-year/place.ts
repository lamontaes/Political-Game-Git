/** Test and measurement place draw: one of the 56 jurisdictions, then a recorded locality. */
import { createHash } from "node:crypto";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";

export interface DrawnPlace {
  seed: string;
  key: string;
  name: string;
  state: string;
}

/** Hash the seed, pick one of the 56 jurisdictions, then one recorded locality. */
export function drawPlace(seed: string, purpose: string): DrawnPlace {
  const hash = createHash("sha256").update(`${seed}:${purpose}`).digest("hex");
  const keys = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  if (keys.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const stateKey = keys[parseInt(hash.slice(0, 8), 16) % keys.length]!;
  const localities = [...placeLocalities(stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  if (!localities.length)
    throw new Error(`No recorded locality for ${stateKey}`);
  const locality =
    localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
  return {
    seed: hash,
    key: locality.key,
    name: locality.displayName,
    state: stateKey,
  };
}
