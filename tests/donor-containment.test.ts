import { execFileSync } from "child_process";
import path from "path";

import { describe, expect, it } from "vitest";

/**
 * DONOR CONTAINMENT — the retirement proof, as a test rather than as a claim.
 *
 * Packet 56 authorises closing the superseded graphics branches only once their
 * cargo is "mechanically contained in the surviving branch". A completion report
 * asserting that is worth nothing on its own: the whole failure this convergence
 * exists to undo began with two branches each believing it had absorbed the
 * other. So the assertion lives here, where it runs.
 *
 * What is checked, for each donor, is every path the donor's diff against its own
 * base touches and that still exists on the donor. One of three things has to be
 * true of it:
 *
 * 1. the survivor has that path;
 * 2. the survivor has those exact bytes at a different path — the twenty-five
 *    PR #48 masters, which this branch re-homed under its own naming before the
 *    donor did, and which are byte-identical by SHA-1 to the donor's copies; or
 * 3. it is a deletion, which is not cargo.
 *
 * Anything else is unre-homed cargo, and the test names it.
 *
 * This is deliberately a containment check and not an equivalence check. Files
 * the survivor legitimately extended — manifests, the decision log, code merged
 * from both sides — differ from the donor's copies and should. What may not
 * happen is a path disappearing entirely, which is how cargo is actually lost.
 */

const REPO_ROOT = path.resolve(__dirname, "..");

interface Donor {
  readonly pr: string;
  readonly head: string;
  readonly base: string;
}

/** Exact heads, as named by the routing authority. */
const DONORS: readonly Donor[] = [
  {
    pr: "#63",
    head: "1a6e5f089c92db623b979bd47c8ded6a9b75b6aa",
    base: "c90e35161ba827677bdf5920c4d6ae76890c25d5",
  },
  {
    pr: "#74",
    head: "b8b4dcecc7f825bcf12d064a152a29398d7e43da",
    base: "c90e35161ba827677bdf5920c4d6ae76890c25d5",
  },
  {
    pr: "#48",
    head: "6dbb236cf3b176982a9873b4ae4ba60803d20e63",
    base: "514a6f979247f7162aeca26b26f1392535e32443",
  },
  {
    pr: "#80",
    head: "76b6e076c7419cbc7ed527931aa680b958efd19d",
    base: "c90e35161ba827677bdf5920c4d6ae76890c25d5",
  },
];

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function haveCommit(ref: string): boolean {
  try {
    git(["cat-file", "-e", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** path -> blob sha, for every file in a tree. */
function tree(ref: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of git(["ls-tree", "-r", ref]).split("\n")) {
    if (!line) continue;
    const [meta, filePath] = line.split("\t");
    const sha = meta.split(/\s+/)[2];
    if (sha && filePath) entries.set(filePath, sha);
  }
  return entries;
}

/**
 * The survivor's own tracked files, read from the index rather than from HEAD.
 *
 * In CI the two are the same. Locally they are not: reading HEAD would mean the
 * commit that re-homes a file still fails this test, which trains whoever hits
 * it to assume the failure is noise. The index is what this branch is about to
 * contain, which is the honest subject.
 */
function survivorTree(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of git(["ls-files", "-s"]).split("\n")) {
    if (!line) continue;
    const [meta, filePath] = line.split("\t");
    const sha = meta.split(/\s+/)[1];
    if (sha && filePath) entries.set(filePath, sha);
  }
  return entries;
}

function changedPaths(base: string, head: string): string[] {
  return git(["diff", "--name-only", base, head]).split("\n").filter(Boolean);
}

describe("donor cargo containment", () => {
  const available = DONORS.filter(
    (donor) => haveCommit(donor.head) && haveCommit(donor.base),
  );

  // A shallow clone will not have the donor commits. Skipping is correct there
  // — the check needs the history — but silently skipping ALL of them would
  // turn a green run into no evidence at all, so that case fails loudly.
  it("can see the donor branches it is meant to check", () => {
    expect(
      available.map((donor) => donor.pr),
      "no donor history is fetched, so containment was not actually checked",
    ).not.toEqual([]);
  });

  const survivor = survivorTree();
  const survivorBlobs = new Set(survivor.values());

  for (const donor of available) {
    it(`contains every path PR ${donor.pr} still carries`, () => {
      const donorTree = tree(donor.head);
      const unre_homed: string[] = [];
      let byPath = 0;
      let byBytesElsewhere = 0;

      for (const filePath of changedPaths(donor.base, donor.head)) {
        const donorSha = donorTree.get(filePath);
        if (donorSha === undefined) continue; // the donor deleted it; not cargo
        if (survivor.has(filePath)) {
          byPath += 1;
          continue;
        }
        if (survivorBlobs.has(donorSha)) {
          byBytesElsewhere += 1; // re-homed under this branch's own naming
          continue;
        }
        unre_homed.push(filePath);
      }

      expect(byPath).toBeGreaterThan(0);
      expect(
        unre_homed,
        `PR ${donor.pr} carries cargo this branch does not: ${unre_homed.join(", ")}`,
      ).toEqual([]);
      // PR #48 and #80 both carry the twenty-five masters under the upstream
      // filenames; this branch re-homed them under its own before either did.
      if (donor.pr === "#48" || donor.pr === "#80") {
        expect(byBytesElsewhere).toBe(25);
      }
    });
  }
});
