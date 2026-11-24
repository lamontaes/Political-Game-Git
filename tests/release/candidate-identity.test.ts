import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBuildIdentity } from "../../scripts/release/build-identity";
import { main } from "../../scripts/release/cli";
import { declarationText, makeFixture } from "./fixtures";

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

describe("exact candidate commit identity", { timeout: 30_000 }, () => {
  it("build identity and the publication bundle name the same clean commit", () => {
    const fixture = makeFixture({
      asRepository: true,
      declarations: {
        "a-fix": declarationText({
          id: "a-fix",
          impact: "patch",
          section: "Fixed",
          title: "A fix.",
          body: "The broken thing works again.",
        }),
      },
    });
    const artifactRoot = mkdtempSync(
      join(tmpdir(), "release-candidate-artifact-"),
    );
    try {
      const source = git(fixture.root, "rev-parse", "HEAD");
      expect(main(["apply"], fixture.root)).toBe(0);
      git(fixture.root, "add", "-A");
      git(
        fixture.root,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-q",
        "-m",
        "Release 0.2.1 [release-automation]",
      );
      const candidate = git(fixture.root, "rev-parse", "HEAD");
      const tree = git(fixture.root, "rev-parse", "HEAD^{tree}");
      expect(git(fixture.root, "rev-parse", "HEAD^")).toBe(source);
      expect(git(fixture.root, "status", "--porcelain")).toBe("");
      expect(resolveBuildIdentity(fixture.root)).toMatchObject({
        revision: candidate,
        dirty: false,
        version: "0.2.1",
      });

      const bundle = join(artifactRoot, "release-candidate.bundle");
      git(fixture.root, "bundle", "create", bundle, "HEAD", `^${source}`);
      expect(git(fixture.root, "bundle", "list-heads", bundle)).toBe(
        `${candidate} HEAD`,
      );
      expect(readFileSync(bundle).byteLength).toBeGreaterThan(0);
      expect(git(fixture.root, "rev-parse", `${candidate}^{tree}`)).toBe(tree);
    } finally {
      fixture.dispose();
      rmSync(artifactRoot, { recursive: true, force: true });
    }
  });
});
