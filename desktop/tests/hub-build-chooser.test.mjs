import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

import {
  chooserLabel,
  cleanCatalog,
  cleanPullRequests,
  projectBuildChooser,
} from "../private-controller/build-catalog.mjs";

const SHA = "a".repeat(40);

test("authored locally prepared builds remain visible without a remote branch", () => {
  const view = projectBuildChooser({
    branches: [],
    catalog: {
      "codex/local": {
        title: "Combined private build",
        purpose: "Owner preview",
      },
    },
    recorded: [{ branch: "codex/local", revision: SHA }],
  });
  assert.equal(view.previews[0].revision, SHA);
  assert.equal(view.previews[0].kind, "prepared");
  assert.match(chooserLabel(view.previews[0]), /prepared locally/);
});
const catalog = cleanCatalog(
  JSON.parse(
    readFileSync(
      new URL("../private-controller/build-catalog.json", import.meta.url),
      "utf8",
    ),
  ),
);

test("known branches get their authored names, main comes first", () => {
  const view = projectBuildChooser({
    branches: [
      { name: "main", sha: SHA },
      { name: "claude/ui-decision-follow-through", sha: SHA },
      { name: "claude/desktop-hub", sha: SHA },
      { name: "antigravity/political-geography-2026", sha: SHA },
    ],
    catalog,
  });
  assert.equal(view.main.title, "Main game (recommended)");
  assert.deepEqual(view.previews.map((item) => item.title).sort(), [
    "Desktop and Art Desk improvements",
    "Menus, creator and Calendar improvements",
    "Political maps and geographic data",
  ]);
  for (const item of view.previews) {
    assert.equal(item.revision, SHA);
    assert.ok(item.branch.includes("/"));
  }
});

test("open PRs become previews; merged, recovery and unlabelled go to technical", () => {
  const view = projectBuildChooser({
    branches: [
      { name: "cursor/new-feature", sha: SHA },
      { name: "codex/recovery25-desktop", sha: SHA },
      { name: "antigravity/national-names-v2-compiler", sha: SHA },
      { name: "claude/landed", sha: SHA },
      { name: "antigravity/old", sha: SHA },
    ],
    catalog,
    pullRequests: cleanPullRequests([
      {
        state: "open",
        number: 7,
        title: "A new feature",
        head: { ref: "cursor/new-feature" },
        updated_at: "2026-09-16T10:00:00Z",
      },
      { state: "open", number: 8, title: "bad", head: { ref: "../x" } },
    ]),
    merged: new Set(["claude/landed"]),
    unsupported: new Set(["antigravity/old"]),
  });
  assert.deepEqual(
    view.previews.map((item) => [item.branch, item.title, item.pullRequest]),
    [["cursor/new-feature", "A new feature", 7]],
  );
  const kinds = Object.fromEntries(
    view.technical.map((item) => [item.branch, item.kind]),
  );
  assert.deepEqual(kinds, {
    "codex/recovery25-desktop": "historical",
    "antigravity/national-names-v2-compiler": "technical",
    "claude/landed": "merged",
    "antigravity/old": "unsupported",
  });
  const unsupported = view.technical.find(
    (item) => item.kind === "unsupported",
  );
  assert.match(chooserLabel(unsupported), /can't be previewed/);
});

test("previews sort by meaningful recency", () => {
  const view = projectBuildChooser({
    branches: [
      { name: "claude/desktop-hub", sha: SHA },
      { name: "claude/ui-decision-follow-through", sha: SHA },
    ],
    catalog,
    commitTimes: {
      "claude/desktop-hub": 100,
      "claude/ui-decision-follow-through": 200,
    },
  });
  assert.deepEqual(
    view.previews.map((item) => item.branch),
    ["claude/ui-decision-follow-through", "claude/desktop-hub"],
  );
});

test("a build made here stays choosable after its branch leaves the remote", () => {
  // The payload is on disk. Dropping it from the chooser would strand the
  // owner on whatever is loaded, with no way back and no stated reason.
  const view = projectBuildChooser({
    branches: [{ name: "claude/desktop-hub", sha: SHA }],
    recorded: [
      { branch: "main", revision: SHA },
      { branch: "claude/desktop-hub", revision: SHA },
      { branch: "claude/gone-from-remote", revision: SHA },
    ],
  });
  assert.deepEqual(
    view.previews.map((item) => item.branch),
    [],
  );
  const kept = view.technical.find(
    (item) => item.branch === "claude/gone-from-remote",
  );
  assert.equal(kept?.kind, "recorded");
  assert.equal(kept?.revision, SHA);
  assert.match(chooserLabel(kept), /no longer on the remote/);
  // main is its own entry, never a technical duplicate.
  assert.equal(
    view.technical.some((item) => item.branch === "main"),
    false,
  );
  // A branch still on the remote is not duplicated by its recorded track.
  assert.equal(
    view.technical.filter((item) => item.branch === "claude/desktop-hub")
      .length,
    1,
  );
});

test("hostile catalog entries and branch names are dropped", () => {
  const cleaned = cleanCatalog({
    branches: { "../x": { title: "no" }, "ok/branch": { title: "" } },
  });
  assert.deepEqual(cleaned, {});
  const view = projectBuildChooser({
    branches: [{ name: "--upload-pack=x", sha: SHA }],
  });
  assert.equal(view.previews.length + view.technical.length, 0);
});
