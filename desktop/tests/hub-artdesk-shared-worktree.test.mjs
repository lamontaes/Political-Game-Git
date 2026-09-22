/* global process */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  ArtDeskHost,
  artDeskSourcePlan,
} from "../private-controller/artdesk-host.mjs";

/*
 * The two moving tests below drive ArtDeskHost.adoptSharedRuntime, which runs
 * `/usr/bin/git` by absolute path, alongside `/usr/bin/defaults` and
 * `/usr/bin/env` elsewhere in the same host. That is a macOS private
 * controller, and it is only ever packaged on macOS. On win32 there is no
 * /usr/bin, so the fixture died on `spawnSync /usr/bin/git ENOENT` and took
 * the whole Windows packaging job down with it — a proof failing because the
 * thing it proves does not exist there, which is not the same as a defect.
 *
 * The two pure tests run everywhere; the two that need the host's own git are
 * asserted where the host runs, and say out loud why they are not asserted
 * elsewhere. If the controller is ever ported to Windows, this guard is what
 * has to come out.
 */
const HOST_GIT = "/usr/bin/git";
const HOST_PLATFORM = existsSync(HOST_GIT);
const OTHER_PLATFORM_REASON = `the Art Desk private controller invokes ${HOST_GIT} by absolute path and is packaged for macOS only; this platform has no ${HOST_GIT}, so the shared-worktree move cannot be exercised here`;

function git(cwd, ...args) {
  return execFileSync(HOST_GIT, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  }).trim();
}

function fixture() {
  const base = mkdtempSync(path.join(tmpdir(), "ocd-artdesk-shared-"));
  const repositoryPath = path.join(base, "repository");
  const dataRoot = path.join(base, "data");
  mkdirSync(repositoryPath, { recursive: true });
  git(repositoryPath, "init", "-b", "main");
  git(repositoryPath, "config", "user.name", "Art Desk Test");
  git(repositoryPath, "config", "user.email", "art-desk@example.invalid");
  git(repositoryPath, "config", "commit.gpgsign", "false");
  writeFileSync(
    path.join(repositoryPath, "package-lock.json"),
    '{"lockfileVersion":3}\n',
  );
  git(repositoryPath, "add", "package-lock.json");
  git(repositoryPath, "commit", "-m", "fixture");
  const revision = git(repositoryPath, "rev-parse", "HEAD");
  const legacy = path.join(dataRoot, "artdesk", "codex-old", "source");
  mkdirSync(path.dirname(legacy), { recursive: true });
  git(repositoryPath, "worktree", "add", "--detach", legacy, revision);
  writeFileSync(path.join(path.dirname(legacy), ".ocd-hub-artdesk"), "old\n");
  writeFileSync(path.join(path.dirname(legacy), ".ocd-hub-lock-sha"), "lock\n");
  writeFileSync(
    path.join(dataRoot, "artdesk", "ready-runtime.json"),
    `${JSON.stringify({
      branch: "codex/old",
      revision,
      worktree: legacy,
      lockHash: "lock",
    })}\n`,
  );
  return { base, dataRoot, legacy, repositoryPath, revision };
}

test("Art Desk uses one branch-neutral shared worktree", () => {
  const dataRoot = path.join(tmpdir(), "ocd-shared-path-proof");
  const host = new ArtDeskHost({ dataRoot, env: {} });
  assert.equal(
    host.worktreeFor("any/branch"),
    path.join(dataRoot, "artdesk", "shared", "source"),
  );
  assert.equal(
    host.worktreeFor("another/branch"),
    host.worktreeFor("any/branch"),
  );
});

test("published Art Desk branches are re-fetched on every start", () => {
  assert.deepEqual(
    artDeskSourcePlan("published", "codex/client-content-delivery"),
    {
      fetch: true,
      ref: "refs/remotes/origin/codex/client-content-delivery^{commit}",
    },
  );
  assert.deepEqual(artDeskSourcePlan("local", "codex/local-art"), {
    fetch: false,
    ref: "refs/heads/codex/local-art^{commit}",
  });
});

test("a clean legacy Art Desk worktree is moved into the shared slot", async (t) => {
  if (!HOST_PLATFORM) {
    t.diagnostic(OTHER_PLATFORM_REASON);
    return;
  }
  const f = fixture();
  try {
    const host = new ArtDeskHost({ dataRoot: f.dataRoot, env: process.env });
    const shared = host.worktreeFor();
    assert.deepEqual(await host.adoptSharedRuntime(f.repositoryPath), {
      from: f.legacy,
      to: shared,
    });
    assert.equal(existsSync(f.legacy), false);
    assert.equal(git(shared, "rev-parse", "HEAD"), f.revision);
    assert.equal(
      existsSync(path.join(path.dirname(shared), ".ocd-hub-lock-sha")),
      true,
    );
    assert.match(
      git(f.repositoryPath, "worktree", "list", "--porcelain"),
      new RegExp(shared),
    );
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test("tracked legacy edits stop the shared-workspace move", async (t) => {
  if (!HOST_PLATFORM) {
    t.diagnostic(OTHER_PLATFORM_REASON);
    return;
  }
  const f = fixture();
  try {
    writeFileSync(
      path.join(f.legacy, "package-lock.json"),
      '{"lockfileVersion":3,"preserveMe":true}\n',
    );
    const host = new ArtDeskHost({ dataRoot: f.dataRoot, env: process.env });
    await assert.rejects(
      host.adoptSharedRuntime(f.repositoryPath),
      /has tracked edits, so it was preserved/,
    );
    assert.equal(existsSync(f.legacy), true);
    assert.equal(existsSync(host.worktreeFor()), false);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});
