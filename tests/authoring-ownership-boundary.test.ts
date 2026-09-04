import path from "path";
import { describe, expect, it } from "vitest";

import {
  BASE_COMMIT,
  changedFilesSince,
  ownershipViolations,
  straySurfaces,
} from "./support/ownership-boundary";

/**
 * The Packet 26 ownership boundary, as an executable check.
 *
 * This work stacks on PR #63 and is confined to graphics, art, scene-authoring,
 * tooling and data-contract surfaces. Several neighbouring systems are owned by
 * other in-flight branches, and touching them here would create exactly the
 * overlap that makes a stack painful to land.
 *
 * A prose promise not to touch those files is worth very little on a branch
 * this size, so the promise is a test. It compares the working tree against the
 * declared base and fails naming any forbidden path that moved.
 *
 * If the base commit is not in this clone, every assertion here fails rather
 * than passing quietly: a boundary check that silently no-ops is worse than
 * none. CI fetches full history for that reason — see
 * `.github/workflows/validate.yml`. The failure path itself is proved against
 * synthetic CI-shaped histories in
 * `tests/authoring-ownership-boundary-harness.test.ts`.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

const MISSING_BASE = `Base commit ${BASE_COMMIT} is not in this clone, so the ownership boundary could not be checked. Fetch it before trusting this suite.`;

function measuredChanges(): readonly string[] {
  const files = changedFilesSince(REPOSITORY_ROOT, BASE_COMMIT);
  if (files === null) throw new Error(MISSING_BASE);
  return files;
}

describe("Packet 26 ownership boundary", () => {
  it("can see the base commit it is measuring against", () => {
    expect(() => measuredChanges()).not.toThrow();
  });

  it("changes nothing owned by player, save, legislation or name systems", () => {
    expect(ownershipViolations(measuredChanges())).toEqual([]);
  });

  it("keeps its changes inside the surfaces this packet owns", () => {
    expect(straySurfaces(measuredChanges())).toEqual([]);
  });
});
