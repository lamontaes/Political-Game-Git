import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { onTestFinished, test } from "vitest";

import { publishSourceRef } from "./source-ref.mjs";

// Each case drives a real bare remote through dozens of git processes.
const GIT_FIXTURE = { timeout: 60_000 };

const run = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-source-ref-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const remote = path.join(root, "remote.git");
  const repo = path.join(root, "repo");
  mkdirSync(repo);
  run(root, ["init", "--bare", remote]);
  run(repo, ["init"]);
  run(repo, ["config", "user.name", "Fixture"]);
  run(repo, ["config", "user.email", "fixture@example.com"]);
  // Production accepts only the project GitHub origin.  Tests preserve local
  // transport while presenting the same canonical identity to the unit.
  run(repo, ["remote", "add", "origin", remote]);
  const git = (repositoryPath, args, options = {}) => {
    if (args.join(" ") === "remote get-url origin")
      return {
        status: 0,
        stdout: "https://github.com/lamontaes/Political-Game-Git.git",
      };
    try {
      return {
        status: 0,
        stdout: execFileSync("git", args, {
          cwd: repositoryPath,
          encoding: "utf8",
          stdio: ["ignore", "pipe", options.quietErrors ? "ignore" : "pipe"],
        }).trim(),
      };
    } catch (error) {
      return {
        status: Number.isInteger(error?.status) ? error.status : 1,
        stdout: String(error?.stdout ?? "").trim(),
      };
    }
  };
  let serial = 0;
  const commit = (label) => {
    writeFileSync(path.join(repo, "value.txt"), `${label}-${serial++}\n`);
    run(repo, ["add", "value.txt"]);
    run(repo, ["commit", "-m", label]);
    return run(repo, ["rev-parse", "HEAD"]);
  };
  return { repo, remote, git, commit };
}

test(
  "creates and then fast-forwards the exact cloud source branch",
  GIT_FIXTURE,
  () => {
    const f = fixture();
    const first = f.commit("first");
    assert.equal(
      publishSourceRef({
        repositoryPath: f.repo,
        track: "branch:codex/preview",
        revision: first,
        git: f.git,
      }).outcome,
      "created",
    );
    assert.equal(
      run(f.repo, ["ls-remote", f.remote, "refs/heads/codex/preview"]).split(
        /\s+/,
      )[0],
      first,
    );
    assert.equal(
      publishSourceRef({
        repositoryPath: f.repo,
        track: "branch:codex/preview",
        revision: first,
        git: f.git,
      }).outcome,
      "already-published",
    );
    const second = f.commit("second");
    assert.equal(
      publishSourceRef({
        repositoryPath: f.repo,
        track: "branch:codex/preview",
        revision: second,
        git: f.git,
      }).outcome,
      "fast-forwarded",
    );
  },
);

test(
  "never rewinds or combines a newer or divergent cloud branch",
  GIT_FIXTURE,
  () => {
    const f = fixture();
    const base = f.commit("base");
    publishSourceRef({
      repositoryPath: f.repo,
      track: "branch:codex/preview",
      revision: base,
      git: f.git,
    });
    const local = f.commit("local");
    run(f.repo, ["checkout", "--detach", base]);
    const cloud = f.commit("cloud");
    run(f.repo, [
      "push",
      "--force",
      f.remote,
      `${cloud}:refs/heads/codex/preview`,
    ]);
    assert.throws(
      () =>
        publishSourceRef({
          repositoryPath: f.repo,
          track: "branch:codex/preview",
          revision: local,
          git: f.git,
        }),
      /diverged/,
    );
    assert.throws(
      () =>
        publishSourceRef({
          repositoryPath: f.repo,
          track: "branch:codex/preview",
          revision: base,
          git: f.git,
        }),
      /newer than this local preview/,
    );
  },
);
