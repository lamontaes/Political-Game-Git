/**
 * Publish the exact source revision that produced a locally received preview.
 *
 * The received channel can move only after this succeeds.  That ordering keeps
 * a local preview from acquiring another Mac-only identity: every code payload
 * the owner can select is first reachable by the cloud at the branch named by
 * its track.  Updates are fast-forward only; divergence is preserved for a
 * human receiver instead of being merged, rebased or force-pushed here.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  repositoryIsExpected,
  validateRevision,
} from "../../desktop/private-controller/private-update.mjs";
import { validBranchName } from "../../desktop/private-controller/hub-model.mjs";

function branchForTrack(track) {
  if (typeof track !== "string" || !track.startsWith("branch:"))
    throw new Error("Received source publication requires a branch track.");
  const branch = track.slice("branch:".length);
  if (!validBranchName(branch)) throw new Error("Invalid received branch.");
  return branch;
}

function defaultGit(repositoryPath, args, options = {}) {
  try {
    return {
      status: 0,
      stdout: execFileSync("git", args, {
        cwd: repositoryPath,
        encoding: "utf8",
        stdio: ["ignore", "pipe", options.quietErrors ? "ignore" : "inherit"],
      }).trim(),
    };
  } catch (error) {
    return {
      status: Number.isInteger(error?.status) ? error.status : 1,
      stdout: String(error?.stdout ?? "").trim(),
    };
  }
}

function oneRemoteRevision(output, ref) {
  const rows = String(output ?? "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (rows.length === 0) return null;
  if (rows.length !== 1)
    throw new Error(`Remote returned multiple ${ref} rows.`);
  const [revision, actualRef] = rows[0].split(/\s+/);
  if (!validateRevision(revision) || actualRef !== ref)
    throw new Error("Remote branch identity is malformed.");
  return revision;
}

/**
 * Make one clean local preview revision reachable under its matching cloud
 * branch.  The injected runner exists for deterministic tests; production uses
 * argument-array Git exclusively.
 */
export function publishSourceRef({
  repositoryPath,
  track,
  revision,
  git = defaultGit,
}) {
  if (typeof repositoryPath !== "string" || !path.isAbsolute(repositoryPath))
    throw new Error("Source publication requires an absolute repository path.");
  if (!validateRevision(revision))
    throw new Error("Source publication requires a full Git revision.");
  const branch = branchForTrack(track);
  const remoteRef = `refs/heads/${branch}`;
  const trackingRef = `refs/remotes/origin/${branch}`;
  const run = (args, options) => git(repositoryPath, args, options);
  const require = (args, label, options = {}) => {
    const result = run(args, options);
    if (result.status !== 0) throw new Error(`${label} failed.`);
    return result.stdout;
  };

  const origin = require(["remote", "get-url", "origin"], "Origin lookup");
  if (!repositoryIsExpected(origin))
    throw new Error("Source publication refused an unexpected repository.");
  const resolved = require([
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${revision}^{commit}`,
  ], "Local source verification");
  if (resolved !== revision)
    throw new Error("Local source revision did not resolve exactly.");

  const readRemote = () =>
    oneRemoteRevision(
      require([
        "ls-remote",
        "--heads",
        "origin",
        remoteRef,
      ], "Remote source lookup"),
      remoteRef,
    );
  const remoteRevision = readRemote();
  if (remoteRevision === revision)
    return { outcome: "already-published", branch, revision };

  if (remoteRevision) {
    require([
      "fetch",
      "--quiet",
      "--no-tags",
      "origin",
      `+${remoteRef}:${trackingRef}`,
    ], "Remote source fetch");
    const ancestor = run(
      ["merge-base", "--is-ancestor", remoteRevision, revision],
      { quietErrors: true },
    );
    if (ancestor.status !== 0) {
      const stale = run(
        ["merge-base", "--is-ancestor", revision, remoteRevision],
        { quietErrors: true },
      );
      throw new Error(
        stale.status === 0
          ? "The cloud branch is newer than this local preview; the older preview was not published."
          : "The cloud and local preview branches diverged; neither side was overwritten.",
      );
    }
  }

  require(["push", "origin", `${revision}:${remoteRef}`], "Source publication");
  if (readRemote() !== revision)
    throw new Error(
      "Published source did not read back at the expected revision.",
    );
  return {
    outcome: remoteRevision ? "fast-forwarded" : "created",
    branch,
    revision,
  };
}
