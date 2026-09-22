import path from "path";

import {
  SEATED_CHAIR_SEPARATION_VERSION,
  separateSeatedChairs,
} from "./seated-chair-separation";

/**
 * Recovers the body from each wave-a seated plate that has a chair drawn behind
 * it. Deterministic: same inputs, same output bytes.
 */

const repositoryRoot = path.resolve(process.cwd());
const derivatives = await separateSeatedChairs(repositoryRoot);

console.log(
  JSON.stringify(
    {
      version: SEATED_CHAIR_SEPARATION_VERSION,
      derivative_count: derivatives.length,
      derivatives,
    },
    null,
    2,
  ),
);
