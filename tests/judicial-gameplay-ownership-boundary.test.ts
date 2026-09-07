import path from "path";
import { describe, expect, it } from "vitest";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/** Updated to the reconciled accepted-main base immediately before publish. */
export const JUDICIAL_GAMEPLAY_BASE =
  "a93b8f9da2b76d69123abc6b37b4b196f9d0d5db";

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
  });

  it("does not edit the 92L source domain or shared engine surfaces", () => {
    const changed = changedFilesSince(REPOSITORY_ROOT, JUDICIAL_GAMEPLAY_BASE);
    expect(changed).not.toBeNull();
    const violations = (changed ?? []).flatMap((file) => {
      const owner = FORBIDDEN.find((entry) => entry.pattern.test(file));
      return owner ? [`${file} — owned by ${owner.owner}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
