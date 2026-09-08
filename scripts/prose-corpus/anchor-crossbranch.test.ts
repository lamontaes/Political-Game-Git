import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Two ordinary stale branches, composed by real Git, in a real repository.
 *
 * 128A3 rejected the previous round on a case no hand-written JSON could have
 * found, and which the previous round had described as a stated limitation
 * rather than a defect. Reproduced at the production CLI: from one trusted base,
 * branch A issues `RETURN_SUMMARY-0023` to site A and then RETIRES it; branch B
 * independently issues the same number to a different site B. Every one of the
 * three authority files then merged with NO conflict — the id-only ledgers
 * produced byte-identical additions, and the checkpoints were identical because
 * a count, a digest over ids, and a per-symbol maximum cannot tell two bindings
 * apart. The composed tree passed the production integrity gate as a clean
 * no-op, with `-0023` live at site B and the fact of its issuance to site A
 * gone.
 *
 * So this file is deliberately not a unit test. It clones the repository, runs
 * the real command against the CANONICAL default paths inside that clone — no
 * path override at all — and drives actual three-way composition. A
 * hand-constructed impossible JSON shape cannot stand in for it: the whole
 * failure was about what Git does to two plausible files.
 *
 * Nothing here touches the repository's own working tree. The clone gets its own
 * `src/`, its own authority trio and a symlinked `node_modules`, so a mint
 * inside it scans the clone's source and writes the clone's files.
 */

const REPO = process.cwd();
const TRIO = [
  "scripts/prose-corpus/computed-anchors.json",
  "scripts/prose-corpus/computed-anchor-ledger.json",
  "scripts/prose-corpus/computed-anchor-baseline.json",
] as const;
const LEDGER = TRIO[1];
const BASELINE = TRIO[2];
const ANCHORS = TRIO[0];
const SRC = "src/simulation/life-callbacks.ts";

/** Where a new RETURN_SUMMARY literal is inserted, and the two probe sites. */
const ANCHOR_POINT =
  "const RETURN_SUMMARY: Readonly<Record<string, string>> = {\n";
const SITE_A =
  '  "adult.cross-branch-site-a":\n    "A probe sentence issued on one branch and retired again there.",\n';
const SITE_B =
  '  "adult.cross-branch-site-b":\n    "A different probe sentence, issued independently on another branch.",\n';

const SLOW = { timeout: 300_000 };

let clone = "";
let baseRepoTrio: string[] = [];

function git(args: readonly string[], cwd = clone) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** The production CLI, on the clone's own canonical paths. */
function cli(mode: string) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/prose-corpus/cli.ts", mode],
    { cwd: clone, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function read(relative: string): string {
  return readFileSync(join(clone, relative), "utf8");
}

function issuances(): { id: string; site?: string; text?: string }[] {
  return (
    JSON.parse(read(LEDGER)) as {
      issued: { id: string; site?: string; text?: string }[];
    }
  ).issued;
}

function liveAnchors(): { anchor: string; text: string }[] {
  return (
    JSON.parse(read(ANCHORS)) as { anchors: { anchor: string; text: string }[] }
  ).anchors;
}

function addSite(literal: string): void {
  const path = join(clone, SRC);
  const body = readFileSync(path, "utf8");
  expect(body).toContain(ANCHOR_POINT);
  writeFileSync(path, body.replace(ANCHOR_POINT, ANCHOR_POINT + literal));
}

/**
 * Delete the literal again, which is what retiring a site actually is.
 *
 * Not `git checkout -- src`: the branch has already COMMITTED the source that
 * carries the site, so restoring it from the index would put the literal back
 * and the mint would find nothing to retire.
 */
function removeSite(literal: string): void {
  const path = join(clone, SRC);
  const body = readFileSync(path, "utf8");
  expect(body).toContain(literal);
  writeFileSync(path, body.replace(literal, ""));
}

/** Mint on the current branch and commit whatever it changed. */
function mintAndCommit(message: string) {
  const result = cli("anchors");
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  git(["commit", "--quiet", "-am", message]);
  return result;
}

beforeAll(() => {
  const parent = mkdtempSync(join(tmpdir(), "anchor-crossbranch-"));
  clone = join(parent, "repo");
  expect(
    spawnSync(
      "git",
      ["clone", "--no-hardlinks", "--shared", "--quiet", REPO, clone],
      { encoding: "utf8" },
    ).status,
  ).toBe(0);
  symlinkSync(join(REPO, "node_modules"), join(clone, "node_modules"));
  git(["config", "user.email", "regression@example.invalid"]);
  git(["config", "user.name", "cross-branch regression"]);

  // The clone is at the committed head, so the base commit is brought up to
  // this working tree: every uncommitted change, code and authority files
  // alike. Otherwise the case would run the committed build against the current
  // files, which is neither state.
  const dirty = spawnSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: REPO,
    encoding: "utf8",
  }).stdout;
  for (const entry of dirty.split("\0")) {
    if (entry.trim() === "") continue;
    const relative = entry.slice(3);
    const source = join(REPO, relative);
    // Regular files only. Git collapses an untracked directory into one entry,
    // and a symlinked one (a linked `node_modules`, say) is not content to copy.
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    mkdirSync(dirname(join(clone, relative)), { recursive: true });
    writeFileSync(join(clone, relative), readFileSync(source));
  }
  baseRepoTrio = TRIO.map((relative) =>
    readFileSync(join(REPO, relative), "utf8"),
  );
  git(["add", "-A"]);
  git(["commit", "--quiet", "-m", "base: working tree under test"]);
  git(["branch", "-f", "base", "HEAD"]);

  // The clone must be able to run the command at all before anything is proved
  // with it.
  const sanity = cli("check");
  expect(sanity.status).toBe(0);
}, 300_000);

afterAll(() => {
  if (clone !== "") rmSync(join(clone, ".."), { recursive: true, force: true });
});

describe("two branches that issue one id to two different sites", () => {
  let issuedId = "";

  it("cannot be composed automatically into a valid tree", SLOW, () => {
    /* ---- Branch A: issue the next id to site A, then retire it --------- */
    expect(git(["checkout", "--quiet", "-b", "branchA", "base"]).status).toBe(
      0,
    );
    addSite(SITE_A);
    const mintA = mintAndCommit("A: issue to site A");
    issuedId = /minted (RETURN_SUMMARY-\d+)/.exec(mintA.stdout)?.[1] ?? "";
    expect(issuedId).toMatch(/^RETURN_SUMMARY-\d{4}$/);
    const siteAText = liveAnchors().find(
      (anchor) => anchor.anchor === issuedId,
    )?.text;
    expect(siteAText).toContain("retired again there");

    removeSite(SITE_A);
    mintAndCommit(`A: retire ${issuedId}`);
    // Retirement removes the LIVE binding and keeps the issuance. That is the
    // contract this whole representation exists for.
    expect(liveAnchors().some((anchor) => anchor.anchor === issuedId)).toBe(
      false,
    );
    const recordA = issuances().find((entry) => entry.id === issuedId);
    expect(recordA).toBeDefined();
    expect(recordA?.site).toMatch(/^[0-9a-f]{12}$/);
    expect(recordA?.text).toMatch(/^[0-9a-f]{12}$/);

    /* ---- Branch B: independently issue the SAME id to site B ---------- */
    expect(git(["checkout", "--quiet", "-b", "branchB", "base"]).status).toBe(
      0,
    );
    addSite(SITE_B);
    const mintB = mintAndCommit("B: issue to site B");
    const idB = /minted (RETURN_SUMMARY-\d+)/.exec(mintB.stdout)?.[1];
    // Both branches allocate above their own floor, so they pick the same
    // number. That is not the defect; losing one of the two claims is.
    expect(idB).toBe(issuedId);
    const recordB = issuances().find((entry) => entry.id === issuedId);
    expect(recordB?.text).not.toBe(recordA?.text);
    // Branch B keeps its site live. That is the state that composes.

    /* ---- Actual three-way composition --------------------------------- */
    expect(git(["checkout", "--quiet", "branchA"]).status).toBe(0);
    const merge = git(["merge", "--no-edit", "branchB"]);
    expect(merge.status).not.toBe(0);
    const conflicted = git(["diff", "--name-only", "--diff-filter=U"])
      .stdout.trim()
      .split("\n")
      .filter((line) => line !== "");
    // The ledger is where the two claims collide, and it conflicts. The
    // checkpoint conflicts too, because its digest covers the bindings and not
    // only the ids. Under the id-only schema NEITHER conflicted and the
    // composed tree passed every gate.
    expect(conflicted).toContain(LEDGER);
    expect(conflicted).toContain(BASELINE);
    expect(read(LEDGER)).toContain("<<<<<<<");
  });

  it(
    "is refused, naming both sites, when a hand resolution keeps both claims",
    SLOW,
    () => {
      // The other branch of the contract: where composition does not conflict,
      // both claims must survive so that validation can reject the collision.
      // Resolved this way the file is syntactically valid and semantically
      // impossible, and the loader says so instead of picking a winner.
      const conflicted = read(LEDGER);
      const resolved = conflicted
        .split("\n")
        .filter(
          (line) =>
            !line.startsWith("<<<<<<<") &&
            !line.startsWith("=======") &&
            !line.startsWith(">>>>>>>"),
        )
        .join("\n");
      writeFileSync(join(clone, LEDGER), resolved);
      const records = issuances().filter((entry) => entry.id === issuedId);
      expect(records).toHaveLength(2);
      expect(records[0]?.text).not.toBe(records[1]?.text);

      for (const mode of ["check", "anchors", "ledger", "recover"]) {
        const result = cli(mode);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toMatch(/two different sites/);
      }
    },
  );

  it(
    "is refused when a hand resolution keeps one side's history and the other's checkpoint",
    SLOW,
    () => {
      // Taking branch A's ledger against branch B's checkpoint is the resolution
      // that looks tidiest and is wrong: the two files no longer describe one
      // history. The checkpoint digest covers the recorded bindings, so the
      // disagreement is visible rather than cosmetic.
      git(["merge", "--abort"]);
      expect(git(["checkout", "--quiet", "-f", "branchA"]).status).toBe(0);
      const ledgerA = git(["show", `branchA:${LEDGER}`]).stdout;
      const baselineB = git(["show", `branchB:${BASELINE}`]).stdout;
      writeFileSync(join(clone, LEDGER), ledgerA);
      writeFileSync(join(clone, BASELINE), baselineB);

      const result = cli("anchors");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/history-mismatch/);
      // And nothing was written on the way to refusing.
      expect(read(LEDGER)).toBe(ledgerA);
      expect(read(BASELINE)).toBe(baselineB);
    },
  );

  it("left the repository's own authority files untouched", () => {
    // Every case above ran inside the clone, on the clone's canonical paths.
    TRIO.forEach((relative, index) => {
      expect(readFileSync(join(REPO, relative), "utf8")).toBe(
        baseRepoTrio[index],
      );
    });
    expect(existsSync(join(REPO, LEDGER))).toBe(true);
  });
});
