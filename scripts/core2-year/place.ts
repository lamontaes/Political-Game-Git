/** Test and measurement place draw: one of the 56 jurisdictions, then a recorded locality. */
import { createHash } from "node:crypto";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";

export interface DrawnPlace {
  seed: string;
  key: string;
  name: string;
  state: string;
}

/**
 * Hash the seed, pick one of the 56 jurisdictions, then one recorded
 * locality. With `accept`, the locality is one it passes; a jurisdiction
 * with none steps to the next in sorted order, so every place stays drawable
 * and no place is named in logic. The default accepts all, so a draw without
 * it is unchanged.
 */
export function drawPlace(
  seed: string,
  purpose: string,
  accept?: (key: string) => boolean,
): DrawnPlace {
  const hash = createHash("sha256").update(`${seed}:${purpose}`).digest("hex");
  const keys = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  if (keys.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const first = parseInt(hash.slice(0, 8), 16) % keys.length;
  for (let step = 0; step < keys.length; step++) {
    const stateKey = keys[(first + step) % keys.length]!;
    const localities = [...placeLocalities(stateKey)]
      .sort((a, b) => a.key.localeCompare(b.key))
      .filter((row) => !accept || accept(row.key));
    if (!localities.length) {
      if (!accept) throw new Error(`No recorded locality for ${stateKey}`);
      continue;
    }
    const locality =
      localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
    return {
      seed: hash,
      key: locality.key,
      name: locality.displayName,
      state: stateKey,
    };
  }
  throw new Error(`No recorded locality passes the draw's test (${purpose})`);
}
