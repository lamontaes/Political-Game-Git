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
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/**
 * Accepted `main` this branch sits on: the merge of PR #102.
 *
 * It moved while this wave was open, for the reason the other boundary checks
 * in this directory already record: the question was what THIS branch added
 * to the `main` it sat on, so measuring from an older commit would have counted
 * somebody else's accepted files as changes made here.
 */
export const EXECUTIVE_GOVERNING_BASE =
  "982f613a9737e25e506dc430e4f6e121dd72b3ca";

/** Where the wave stopped before PR #112 merged into `main`. */
export const EXECUTIVE_GOVERNING_HEAD =
  "409147596f9c130a91e11f6d806a7deb5e08d2c1";

const MISSING_RANGE = `The 92H current-mechanics wave shipped as ${EXECUTIVE_GOVERNING_BASE}..${EXECUTIVE_GOVERNING_HEAD}, and one of those commits is not in this clone. Fetch full history before trusting this suite.`;

function measuredChanges(): readonly string[] {
  const changed = changedFilesSince(
    REPOSITORY_ROOT,
    EXECUTIVE_GOVERNING_BASE,
    EXECUTIVE_GOVERNING_HEAD,
  );
  if (changed === null) throw new Error(MISSING_RANGE);
  return changed;
}

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

describe("92H current-mechanics wave ownership boundary", () => {
  it("has the closed shipped range it measures", () => {
    expect(hasCommit(REPOSITORY_ROOT, EXECUTIVE_GOVERNING_BASE)).toBe(true);
    expect(hasCommit(REPOSITORY_ROOT, EXECUTIVE_GOVERNING_HEAD)).toBe(true);
  });

  it("edits nothing owned by PR #85, PR #101 or PR #79", () => {
    const violations = measuredChanges().flatMap((file) => {
      const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
      return owner ? [`${file} — owned by ${owner.owner}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
