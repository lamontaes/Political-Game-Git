import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { largeDocsImages, maxDocsImageBytes } from "./no-doc-proof-images.mjs";

test("guards new, renamed and changed large docs images, not untouched or small files", () => {
  const cwd = mkdtempSync(join(tmpdir(), "proof-image-guard-"));
  try {
    const git = (...a) =>
      execFileSync("git", a, { cwd, encoding: "utf8" }).trim();
    const write = (p, bytes) =>
      writeFileSync(join(cwd, p), Buffer.alloc(bytes));
    const large = maxDocsImageBytes + 1;
    mkdirSync(join(cwd, "docs"));
    mkdirSync(join(cwd, "art"));
    git("init", "-q");
    git("config", "user.email", "fixture@example.com");
    git("config", "user.name", "Fixture");
    write("docs/old.png", large);
    write("docs/changed.png", 2);
    write("art/moved.JPG", large);
    git("add", ".");
    git("commit", "-qm", "baseline");
    const base = git("rev-parse", "HEAD");
    renameSync(join(cwd, "art/moved.JPG"), join(cwd, "docs/moved.JPG"));
    write("docs/changed.png", large);
    write("docs/new.png", large);
    write("docs/small.png", maxDocsImageBytes);
    write("docs/text.md", large);
    git("add", ".");
    git("commit", "-qm", "attempted proof");
    assert.deepEqual(largeDocsImages(base, "HEAD", cwd), [
      { path: "docs/changed.png", bytes: large },
      { path: "docs/moved.JPG", bytes: large },
      { path: "docs/new.png", bytes: large },
    ]);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
