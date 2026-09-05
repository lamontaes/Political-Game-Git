import path from "path";
import { describe, expect, it } from "vitest";

import {
  BASE_COMMIT,
  PACKET_26_HEAD,
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
 * this size, so the promise is a test. It compares the range the packet shipped
 * against the declared base and fails naming any forbidden path that moved.
 *
 * If either end of the range is not in this clone, every assertion here fails
 * rather than passing quietly: a boundary check that silently no-ops is worse
 * than none. CI fetches full history for that reason — see
 * `.github/workflows/validate.yml`. The failure path itself is proved against
 * synthetic CI-shaped histories in
 * `tests/authoring-ownership-boundary-harness.test.ts`.
 *
 * The range is closed at both ends. While Packet 26 was in flight the head was
 * the working tree, which is the only head an unlanded packet has. Packet 26
 * landed as PR #82, and from then on a working-tree comparison was quietly a
 * claim about whatever branch happened to be checked out: every later branch
 * inherited a boundary it never agreed to, and failed it for touching the
 * simulation surfaces those later packets are told to own. Closing the range
 * keeps the claim this file was written to make, about the packet that made it.
 * A later packet wanting a boundary declares its own range — see
 * `tests/narrative-wave-ownership-boundary.test.ts`.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

const MISSING_RANGE = `Packet 26 shipped as ${BASE_COMMIT}..${PACKET_26_HEAD}, and one of those commits is not in this clone, so the ownership boundary could not be checked. Fetch full history before trusting this suite.`;

function measuredChanges(): readonly string[] {
  const files = changedFilesSince(REPOSITORY_ROOT, BASE_COMMIT, PACKET_26_HEAD);
  if (files === null) throw new Error(MISSING_RANGE);
  return files;
}

describe("Packet 26 ownership boundary", () => {
  it("can see the range it is measuring", () => {
    expect(() => measuredChanges()).not.toThrow();
  });

  it("changes nothing owned by player, save, legislation or name systems", () => {
    expect(ownershipViolations(measuredChanges())).toEqual([]);
  });

  it("keeps its changes inside the surfaces this packet owns", () => {
    expect(straySurfaces(measuredChanges())).toEqual([]);
  });
});
