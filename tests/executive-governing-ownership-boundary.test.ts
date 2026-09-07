import path from "path";
import { describe, expect, it } from "vitest";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

/**
 * The 92H current-mechanics wave's file boundary, as an executable check.
 *
 * Three branches were open when this one was cut, and the routing authority
 * named exactly what each of them owns:
 *
 *   PR #85  — the owner-play repair: the canonical world and type unions, the
 *             simulation index, future transitions, and every player and
 *             presentation surface.
 *   PR #101 — the executive-authority rule substrate and its index delta.
 *   PR #79  — legislative bargaining.
 *
 * This wave is additive and headless, so the promise it makes is a negative
 * one: it adds new modules and touches none of those. A completion report
 * saying so is worth very little, which is why the promise is a test.
 *
 * If either end of the range is missing from this clone the test fails rather
 * than passing quietly. A boundary check that silently no-ops is worse than
 * none, and CI fetches full history for that reason.
 *
 * The range is closed now that this wave has landed. While PR #112 was in
 * flight, the working tree was the only head it had. After it merged, that
 * comparison started treating every later branch as part of this wave. Pinning
 * both ends keeps this test as an executable claim about what PR #112 shipped
 * without weakening the ownership boundary for that historical packet.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/**
 * Accepted `main` this branch sat on: the merge of PR #102.
 *
 * It moved while the branch was in flight so the check measured only what this
 * wave added. Now that PR #112 has landed, this base and the frozen head below
 * remain fixed: together they describe the historical packet rather than any
 * later checkout that inherits it.
 */
export const EXECUTIVE_GOVERNING_BASE =
  "982f613a9737e25e506dc430e4f6e121dd72b3ca";

/** Where the 92H current-mechanics wave stopped: PR #112's feature head. */
export const EXECUTIVE_GOVERNING_HEAD =
  "409147596f9c130a91e11f6d806a7deb5e08d2c1";

const MISSING_RANGE = `PR #112 shipped as ${EXECUTIVE_GOVERNING_BASE}..${EXECUTIVE_GOVERNING_HEAD}, and one of those commits is not in this clone, so the ownership boundary could not be checked. Fetch full history before trusting this suite.`;

interface OwnedElsewhere {
  readonly pattern: RegExp;
  readonly owner: string;
}

const FORBIDDEN: readonly OwnedElsewhere[] = [
  {
    pattern: /^src\/simulation\/types\.ts$/,
    owner: "PR #85 owner-play repair",
  },
  {
    pattern: /^src\/simulation\/world\.ts$/,
    owner: "PR #85 owner-play repair",
  },
  {
    pattern: /^src\/simulation\/index\.ts$/,
    owner: "PR #85 owner-play repair",
  },
  {
    pattern: /^src\/simulation\/future-transitions\.ts$/,
    owner: "PR #85 owner-play repair",
  },
  { pattern: /^src\/player\//, owner: "PR #85 owner-play repair" },
  { pattern: /^src\/presentation\//, owner: "PR #85 owner-play repair" },
  {
    pattern: /^src\/simulation\/executive-authority-rules?\.ts$/,
    owner: "PR #101 executive-authority substrate",
  },
  {
    pattern: /^src\/simulation\/executive-authority-rule-packs\.ts$/,
    owner: "PR #101 executive-authority substrate",
  },
  {
    pattern: /^src\/simulation\/legislative-bargaining/,
    owner: "PR #79 legislative bargaining",
  },
  { pattern: /^package\.json$/, owner: "shared central scripts" },
  { pattern: /^package-lock\.json$/, owner: "shared central scripts" },
];

function measuredChanges(
  repositoryRoot = REPOSITORY_ROOT,
  base = EXECUTIVE_GOVERNING_BASE,
  head = EXECUTIVE_GOVERNING_HEAD,
): readonly string[] {
  if (!hasCommit(repositoryRoot, base) || !hasCommit(repositoryRoot, head)) {
    throw new Error(MISSING_RANGE);
  }
  const files = changedFilesSince(repositoryRoot, base, head);
  if (files === null) throw new Error(MISSING_RANGE);
  return files;
}

function ownershipViolations(files: readonly string[]): readonly string[] {
  return files.flatMap((file) => {
    const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
    return owner ? [`${file} — owned by ${owner.owner}`] : [];
  });
}

describe("92H current-mechanics wave ownership boundary", () => {
  it("can see the frozen range it is measuring", () => {
    expect(() => measuredChanges()).not.toThrow();
  });

  it("edits nothing owned by PR #85, PR #101 or PR #79", () => {
    expect(ownershipViolations(measuredChanges())).toEqual([]);
  });

  it("does not attribute a later legitimate forbidden-path change to PR #112", () => {
    const laterChanges = changedFilesSince(
      REPOSITORY_ROOT,
      EXECUTIVE_GOVERNING_HEAD,
    );
    expect(laterChanges).not.toBeNull();
    expect(laterChanges).toContain("package.json");
    expect(measuredChanges()).not.toContain("package.json");
  });

  it("would still reject a forbidden path inside the frozen range", () => {
    expect(ownershipViolations([...measuredChanges(), "package.json"])).toEqual(
      ["package.json — owned by shared central scripts"],
    );
  });

  it("fails closed when either endpoint is missing", () => {
    const missingCommit = "0000000000000000000000000000000000000000";
    expect(() =>
      measuredChanges(REPOSITORY_ROOT, missingCommit, EXECUTIVE_GOVERNING_HEAD),
    ).toThrow(MISSING_RANGE);
    expect(() =>
      measuredChanges(REPOSITORY_ROOT, EXECUTIVE_GOVERNING_BASE, missingCommit),
    ).toThrow(MISSING_RANGE);
  });
});
