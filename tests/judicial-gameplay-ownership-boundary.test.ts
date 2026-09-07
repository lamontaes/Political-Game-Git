import path from "path";
import { describe, expect, it } from "vitest";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/** Updated to the reconciled accepted-main base immediately before publish. */
export const JUDICIAL_GAMEPLAY_BASE =
  "414b24ce6120799985d3b0bddbf196c9c064df36";

/**
 * Where the 92G judicial-gameplay packet stopped: the PR #115 head that main
 * merged. While the packet was in flight this check measured the working tree,
 * which was right then and wrong once it landed — on any later branch the
 * unpinned range counts that branch's own accepted files as 92G violations.
 * Pinning the head keeps this an executable claim about what 92G shipped, the
 * same freeze `tests/support/ownership-boundary.ts` records for Packet 26 and
 * the narrative wave applies with its own pinned range.
 */
export const JUDICIAL_GAMEPLAY_HEAD =
  "35ba89f6f60b50e5fd7fe00d44d03e928de5218b";

interface OwnedElsewhere {
  readonly pattern: RegExp;
  readonly owner: string;
}

const FORBIDDEN: readonly OwnedElsewhere[] = [
  {
    pattern: /^src\/source\/domains\/state-elective-office-identity\//,
    owner: "92L judicial selection and tenure source domain",
  },
  {
    pattern: /^data\/source\/state-elective-office-identity\//,
    owner: "92L judicial selection and tenure source artifacts",
  },
  {
    pattern: /^fixtures\/source\/state-elective-office-identity\//,
    owner: "92L judicial selection and tenure source fixtures",
  },
  {
    pattern:
      /^docs\/systems\/state-elective-office-identity(?:-coverage)?\.md$/,
    owner: "92L judicial selection and tenure documentation",
  },
  { pattern: /^src\/simulation\/types\.ts$/, owner: "shared world schema" },
  { pattern: /^src\/simulation\/world\.ts$/, owner: "shared world integrity" },
  { pattern: /^src\/simulation\/index\.ts$/, owner: "shared simulation index" },
  {
    pattern: /^src\/simulation\/future-transitions\.ts$/,
    owner: "shared future-transition registry",
  },
  { pattern: /^src\/player\//, owner: "player presentation" },
  { pattern: /^src\/presentation\//, owner: "presentation projection" },
  { pattern: /^src\/ui\//, owner: "developer UI" },
  { pattern: /^package\.json$/, owner: "shared scripts" },
  { pattern: /^package-lock\.json$/, owner: "shared dependencies" },
];

describe("92G judicial gameplay ownership boundary", () => {
  it("has the exact accepted-main base it measures from", () => {
    expect(hasCommit(REPOSITORY_ROOT, JUDICIAL_GAMEPLAY_BASE)).toBe(true);
    expect(hasCommit(REPOSITORY_ROOT, JUDICIAL_GAMEPLAY_HEAD)).toBe(true);
  });

  it("does not edit the 92L source domain or shared engine surfaces", () => {
    const changed = changedFilesSince(
      REPOSITORY_ROOT,
      JUDICIAL_GAMEPLAY_BASE,
      JUDICIAL_GAMEPLAY_HEAD,
    );
    expect(changed).not.toBeNull();
    const violations = (changed ?? []).flatMap((file) => {
      const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
      return owner ? [`${file} — owned by ${owner.owner}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
