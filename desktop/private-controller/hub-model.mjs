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
 * Electron can briefly report negative content dimensions while macOS restores
 * a window. AppKit rejects those bounds and leaves every view blank, so the
 * hub clamps that transient state and lays out normally on the next resize.
 */
/**
 * How tall the hub's bar is. Playing full screen gives the game the whole
 * screen, so the bar steps aside; every other tab, and a windowed game, keep it.
 */
export function hubChromeHeight({ fullScreen, activeTab }, chromeHeight = 92) {
  return fullScreen && activeTab === "play" ? 0 : chromeHeight;
}

export function hubViewLayout(bounds, chromeHeight = 92) {
  const finite = (value) =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const width = finite(bounds?.width);
  const height = finite(bounds?.height);
  const chrome = Math.min(finite(chromeHeight), height);
  return {
    chrome: { x: 0, y: 0, width, height: chrome },
    content: { x: 0, y: chrome, width, height: height - chrome },
  };
}

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
          // Carried only when the pack stated it; a pack that does not is
          // recorded exactly as it was before the field existed.
          ...(Number.isInteger(build.privatePack.generation)
            ? { generation: build.privatePack.generation }
            : {}),
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
    ...(build.delivery === "console-client-payload"
      ? { delivery: "console-client-payload" }
      : {}),
    ...(build.preparedLocally === true ? { preparedLocally: true } : {}),
    privatePack: pack,
    ...(build.content?.schema === "ocd-runtime-art/v1" &&
    /^[a-f0-9]{64}$/.test(build.content.id) &&
    typeof build.content.cacheRoot === "string" &&
    path.isAbsolute(build.content.cacheRoot)
      ? {
          content: {
            schema: build.content.schema,
            id: build.content.id,
            cacheRoot: build.content.cacheRoot,
          },
        }
      : {}),
  };
}

function cleanTrack(value) {
  if (!value || typeof value !== "object") return null;
  const current = cleanBuild(value.current);
  if (!current) return null;
  return {
    branch: typeof value.branch === "string" ? value.branch : MAIN_TRACK,
    ...(typeof value.privatePackPath === "string" &&
    path.isAbsolute(value.privatePackPath)
      ? { privatePackPath: value.privatePackPath }
      : {}),
    ...(value.pinned === true ? { pinned: true } : {}),
    current,
    pending: cleanBuild(value.pending),
    previous: cleanBuild(value.previous),
  };
}

/**
 * The track a stored selection may name: main, or any syntactically valid
 * owner-repository branch, built or not. Nothing else survives a read.
 */
export function selectableTrack(id) {
  if (id === MAIN_TRACK) return MAIN_TRACK;
  if (typeof id !== "string" || !id.startsWith("branch:")) return MAIN_TRACK;
  return validBranchName(id.slice("branch:".length)) ? id : MAIN_TRACK;
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
  // A requested branch is kept even before its first build exists: the
  // selection is the owner's choice, the build record is separate evidence.
  const selected = selectableTrack(value.selectedTrack);
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
 * `present` is the caller's disk evidence for the recorded build: a record
 * whose payload is gone is never labeled verified.
 */
export function playLabel({
  track,
  build,
  remoteRevision,
  fetchState,
  present = true,
}) {
  if (!build) return { kind: "none", text: "No verified build yet" };
  const base = track === MAIN_TRACK ? "Main" : "Branch preview";
  if (!present)
    return {
      kind: "needs-rebuild",
      text: `${base} · cached build ${build.revision.slice(0, 12)} is missing from disk · needs rebuilding`,
    };
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

/* --------------------------------------------------------- update checks */

export const CHECK_OUTCOMES = new Set([
  "source-available",
  "kept-local",
  "up-to-date",
  "ready",
  "waiting",
  "offline",
  "failed",
  "unsupported",
  "cancelled",
]);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function cleanCheck(value) {
  if (!value || typeof value !== "object") return null;
  if (!CHECK_OUTCOMES.has(value.outcome)) return null;
  if (typeof value.at !== "string" || !ISO.test(value.at)) return null;
  return {
    outcome: value.outcome,
    at: value.at,
    revision: validRevision(value.revision) ? value.revision : null,
    lastSuccessAt:
      typeof value.lastSuccessAt === "string" && ISO.test(value.lastSuccessAt)
        ? value.lastSuccessAt
        : null,
    lastSuccessRevision: validRevision(value.lastSuccessRevision)
      ? value.lastSuccessRevision
      : null,
    message:
      typeof value.message === "string" ? value.message.slice(0, 400) : "",
  };
}

/** Per-track record of the last update check, kept by the hub process only. */
export function cleanChecks(value) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  for (const [id, check] of Object.entries(value)) {
    if (selectableTrack(id) !== id) continue;
    const cleaned = cleanCheck(check);
    if (cleaned) out[id] = cleaned;
  }
  return out;
}

/**
 * Records one finished check. A success (the remote was read and the result
 * is current, ready or waiting) moves the last-success mark; a failure keeps
 * the previous success so "Up to date" is never claimed from a failed fetch.
 */
export function recordCheck(checks, id, { outcome, at, revision, message }) {
  const previous = checks[id] ?? null;
  const success = [
    "up-to-date",
    "ready",
    "waiting",
    "source-available",
    "kept-local",
  ].includes(outcome);
  return {
    ...checks,
    [id]: cleanCheck({
      outcome,
      at,
      revision: revision ?? null,
      message: message ?? "",
      lastSuccessAt: success ? at : (previous?.lastSuccessAt ?? null),
      lastSuccessRevision: success
        ? (revision ?? null)
        : (previous?.lastSuccessRevision ?? null),
    }),
  };
}

/**
 * What the hub says about one track's update state. "Up to date" needs a
 * successful check whose remote revision equals the loaded, verified build;
 * anything else is Checking / Preparing / Ready / Could not check.
 */
export function updateStatus({
  phase,
  check,
  build,
  pending = null,
  building,
}) {
  if (phase?.phase === "installing")
    return { kind: "preparing", text: phase.message ?? "Installing update…" };
  // A recorded terminal failure outranks a worker that is still winding down:
  // an offline or refused check must not keep reading "Checking for updates…".
  const settledFailure =
    check &&
    ["offline", "failed", "unsupported"].includes(check.outcome) &&
    !(Date.parse(phase?.checkStartedAt) > Date.parse(check.at));
  // A worker that already reported its outcome is finishing, not building.
  if (
    building &&
    !settledFailure &&
    !["failed", "ready"].includes(phase?.phase)
  ) {
    if (!phase || phase.phase === "fetching")
      return { kind: "checking", text: "Checking for updates…" };
    return {
      kind: "preparing",
      text:
        phase.phase === "verifying"
          ? "Verifying the update…"
          : "Preparing the update on this Mac…",
    };
  }
  if (pending && !settledFailure)
    return { kind: "waiting", text: "Update ready — press Install update" };
  if (!check) return { kind: "unchecked", text: "Not checked yet" };
  // The persisted message travels as a detail so a restarted hub, whose
  // in-memory phase is empty, can still say what happened and when.
  const at = (kind, text) => ({
    kind,
    text,
    detail: check.message ? check.message : null,
  });
  switch (check.outcome) {
    case "up-to-date":
      return build && check.revision === build.revision
        ? at("current", "Up to date")
        : at("ready", "Ready to use");
    case "source-available":
      return at("waiting", "New version available · awaiting preparation");
    case "kept-local":
      return at("current", "Private preview kept");
    case "ready":
      return at("ready", "Ready to use");
    case "waiting":
      // Checks survive activation and restart. Only a real pending build can
      // offer installation; a historical waiting result is not an action.
      if (pending) return at("waiting", "Update ready — press Install update");
      if (build && check.revision === build.revision)
        return {
          kind: "current",
          text: "Up to date",
          detail: "Update installed.",
        };
      return {
        kind: "unchecked",
        text: "Check for updates",
        detail: "The previously prepared update is no longer waiting.",
      };
    case "offline":
      return at(
        "offline",
        "Offline — could not reach the project remote; showing the last known-good build",
      );
    case "unsupported":
      return at(
        "unsupported",
        "This build can't be previewed in the desktop app",
      );
    case "cancelled":
      return at("unchecked", "Check canceled");
    default:
      return at("failed", "Could not check");
  }
}

/**
 * The single pill shown at the left of the bar. A remote check says nothing
 * about the disk, so a recorded build whose payload is gone takes the pill
 * away from "Up to date": the owner never reads a verified claim beside a
 * sentence saying the build is missing.
 */
export const NEEDS_REBUILD_TEXT =
  "Cached build missing from disk — needs rebuilding";

export function barPill({ update, selectedBuilt, track }) {
  if (selectedBuilt && track?.currentPresent === false)
    return { kind: "needs-rebuild", text: NEEDS_REBUILD_TEXT };
  return { kind: update?.kind ?? "unchecked", text: update?.text ?? "" };
}

/* ------------------------------------------------- superseded requests */

/**
 * A monotonic request counter. Long jobs capture a token and act only while
 * it is still current, so a slow selection or chooser response that finishes
 * after a later one can never replace what the owner chose last.
 */
export function createGeneration() {
  let current = 0;
  return {
    begin: () => ++current,
    current: () => current,
    isCurrent: (token) => token === current,
  };
}

/**
 * Queued builds worth keeping after a new selection: the selection itself and
 * main. Anything else the owner has already moved past is dropped.
 */
export function prunedQueue(queue, selectedTrack) {
  return (queue ?? []).filter(
    (entry) => entry?.track === selectedTrack || entry?.track === MAIN_TRACK,
  );
}
