/**
 * The "Game version" chooser, projected from records the hub already has
 * (CRUNCH46 H2). Pure: no Electron, no network, no git.
 *
 * - Main game is always first and recommended.
 * - Feature previews are branches with an authored catalog entry or an open
 *   pull request, not yet merged into main, newest first. Their label is the
 *   authored title (else the PR title); the exact ref and SHA stay available.
 * - Everything else — merged, historical recovery, unlabelled, or known to
 *   predate the desktop app — is a technical branch, shown only on request.
 */

import { MAIN_TRACK, validBranchName, validRevision } from "./hub-model.mjs";

const HISTORICAL =
  /(^|[/-])(recovery\d*|historical|archive|backup)([/-]|\d|$)/i;

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
}

export function cleanCatalog(value) {
  const out = {};
  const branches = value && typeof value === "object" ? value.branches : null;
  if (!branches || typeof branches !== "object") return out;
  for (const [name, entry] of Object.entries(branches)) {
    if (!validBranchName(name) || !entry || typeof entry !== "object") continue;
    const title = cleanText(entry.title, 80);
    if (!title) continue;
    out[name] = {
      title,
      purpose: cleanText(entry.purpose, 200),
      historical: entry.historical === true,
    };
  }
  return out;
}

/** Open pull requests from the public GitHub API, reduced to what we show. */
export function cleanPullRequests(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (pr) =>
        pr &&
        typeof pr === "object" &&
        pr.state === "open" &&
        validBranchName(pr.head?.ref ?? "") &&
        Number.isSafeInteger(pr.number),
    )
    .map((pr) => ({
      number: pr.number,
      branch: pr.head.ref,
      title: cleanText(pr.title, 120) ?? `Pull request ${pr.number}`,
      draft: pr.draft === true,
      updatedAt: typeof pr.updated_at === "string" ? pr.updated_at : null,
    }));
}

function timeOf(value) {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function projectBuildChooser({
  branches,
  catalog = {},
  pullRequests = [],
  commitTimes = {},
  merged = new Set(),
  unsupported = new Set(),
  recorded = [],
}) {
  const prByBranch = new Map(pullRequests.map((pr) => [pr.branch, pr]));
  const previews = [];
  const technical = [];
  for (const branch of branches ?? []) {
    if (!branch || branch.name === MAIN_TRACK) continue;
    if (!validBranchName(branch.name)) continue;
    const entry = catalog[branch.name] ?? null;
    const pr = prByBranch.get(branch.name) ?? null;
    const updated = Math.max(
      timeOf(pr?.updatedAt),
      Number.isFinite(commitTimes[branch.name])
        ? commitTimes[branch.name] * 1000
        : 0,
    );
    const item = {
      id: `branch:${branch.name}`,
      branch: branch.name,
      revision: validRevision(branch.sha) ? branch.sha : null,
      title: entry?.title ?? pr?.title ?? branch.name,
      purpose: entry?.purpose ?? null,
      pullRequest: pr ? pr.number : null,
      updated: updated || null,
      kind: "feature",
    };
    if (unsupported.has(branch.name)) {
      technical.push({ ...item, kind: "unsupported" });
    } else if (merged.has(branch.name)) {
      technical.push({ ...item, kind: "merged" });
    } else if (entry?.historical || (!entry && HISTORICAL.test(branch.name))) {
      technical.push({ ...item, kind: "historical" });
    } else if (entry || pr) {
      previews.push(item);
    } else {
      technical.push({ ...item, kind: "technical" });
    }
  }
  /*
   * A build this hub already made stays choosable even when its branch has
   * gone from the remote: the payload is on disk, and the owner must be able
   * to return to it — and to read why it is no longer offered as a preview.
   */
  const listed = new Set((branches ?? []).map((branch) => branch?.name));
  for (const track of recorded) {
    if (!track?.branch || track.branch === MAIN_TRACK) continue;
    if (listed.has(track.branch)) continue;
    const entry = catalog[track.branch] ?? null;
    const item = {
      id: `branch:${track.branch}`,
      branch: track.branch,
      revision: validRevision(track.revision) ? track.revision : null,
      title:
        entry?.title ?? prByBranch.get(track.branch)?.title ?? track.branch,
      purpose: entry?.purpose ?? null,
      pullRequest: prByBranch.get(track.branch)?.number ?? null,
      updated: null,
      kind: entry && !entry.historical ? "prepared" : "recorded",
    };
    if (item.kind === "prepared") previews.push(item);
    else technical.push(item);
  }
  const byRecency = (a, b) =>
    (b.updated ?? 0) - (a.updated ?? 0) || a.branch.localeCompare(b.branch);
  previews.sort(byRecency);
  technical.sort(byRecency);
  return {
    main: {
      id: MAIN_TRACK,
      branch: MAIN_TRACK,
      title: "Main game (recommended)",
    },
    previews,
    technical,
  };
}

/** One human line for an option; the exact ref stays in the details. */
export function chooserLabel(item) {
  switch (item.kind) {
    case "prepared":
      return `${item.title} — prepared locally`;
    case "merged":
      return `${item.title} — already in main`;
    case "historical":
      return `${item.title} — historical`;
    case "unsupported":
      return `${item.title} — can't be previewed here`;
    case "recorded":
      return `${item.title} — built here, no longer on the remote`;
    default:
      return item.title;
  }
}
