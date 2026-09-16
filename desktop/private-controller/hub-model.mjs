/**
 * Pure track/branch/profile rules for the private hub. No Electron, no I/O.
 *
 * A track is what Play runs: "main" (Follow main) or one explicitly selected
 * owner-repository branch frozen to an exact SHA for that run. Main and each
 * branch keep separate save profiles so a preview can never silently upgrade
 * or overwrite the main life.
 */

import { createHash } from "node:crypto";
import path from "node:path";

export const HUB_STATE_SCHEMA = 2;
export const MAIN_TRACK = "main";
const SHA = /^[0-9a-f]{40}$/;

/**
 * Conservative subset of git-check-ref-format: printable ASCII path
 * segments, no traversal, no revision syntax, no leading dash. Git itself
 * validates again; this only keeps hostile labels out of argument arrays and
 * file names.
 */
export function validBranchName(value) {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > 200) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.startsWith("/") || value.endsWith("/"))
    return false;
  if (value.endsWith(".") || value.endsWith(".lock")) return false;
  if (value.includes("..") || value.includes("//") || value.includes("@{"))
    return false;
  if (value === "HEAD" || value.split("/").some((part) => part.startsWith(".")))
    return false;
  return true;
}

export function validRevision(value) {
  return typeof value === "string" && SHA.test(value);
}

export function trackId(branch) {
  if (branch === MAIN_TRACK) return MAIN_TRACK;
  if (!validBranchName(branch)) throw new Error("Invalid branch name.");
  return `branch:${branch}`;
}

/** File-system-safe, collision-resistant slug for a branch's private data. */
export function branchSlug(branch) {
  if (!validBranchName(branch)) throw new Error("Invalid branch name.");
  const readable = branch
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const digest = createHash("sha256").update(branch).digest("hex").slice(0, 10);
  return `${readable || "branch"}-${digest}`;
}

/**
 * Where a track's game storage lives. Main shares the existing internal
 * art-review game profile, so installed-app lives continue in the hub.
 * Branch previews get their own isolated profile under the hub data root.
 */
export function trackProfilePath({ track, appDataRoot, hubDataRoot }) {
  if (track === MAIN_TRACK)
    return path.join(appDataRoot, "Our Civic Duty Internal Art Review");
  if (!track.startsWith("branch:")) throw new Error("Unknown track.");
  return path.join(
    hubDataRoot,
    "profiles",
    `branch-${branchSlug(track.slice("branch:".length))}`,
  );
}

export function emptyHubState(repositoryPath = null) {
  return {
    schema: HUB_STATE_SCHEMA,
    repositoryPath,
    selectedTrack: MAIN_TRACK,
    privatePackPath: null,
    tracks: {},
  };
}

function cleanBuild(build) {
  if (!build || typeof build !== "object") return null;
  if (!validRevision(build.revision)) return null;
  if (typeof build.appPath !== "string" || !path.isAbsolute(build.appPath))
    return null;
  if (build.profile !== "internal-art-review") return null;
  const pack =
    build.privatePack && typeof build.privatePack === "object"
      ? {
          packId: String(build.privatePack.packId ?? "unknown"),
          manifestSha256: String(build.privatePack.manifestSha256 ?? "unknown"),
        }
      : null;
  return {
    revision: build.revision,
    appPath: path.resolve(build.appPath),
    version: typeof build.version === "string" ? build.version : "unknown",
    profile: "internal-art-review",
    architecture:
      typeof build.architecture === "string" ? build.architecture : "unknown",
    installedAt:
      typeof build.installedAt === "string" ? build.installedAt : "unknown",
    clientTreeSha256:
      typeof build.clientTreeSha256 === "string"
        ? build.clientTreeSha256
        : "unknown",
    privatePack: pack,
  };
}

function cleanTrack(value) {
  if (!value || typeof value !== "object") return null;
  const current = cleanBuild(value.current);
  if (!current) return null;
  return {
    branch: typeof value.branch === "string" ? value.branch : MAIN_TRACK,
    current,
    pending: cleanBuild(value.pending),
    previous: cleanBuild(value.previous),
  };
}

/**
 * Accepts the hub schema and migrates the schema-1 controller state (one
 * main build) without losing its current/pending/previous records.
 */
export function cleanHubState(value) {
  if (!value || typeof value !== "object") return null;
  if (value.schema === 1) {
    const current = cleanBuild(value.current);
    if (!current) return null;
    return {
      ...emptyHubState(
        typeof value.repositoryPath === "string" ? value.repositoryPath : null,
      ),
      tracks: {
        [MAIN_TRACK]: {
          branch: MAIN_TRACK,
          current,
          pending: cleanBuild(value.pending),
          previous: cleanBuild(value.previous),
        },
      },
    };
  }
  if (value.schema !== HUB_STATE_SCHEMA) return null;
  const tracks = {};
  for (const [id, track] of Object.entries(value.tracks ?? {})) {
    const cleaned = cleanTrack(track);
    if (!cleaned) continue;
    if (id !== MAIN_TRACK) {
      try {
        if (trackId(cleaned.branch) !== id) continue;
      } catch {
        continue;
      }
    }
    tracks[id] = cleaned;
  }
  const selected =
    typeof value.selectedTrack === "string" && tracks[value.selectedTrack]
      ? value.selectedTrack
      : MAIN_TRACK;
  return {
    schema: HUB_STATE_SCHEMA,
    repositoryPath:
      typeof value.repositoryPath === "string" ? value.repositoryPath : null,
    selectedTrack: selected,
    privatePackPath:
      typeof value.privatePackPath === "string" &&
      path.isAbsolute(value.privatePackPath)
        ? value.privatePackPath
        : null,
    tracks,
  };
}

export function withPending(state, id, branch, build) {
  const track = state.tracks[id];
  return {
    ...state,
    tracks: {
      ...state.tracks,
      [id]: track
        ? { ...track, pending: build }
        : { branch, current: build, pending: null, previous: null },
    },
  };
}

export function activatePending(state, id) {
  const track = state.tracks[id];
  if (!track?.pending) return state;
  return {
    ...state,
    tracks: {
      ...state.tracks,
      [id]: {
        ...track,
        current: track.pending,
        previous: track.current,
        pending: null,
      },
    },
  };
}

/** Roll a track back to its retained previous verified build. */
export function rollback(state, id) {
  const track = state.tracks[id];
  if (!track?.previous) return state;
  return {
    ...state,
    tracks: {
      ...state.tracks,
      [id]: {
        ...track,
        current: track.previous,
        previous: track.current,
        pending: null,
      },
    },
  };
}

/**
 * The label shown beside Play. A cached build is only "latest" when it equals
 * the freshly resolved remote SHA; otherwise it is the last known-good build.
 */
export function playLabel({ track, build, remoteRevision, fetchState }) {
  if (!build) return { kind: "none", text: "No verified build yet" };
  const base = track === MAIN_TRACK ? "Main" : "Branch preview";
  if (fetchState === "offline")
    return {
      kind: "last-good",
      text: `${base} · last known-good (offline) · ${build.revision.slice(0, 12)}`,
    };
  if (remoteRevision && remoteRevision === build.revision)
    return {
      kind: "latest",
      text: `${base} · latest · ${build.revision.slice(0, 12)}`,
    };
  if (remoteRevision)
    return {
      kind: "last-good",
      text: `${base} · last known-good · ${build.revision.slice(0, 12)} (newer ${remoteRevision.slice(0, 12)} not ready)`,
    };
  return {
    kind: "unverified-remote",
    text: `${base} · cached ${build.revision.slice(0, 12)} · remote not checked`,
  };
}
