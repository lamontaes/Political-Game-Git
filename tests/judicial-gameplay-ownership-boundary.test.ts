import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";

import * as boundary from "./support/ownership-boundary";

import { changedFilesSince, hasCommit } from "./support/ownership-boundary";

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/** Accepted base of the landed PR #115; later work must not move this range. */
export const JUDICIAL_GAMEPLAY_BASE =
  "414b24ce6120799985d3b0bddbf196c9c064df36";

/** PR #115's final feature head, following the accepted M1 frozen-range pattern. */
export const JUDICIAL_GAMEPLAY_HEAD =
  "35ba89f6f60b50e5fd7fe00d44d03e928de5218b";

const MISSING_RANGE = `PR #115 shipped as ${JUDICIAL_GAMEPLAY_BASE}..${JUDICIAL_GAMEPLAY_HEAD}, and its history could not be measured. Fetch full history before trusting this suite.`;

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

function measuredChanges(
  repositoryRoot = REPOSITORY_ROOT,
  base = JUDICIAL_GAMEPLAY_BASE,
  head = JUDICIAL_GAMEPLAY_HEAD,
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

describe("92G judicial gameplay ownership boundary", () => {
  it("can see the exact frozen PR115 range it measures", () => {
    expect(() => measuredChanges()).not.toThrow();
  });

  it("has zero ownership violations in the actual frozen PR115 range", () => {
    expect(ownershipViolations(measuredChanges())).toEqual([]);
  });

  it("excludes a later forbidden change but rejects it inside a frozen range", () => {
    const repository = fs.mkdtempSync(
      path.join(os.tmpdir(), "judicial-boundary-"),
    );
    const git = (...args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          "user.name=Boundary Harness",
          "-c",
          "user.email=harness@example.invalid",
          "-c",
          "commit.gpgsign=false",
          ...args,
        ],
        {
          cwd: repository,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          env: {
            ...process.env,
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_SYSTEM: "/dev/null",
          },
        },
      ).trim();
    const commit = (file: string, contents: string) => {
      fs.writeFileSync(path.join(repository, file), contents);
      git("add", "--", file);
      git("commit", "-m", file);
      return git("rev-parse", "HEAD");
    };
    try {
      git("init", "-b", "main");
      const base = commit("README.md", "base");
      const head = commit("README.md", "judicial wave");
      const laterHead = commit("package.json", "{}");
      expect(measuredChanges(repository, base, head)).toEqual(["README.md"]);
      expect(
        ownershipViolations(measuredChanges(repository, base, head)),
      ).toEqual([]);
      expect(changedFilesSince(repository, head, laterHead)).toEqual([
        "package.json",
      ]);
      expect(
        ownershipViolations(measuredChanges(repository, base, laterHead)),
      ).toEqual(["package.json — owned by shared scripts"]);
    } finally {
      fs.rmSync(repository, { recursive: true, force: true });
    }
  });

  it("fails closed when either endpoint is missing", () => {
    const missingCommit = "0000000000000000000000000000000000000000";
    expect(() =>
      measuredChanges(REPOSITORY_ROOT, missingCommit, JUDICIAL_GAMEPLAY_HEAD),
    ).toThrow(MISSING_RANGE);
    expect(() =>
      measuredChanges(REPOSITORY_ROOT, JUDICIAL_GAMEPLAY_BASE, missingCommit),
    ).toThrow(MISSING_RANGE);
  });

  it("fails closed when repository history is unavailable", () => {
    expect(() => measuredChanges(import.meta.filename)).toThrow(MISSING_RANGE);
  });

  it("fails closed when the diff returns null despite visible endpoints", () => {
    const diff = vi.spyOn(boundary, "changedFilesSince").mockReturnValue(null);
    try {
      expect(() => measuredChanges()).toThrow(MISSING_RANGE);
      expect(diff).toHaveBeenCalledWith(
        REPOSITORY_ROOT,
        JUDICIAL_GAMEPLAY_BASE,
        JUDICIAL_GAMEPLAY_HEAD,
      );
    } finally {
      diff.mockRestore();
    }
  });
});
