/* global console, process, setTimeout, fetch, URL */
/**
 * Combined Art Desk journey inside the packaged private hub, isolated data
 * root, on the bench writer's artbench store:
 *
 *   session 1 (bench pinned to an older SHA on the branch):
 *     host token enforced (missing / wrong header → 401) · disposable request
 *     · intake through the UI · tags · revision comment · original download
 *     through the hub · edited version reimported through the UI keeping tags
 *     and lineage · fixture approval of the edit
 *   session 2 (pin removed → bench moves to the branch head):
 *     same request, candidates, tags, decisions and lineage from the hub's
 *     record root; worktree now at the new source; identities in Settings.
 *
 * Decisions, tags and the request are written with an explicit fixture owner
 * actor. The bench UI acts as the owner, so the test never clicks a decision
 * button; UI intake/reimport are attributed by the bench to its default
 * owner inside this isolated store only.
 *
 * Usage:
 *   node scripts/hub-artbench-journey-test.mjs --hub <exe> --build <app>
 *     --repo <dir> --pack <dir> --branch <name> --pin <older sha>
 *     [--drive-root <dir>] [--data-root <dir>] [--screenshot-dir <dir>]
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright";

import { branchSlug } from "../private-controller/hub-model.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const hubExecutable = value("--hub");
const build = value("--build");
const repo = value("--repo");
const pack = value("--pack");
const branch = value("--branch");
const pin = value("--pin");
if (!hubExecutable || !build || !repo || !pack || !branch || !pin) {
  console.error(
    "Usage: node scripts/hub-artbench-journey-test.mjs --hub <exe> --build <app> --repo <dir> --pack <dir> --branch <name> --pin <sha> [--drive-root <dir>] [--data-root <dir>] [--screenshot-dir <dir>]",
  );
  process.exit(2);
}
const dataRoot =
  value("--data-root") ?? mkdtempSync(path.join(os.tmpdir(), "ocd-hub-jrn-"));
mkdirSync(dataRoot, { recursive: true });
const driveRoot =
  value("--drive-root") ?? path.join(dataRoot, "fixture-drive-exchange");
for (const child of [
  "01_INBOX",
  "02_CATALOG",
  "03_REVIEW_AND_INTEGRATION_EVENTS",
])
  mkdirSync(path.join(driveRoot, child), { recursive: true });
const downloads = path.join(dataRoot, "downloads");
mkdirSync(downloads, { recursive: true });
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });
const worktree = path.join(dataRoot, "artdesk", branchSlug(branch), "source");

const requireRoot = createRequire(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);
const { PNG } = requireRoot("pngjs");
function png(width, height, seed) {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 7 + seed) % 256;
    image.data[i + 1] = (i * 3 + seed * 5) % 256;
    image.data[i + 2] = 90;
    image.data[i + 3] = 255;
  }
  return PNG.sync.write(image);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const failures = [];
const check = (label, condition, detail = "") => {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label, timeout = 60000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await sleep(500);
  }
};

const identity = JSON.parse(
  readFileSync(
    path.join(build, "Contents", "Resources", "build-identity.json"),
    "utf8",
  ),
);
writeFileSync(
  path.join(dataRoot, "state.json"),
  `${JSON.stringify(
    {
      schema: 2,
      repositoryPath: repo,
      privatePackPath: pack,
      selectedTrack: "main",
      tracks: {
        main: {
          branch: "main",
          current: {
            revision: identity.revision,
            appPath: path.resolve(build),
            version: identity.version,
            profile: identity.profile,
            architecture: "arm64 (fixture record)",
            installedAt: new Date().toISOString(),
            clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
            privatePack: null,
          },
          pending: null,
          previous: null,
        },
      },
    },
    null,
    2,
  )}\n`,
);
const writeSettings = (extra) =>
  writeFileSync(
    path.join(dataRoot, "settings.json"),
    `${JSON.stringify(
      {
        installId: "hub-artbench-journey",
        artDeskBranch: branch,
        artbenchDriveRoot: driveRoot,
        ...extra,
      },
      null,
      2,
    )}\n`,
  );

async function launchHub() {
  const app = await electron.launch({
    executablePath: path.resolve(hubExecutable),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: dataRoot,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_BUILDS: "1",
      OCD_DOWNLOAD_DIR: downloads,
    },
  });
  const find = (pattern, label, timeout) =>
    waitFor(
      () => app.windows().find((page) => pattern.test(page.url())),
      label,
      timeout,
    );
  const chrome = await find(/^file:.*\/index\.html$/, "hub chrome");
  const selected = async (name) =>
    (await chrome.getByRole("tab", { name }).getAttribute("aria-selected")) ===
    "true";
  // No tab click: the bench starts in the background next to the game.
  const desk = await find(
    /^http:\/\/127\.0\.0\.1:\d+\/art-desk\.html/,
    "Art Desk view started in the background",
    15 * 60000,
  );
  await desk.waitForLoadState("domcontentloaded");
  await desk.getByTestId("art-desk-inputs").waitFor({ timeout: 60000 });
  const tabStates = {};
  for (const name of ["Play", "Art Desk", "Agents", "Settings"])
    tabStates[name] = await chrome
      .getByRole("tab", { name })
      .getAttribute("aria-selected");
  check(
    "startup: Art Desk loaded while Play stayed the selected tab",
    await selected("Play"),
    JSON.stringify(tabStates),
  );
  const marker = await desk.evaluate(
    () => (globalThis.__hubMarker = Math.random()),
  );
  const game = await find(/^app:\/\/game\//, "Play view");
  const gameMarker = await game.evaluate(
    () => (globalThis.__hubMarker = Math.random()),
  );
  const switches = [];
  for (const name of [
    "Art Desk",
    "Agents",
    "Play",
    "Art Desk",
    "Play",
    "Art Desk",
  ]) {
    const started = Date.now();
    await chrome.getByRole("tab", { name }).click();
    await waitFor(() => selected(name), `${name} tab`);
    switches.push(Date.now() - started);
  }
  check(
    "startup: switching Play/Art Desk/Agents reloads nothing",
    (await desk.evaluate(() => globalThis.__hubMarker)) === marker &&
      (await game.evaluate(() => globalThis.__hubMarker)) === gameMarker,
    `switch ms ${switches.join(",")}`,
  );
  const settings = await find(/^file:.*\/settings\.html$/, "settings page");
  return { app, chrome, desk, settings };
}

async function quitHub(app) {
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}

const bench = (desk, method, route, json) =>
  desk.evaluate(
    async ({ method, route, json }) => {
      const response = await fetch(route, {
        method,
        cache: "no-store",
        headers: json ? { "Content-Type": "application/json" } : {},
        body: json ? JSON.stringify(json) : undefined,
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      return { status: response.status, json: parsed, text };
    },
    { method, route, json },
  );
const benchState = async (desk) =>
  (await bench(desk, "GET", "/__dev/artbench/state")).json;

const ACTOR = { kind: "owner", id: "hub-qa-fixture" };
const requestId = `qa-hub-journey-${Date.now().toString(36)}`;
const hex = (c) => c.repeat(64);

async function openRow(desk) {
  await desk.getByLabel("Search requests").fill(requestId);
  const row = desk.getByTestId(`art-desk-row-${requestId}`);
  const lanes = desk.locator('[data-testid^="art-desk-lane-"]');
  for (let i = 0; i < (await lanes.count()); i += 1) {
    if (await row.isVisible()) break;
    await lanes.nth(i).click();
    await sleep(300);
  }
  await row.click();
}

const record = {};

// ---- Session 1: older pinned bench -------------------------------------------
writeSettings({ artDeskPin: pin });
{
  const { app, chrome, desk, settings } = await launchHub();
  check(
    "s1: bench worktree runs the pinned source",
    execFileSync("/usr/bin/git", ["-C", worktree, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim() === pin,
    pin.slice(0, 12),
  );
  const stateUrl = new URL("/__dev/artbench/state", desk.url());
  const missing = await fetch(stateUrl).then((r) => r.status);
  const wrong = await fetch(stateUrl, {
    headers: { "X-OCD-Art-Desk-Token": "wrong-token-value" },
  }).then((r) => r.status);
  check(
    "s1: missing and wrong host tokens are refused",
    missing === 401 && wrong === 401,
    `${missing}/${wrong}`,
  );

  const created = await bench(desk, "POST", "/__dev/artbench/events", {
    type: "request.created",
    actor: ACTOR,
    payload: {
      request: {
        requestId,
        requestVersion: 1,
        priority: "P2",
        status: "queued",
        title: "QA hub journey (disposable)",
        consumer: {
          consumerId: "qa-hub-journey",
          runtimeComponent: "none",
          playerVisibleUse: "Hub bench proof only.",
        },
        whyNeeded: "Hub journey proof.",
        inventoryCheck: {
          repositoryPathsSearched: [],
          driveLocationsSearched: [],
          found: "n/a",
          shortfall: "n/a",
        },
        target: {
          targetClass: "environment-plate",
          minimumWidth: 8,
          aspectRatio: "any",
          alphaRequired: false,
          container: "either",
          styleAuthority: "n/a",
        },
        generationRecipe: ["Do not generate."],
        acceptanceCriteria: ["Survives a source change."],
        dependsOn: [],
      },
    },
  });
  check("s1: disposable request created", created.status === 201);

  // Intake through the owner UI.
  await desk.reload();
  await desk.getByTestId("art-desk-inputs").waitFor();
  await openRow(desk);
  const originalBytes = png(48, 32, 7);
  const originalFile = path.join(dataRoot, "journey-original.png");
  writeFileSync(originalFile, originalBytes);
  await desk.getByTestId("art-desk-upload").setInputFiles(originalFile);
  const first = await waitFor(async () => {
    const state = await benchState(desk);
    const ids = state?.projection?.requests?.[requestId]?.candidateIds ?? [];
    return ids.length ? state.projection.candidates[ids[0]] : null;
  }, "UI intake recorded");
  check(
    "s1: UI intake stored the exact bytes",
    first.sha256 === sha256(originalBytes) && first.width === 48,
    first.sha256.slice(0, 12),
  );
  record.first = first.candidateId;
  record.firstSha = first.sha256;

  // Tags and revision comment as the fixture owner.
  const tags = await bench(desk, "POST", "/__dev/artbench/events", {
    type: "tags.set",
    actor: ACTOR,
    payload: {
      entity: "candidate",
      entityId: first.candidateId,
      tags: { region: ["southwest"], assetType: ["environment-plate"] },
      baseVersion: first.tagsVersion ?? 0,
    },
  });
  check("s1: tags recorded", tags.status === 201, tags.text.slice(0, 80));
  const note = "Hub journey: keep the railing, remove the van.";
  const revision = await bench(desk, "POST", "/__dev/artbench/events", {
    type: "review.decided",
    actor: ACTOR,
    payload: {
      candidateId: first.candidateId,
      viewedCandidateId: first.candidateId,
      viewedSha256: first.sha256,
      decision: "request-revision",
      note,
      fitContractHash: hex("f"),
      sceneContractHash: hex("e"),
      contractVersion: "alive43-art-desk-v1",
    },
  });
  check("s1: revision comment recorded", revision.status === 201);
  record.revisionEvent = revision.json?.events?.[0]?.eventId;

  await desk.reload();
  await desk.getByTestId("art-desk-inputs").waitFor();
  await openRow(desk);
  await desk.getByTestId(`art-desk-candidate-${first.candidateId}`).click();
  await desk.getByTestId("art-desk-decisions").waitFor();
  const decisionsText = await desk
    .getByTestId("art-desk-decisions")
    .innerText();
  check(
    "s1: owner view shows the fixture revision with its note",
    decisionsText.includes("hub-qa-fixture") && decisionsText.includes(note),
  );
  check(
    "s1: owner view shows the saved tag",
    (await desk.getByTestId("art-desk-tag-region").inputValue()).includes(
      "southwest",
    ),
  );

  // Original download through the hub's download handling.
  await desk.getByTestId("art-desk-download-original").click();
  const saved = await waitFor(
    () =>
      readdirSync(downloads)
        .map((name) => path.join(downloads, name))
        .find(
          (file) =>
            /\.png$/i.test(file) &&
            existsSync(file) &&
            sha256(readFileSync(file)) === first.sha256,
        ),
    "downloaded original",
    30000,
  );
  check("s1: original downloaded with exact bytes", Boolean(saved), saved);

  // Edited version reimported through the UI.
  const editedBytes = png(48, 32, 99);
  const editedFile = path.join(dataRoot, "journey-edited.png");
  writeFileSync(editedFile, editedBytes);
  await desk.getByTestId("art-desk-edit-kind").selectOption("repaint");
  await desk.getByTestId("art-desk-edit-note").fill("hub journey repaint");
  await desk.getByTestId("art-desk-upload-edited").setInputFiles(editedFile);
  const edited = await waitFor(async () => {
    const state = await benchState(desk);
    return Object.values(state?.projection?.candidates ?? {}).find(
      (c) => c.parentCandidateId === first.candidateId,
    );
  }, "edited reimport");
  check(
    "s1: edited version keeps lineage and tags",
    edited.editKind === "repaint" &&
      edited.sha256 === sha256(editedBytes) &&
      (edited.tags?.region ?? []).includes("southwest"),
    `${edited.candidateId} ${edited.editKind}`,
  );
  record.edited = edited.candidateId;
  record.editedSha = edited.sha256;
  const approval = await bench(desk, "POST", "/__dev/artbench/events", {
    type: "review.decided",
    actor: ACTOR,
    payload: {
      candidateId: edited.candidateId,
      viewedCandidateId: edited.candidateId,
      viewedSha256: edited.sha256,
      decision: "approve",
      note: "Isolated QA approval by a fixture, not the owner.",
      fitContractHash: hex("f"),
      sceneContractHash: hex("e"),
      contractVersion: "alive43-art-desk-v1",
    },
  });
  check(
    "s1: isolated fixture approval of the edit queued for integration",
    approval.status === 201 &&
      (approval.json?.events ?? []).some(
        (e) => e.type === "integration.queued",
      ),
  );
  record.approvalEvent = approval.json?.events?.[0]?.eventId;
  const sync = await bench(desk, "POST", "/__dev/artbench/sync");
  record.sync = sync.json;
  check(
    "s1: bench sync ran against the configured exchange root",
    sync.status < 300,
    JSON.stringify(sync.json ?? sync.text).slice(0, 160),
  );
  await chrome.getByRole("tab", { name: "Settings" }).click();
  const benchId = await settings.locator("#id-bench").innerText();
  check(
    "s1: Settings names the pinned bench source",
    benchId.includes(pin),
    benchId,
  );
  if (shots)
    await desk.screenshot({ path: path.join(shots, "journey-s1.png") });
  await quitHub(app);
}

// ---- Session 2: source change to the branch head ------------------------------
writeSettings({});
{
  const { app, chrome, desk, settings } = await launchHub();
  const head = execFileSync(
    "/usr/bin/git",
    ["-C", repo, "rev-parse", `refs/remotes/origin/${branch}`],
    { encoding: "utf8" },
  ).trim();
  const now = execFileSync(
    "/usr/bin/git",
    ["-C", worktree, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  check(
    "s2: bench moved to the branch head",
    now === head && head !== pin,
    `${pin.slice(0, 12)} → ${now.slice(0, 12)}`,
  );
  const state = await benchState(desk);
  const first = state.projection.candidates[record.first];
  const edited = state.projection.candidates[record.edited];
  check(
    "s2: request, candidates, tags and lineage retained",
    state.projection.requests[requestId]?.candidateIds.length >= 2 &&
      first?.sha256 === record.firstSha &&
      edited?.sha256 === record.editedSha &&
      edited?.parentCandidateId === record.first &&
      (first?.tags?.region ?? []).includes("southwest"),
  );
  const decisionIds = [
    ...(first?.decisions ?? []),
    ...(edited?.decisions ?? []),
  ].map((d) => d.eventId);
  check(
    "s2: revision and approval events retained with their ids",
    decisionIds.includes(record.revisionEvent) &&
      decisionIds.includes(record.approvalEvent),
    `${record.revisionEvent} ${record.approvalEvent}`,
  );
  await openRow(desk);
  await desk.getByTestId(`art-desk-candidate-${record.edited}`).click();
  const preview = desk.getByTestId("art-desk-candidate-preview");
  const width = await waitFor(
    () => preview.evaluate((img) => img.naturalWidth),
    "edited preview",
    20000,
  );
  check("s2: edited preview decodes on the new source", width === 48);
  await chrome.getByRole("tab", { name: "Settings" }).click();
  const ids = {
    hub: await settings.locator("#id-hub").innerText(),
    game: await settings.locator("#id-game").innerText(),
    bench: await settings.locator("#id-bench").innerText(),
    pack: await settings.locator("#id-pack").innerText(),
  };
  check(
    "s2: Settings shows separate hub, game, bench and pack identities",
    ids.game.includes(identity.revision) && ids.bench.includes(head),
    JSON.stringify(ids),
  );
  if (shots) {
    await desk.screenshot({ path: path.join(shots, "journey-s2.png") });
    await settings.screenshot({
      path: path.join(shots, "journey-settings.png"),
    });
  }
  await quitHub(app);
}

writeFileSync(
  path.join(dataRoot, "journey-record.json"),
  `${JSON.stringify({ requestId, driveRoot, ...record }, null, 2)}\n`,
);
console.log(`Journey record: ${path.join(dataRoot, "journey-record.json")}`);
if (failures.length) {
  console.error(`${failures.length} journey check(s) failed.`);
  process.exit(1);
}
console.log("Hub Art Desk journey checks passed.");
