import path from "path";
import { describe, expect, it } from "vitest";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/** Updated to the reconciled accepted-main base immediately before publish. */
export const JUDICIAL_GAMEPLAY_BASE =
  "414b24ce6120799985d3b0bddbf196c9c064df36";

/**
 * Where this wave stopped: its merge into `main` as PR #115.
 *
 * The check below measured the working tree, which was the only head it had
 * while the wave was in flight. That was right then and wrong the moment the
 * wave landed: on `main` it outlives the packet it guards and starts asserting
 * that every LATER branch stays inside 92G's surfaces, which no later branch
 * agreed to. `main` already records the opposite for one of them —
 * `tests/executive-governing-ownership-boundary.test.ts` names PR #101 as the
 * owner of "the executive-authority rule substrate and its index delta", so
 * this check was attributing another lane's declared file to this wave.
 *
 * Pinning the head freezes the check to the range 92G actually shipped, so it
 * stays an executable claim about that wave instead of a standing constraint
 * on work it knows nothing about. FORBIDDEN is untouched and the frozen range
 * contains no path on it, so the boundary this wave promised is asserted
 * exactly as strongly as before. This is the same repair `main` already
 * applied to PR #112 in the executive-governing boundary and to Packet 26 in
 * `tests/support/ownership-boundary.ts`; a later packet that wants a boundary
 * of its own declares its own range.
 */
export const JUDICIAL_GAMEPLAY_HEAD =
  "333eeb12b3df4322aaebe6dfa987a653bf143223";

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
  it("has the exact accepted-main range it measures", () => {
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
