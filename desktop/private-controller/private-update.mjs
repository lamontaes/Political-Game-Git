import path from "node:path";
import { URL } from "node:url";

export const CONTROLLER_STATE_SCHEMA = 1;
export const EXPECTED_REPOSITORY = "github.com/lamontaes/Political-Game-Git";
export const AUTOMATIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const AUTOMATIC_STARTUP_DELAY_MS = 20 * 1000;

export function cleanUpdatePolicy(value) {
  // Legacy valid state opts into the disclosed new default. Explicit malformed
  // or future preferences fail closed to manual, never silently enable work.
  const mode =
    value === undefined
      ? "automatic"
      : value?.version === 1 && value.mode === "automatic"
        ? "automatic"
        : "manual";
  return {
    version: 1,
    mode,
    lastAttemptAt:
      typeof value?.lastAttemptAt === "string" &&
      Number.isFinite(Date.parse(value.lastAttemptAt))
        ? value.lastAttemptAt
        : null,
    lastOutcome:
      typeof value?.lastOutcome === "string" ? value.lastOutcome : null,
  };
}

export function automaticCheckDue(state, now = Date.now()) {
  const policy = cleanUpdatePolicy(state?.updatePolicy);
  if (!state?.repositoryPath || state.pending || policy.mode !== "automatic")
    return false;
  const last =
    policy.lastAttemptAt === null ? null : Date.parse(policy.lastAttemptAt);
  return last === null || now - last >= AUTOMATIC_CHECK_INTERVAL_MS;
}

export function setUpdateMode(state, mode) {
  if (mode !== "automatic" && mode !== "manual")
    throw new Error("Invalid update mode.");
  return {
    ...state,
    updatePolicy: { ...cleanUpdatePolicy(state.updatePolicy), mode },
  };
}

export function canonicalRepository(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const ssh = /^git@github\.com:(.+?)(?:\.git)?$/i.exec(raw);
  if (ssh) return `github.com/${ssh[1].replace(/\.git$/i, "")}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "ssh:") return null;
    const pathname = url.pathname.replace(/^\/+/, "").replace(/\.git$/i, "");
    return `${url.hostname.toLowerCase()}/${pathname}`;
  } catch {
    return null;
  }
}

export function repositoryIsExpected(value) {
  return canonicalRepository(value) === EXPECTED_REPOSITORY;
}

export function validateRevision(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

export function assessUpdateTarget({
  currentRevision,
  targetRevision,
  currentIsAncestor,
}) {
  if (!validateRevision(targetRevision))
    return { action: "refuse", reason: "invalid-target" };
  if (!currentRevision)
    return { action: "build", reason: "first-controlled-build" };
  if (!validateRevision(currentRevision))
    return { action: "refuse", reason: "invalid-current" };
  if (currentRevision === targetRevision)
    return { action: "none", reason: "up-to-date" };
  if (!currentIsAncestor)
    return { action: "refuse", reason: "unsupported-downgrade-or-fork" };
  return { action: "build", reason: "newer-main" };
}

export function controllerPaths(dataRoot, revision) {
  if (!validateRevision(revision)) throw new Error("Invalid build revision.");
  const root = path.resolve(dataRoot);
  const versionsRoot = path.join(root, "versions");
  const stagingRoot = path.join(root, "staging", revision);
  return {
    root,
    statePath: path.join(root, "state.json"),
    versionsRoot,
    stagingRoot,
    sourcePath: path.join(stagingRoot, "source"),
    versionPath: path.join(versionsRoot, revision),
    appPath: path.join(
      versionsRoot,
      revision,
      "Our Civic Duty Internal Art Review.app",
    ),
  };
}

export function cleanControllerState(value) {
  if (!value || typeof value !== "object") return null;
  if (value.schema !== CONTROLLER_STATE_SCHEMA) return null;
  const cleanBuild = (build) => {
    if (!build || typeof build !== "object") return null;
    if (!validateRevision(build.revision)) return null;
    if (typeof build.appPath !== "string" || !path.isAbsolute(build.appPath))
      return null;
    if (build.profile !== "internal-art-review") return null;
    return {
      revision: build.revision,
      appPath: path.resolve(build.appPath),
      version: typeof build.version === "string" ? build.version : "unknown",
      profile: "internal-art-review",
      architecture:
        typeof build.architecture === "string" ? build.architecture : "unknown",
      installedAt:
        typeof build.installedAt === "string" ? build.installedAt : "unknown",
    };
  };
  const current = cleanBuild(value.current);
  const pending = value.pending ? cleanBuild(value.pending) : null;
  const previous = value.previous ? cleanBuild(value.previous) : null;
  if (!current || (value.pending && !pending) || (value.previous && !previous))
    return null;
  return {
    schema: CONTROLLER_STATE_SCHEMA,
    repositoryPath:
      typeof value.repositoryPath === "string" ? value.repositoryPath : null,
    current,
    pending,
    previous,
    updatePolicy: cleanUpdatePolicy(value.updatePolicy),
    compatibilityProof: value.compatibilityProof ?? null,
  };
}

export function withPendingBuild(state, build, repositoryPath) {
  return {
    ...state,
    schema: CONTROLLER_STATE_SCHEMA,
    repositoryPath,
    current: state.current,
    previous: state.previous ?? null,
    pending: build,
  };
}

export function activatePendingBuild(state) {
  if (!state.pending) return state;
  return {
    ...state,
    schema: CONTROLLER_STATE_SCHEMA,
    repositoryPath: state.repositoryPath ?? null,
    current: state.pending,
    previous: state.current,
    pending: null,
    compatibilityProof: null,
  };
}

export function buildRecord(identity, appPath, architecture, installedAt) {
  if (!identity || typeof identity !== "object")
    throw new Error("The built application has no identity.");
  if (!validateRevision(identity.revision))
    throw new Error("The built application revision is invalid.");
  if (identity.profile !== "internal-art-review")
    throw new Error(
      "The built application is not the internal art-review profile.",
    );
  return {
    revision: identity.revision,
    appPath: path.resolve(appPath),
    version: String(identity.version ?? "unknown"),
    profile: "internal-art-review",
    architecture,
    installedAt,
  };
}
