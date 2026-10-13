import { createHash } from "node:crypto";
import { placeLocalities, placeStateKeys } from "../../src/core2/places.ts";
export function drawPlace(commit: string, specId: string) {
  const seed = createHash("sha256").update(`${commit}:${specId}`).digest("hex");
  const keys = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  if (keys.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const stateKey = keys[parseInt(seed.slice(0, 8), 16) % keys.length]!;
  const localities = [...placeLocalities(stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  if (!localities.length)
    throw new Error(`No recorded locality for ${stateKey}`);
  const locality =
    localities[parseInt(seed.slice(8, 16), 16) % localities.length];
  return {
    seed,
    key: locality.key,
    name: locality.displayName,
    state: stateKey,
  };
}
