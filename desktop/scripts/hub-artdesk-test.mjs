/* global console, process, setTimeout, fetch, URL, atob */
/**
 * Art Desk inside the packaged private hub, in an isolated data root:
 * import an existing raster for a disposable QA request, see the decoded
 * preview, bind a review to the verified hash, quit, relaunch, and find the
 * same request, candidate hash, preview and review again.
 *
 * Uses the bench's artbench store (events + intake). The decision is sent
 * with an explicit fixture owner actor; an agent actor must be refused. The
 * bench's own decision buttons act as the owner, so this proof never clicks
 * them. Events are immutable, so each run uses a fresh request id.
 *
 * Usage:
 *   node scripts/hub-artdesk-test.mjs --hub <hub executable>
 *     --build <Internal Art Review.app> --repo <owner repository>
 *     --pack <private pack dir> --branch <art desk branch>
 *     [--data-root <dir>] [--screenshot-dir <dir>] [--keep]
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

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
if (!hubExecutable || !build || !repo || !pack || !branch) {
  console.error(
    "Usage: node scripts/hub-artdesk-test.mjs --hub <exe> --build <app> --repo <dir> --pack <dir> --branch <name> [--data-root <dir>] [--screenshot-dir <dir>] [--keep]",
  );
  process.exit(2);
}
const dataRoot =
  value("--data-root") ?? mkdtempSync(path.join(os.tmpdir(), "ocd-hub-art-"));
mkdirSync(dataRoot, { recursive: true });
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });

const QA_ID = "qa-hub-art-desk-round-trip";
const QA_REQUEST = {
  requestId: QA_ID,
  requestVersion: 1,
  priority: "P3",
  status: "draft",
  title: "QA round trip through the private hub",
  consumer: {
    consumerId: "qa-bench",
    runtimeComponent: "none",
    playerVisibleUse: "Hub bench proof only; never shown to a player.",
  },
  whyNeeded: "Proves import, preview, review and restart inside the hub.",
  inventoryCheck: {
    repositoryPathsSearched: ["art/families/"],
    driveLocationsSearched: ["none"],
    found: "An existing tracked raster is reused as the candidate.",
    shortfall: "None; this is a disposable QA request.",
  },
  target: {
    targetClass: "environment-plate",
    minimumWidth: 1,
    aspectRatio: "any",
    alphaRequired: false,
    container: "either",
    styleAuthority: "not applicable — QA fixture",
  },
  generationRecipe: ["Do not generate."],
  acceptanceCriteria: ["Preview decodes after restart."],
  dependsOn: [],
};
const RASTER =
  "art/families/campaign-storefront/env_campaign_storefront_v1.png";

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
writeFileSync(
  path.join(dataRoot, "settings.json"),
  `${JSON.stringify({ installId: "hub-art-desk-proof", artDeskBranch: branch }, null, 2)}\n`,
);

async function launchHub() {
  const app = await electron.launch({
    executablePath: path.resolve(hubExecutable),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: dataRoot,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_BUILDS: "1",
    },
  });
  const chrome = await waitFor(
    () =>
      app.windows().find((page) => /^file:.*\/index\.html$/.test(page.url())),
    "hub chrome",
  );
  return { app, chrome };
}

async function openArtDesk(app, chrome) {
  await chrome.getByRole("tab", { name: "Art Desk" }).click();
  const desk = await waitFor(
    () =>
      app
        .windows()
        .find((page) =>
          /^http:\/\/127\.0\.0\.1:\d+\/art-desk\.html/.test(page.url()),
        ),
    "Art Desk view (first start installs dependencies and stages the pack)",
    15 * 60000,
  );
  await desk.waitForLoadState("domcontentloaded");
  await desk.getByTestId("art-desk-inputs").waitFor({ timeout: 60000 });
  return desk;
}

async function quitHub(app) {
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}

const worktree = path.join(dataRoot, "artdesk", branchSlug(branch), "source");
const requestId = `qa-hub-proof-${Date.now().toString(36)}`;
const FIXTURE_ACTOR = { kind: "owner", id: "hub-qa-fixture" };

// Every bench request from the hub's Art Desk view carries the hub token.
const artbench = (desk, method, route, { json, base64, contentType } = {}) =>
  desk.evaluate(
    async ({ method, route, json, base64, contentType }) => {
      let body;
      if (base64 !== undefined)
        body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      else if (json !== undefined) body = JSON.stringify(json);
      const response = await fetch(route, {
        method,
        headers: body
          ? { "Content-Type": contentType ?? "application/json" }
          : {},
        body,
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
    { method, route, json, base64, contentType },
  );

async function showRow(desk) {
  const row = desk.getByTestId(`art-desk-row-${requestId}`);
  const lanes = desk.locator('[data-testid^="art-desk-lane-"]');
  for (let index = 0; index < (await lanes.count()); index += 1) {
    if (await row.isVisible()) break;
    await lanes.nth(index).click();
    await sleep(300);
  }
  await row.click();
}

let candidate = null;

// ---- Session 1: request, import, preview, decision --------------------------
{
  const { app, chrome } = await launchHub();
  const desk = await openArtDesk(app, chrome);
  const pack = await desk
    .getByTestId("art-desk-pack")
    .getAttribute("data-pack-status");
  check("session 1: bench reports the private pack", pack === "verified", pack);

  const unauthenticated = await fetch(
    new URL("/__dev/artbench/state", desk.url()),
  ).then((r) => r.status);
  check(
    "session 1: a caller without the hub token is refused",
    unauthenticated === 401,
    String(unauthenticated),
  );

  const created = await artbench(desk, "POST", "/__dev/artbench/events", {
    json: {
      type: "request.created",
      actor: FIXTURE_ACTOR,
      payload: {
        qa: true,
        request: {
          ...QA_REQUEST,
          requestId,
          priority: "P2",
        },
      },
    },
  });
  check(
    "session 1: disposable request created as a fixture-owner event",
    created.status === 201,
    `${created.status} ${created.text.slice(0, 100)}`,
  );

  const raster = path.join(worktree, RASTER);
  const intake = await artbench(
    desk,
    "PUT",
    `/__dev/artbench/intake?meta=${encodeURIComponent(
      JSON.stringify({ requestId, actor: FIXTURE_ACTOR, note: "hub proof" }),
    )}`,
    {
      base64: readFileSync(raster).toString("base64"),
      contentType: "image/png",
    },
  );
  candidate = intake.json?.candidate ?? null;
  check(
    "session 1: raster imported and decoded at intake",
    intake.status === 201 && Boolean(candidate?.sha256) && candidate.width > 0,
    `${intake.status} ${candidate?.sha256 ?? intake.text.slice(0, 100)}`,
  );

  await desk.reload();
  await desk.getByTestId("art-desk-inputs").waitFor();
  await showRow(desk);
  const state = desk.getByTestId("art-desk-candidate-state");
  await waitFor(
    async () =>
      (await state.getAttribute("data-candidate-bytes")) === "verified" &&
      ((await state.textContent()) ?? "").includes(
        `Recorded hash ${candidate.sha256.slice(0, 12)}`,
      ),
    "verified candidate in the UI",
    30000,
  );
  check("session 1: UI shows the verified hash", true, candidate.sha256);
  const preview = desk.getByTestId("art-desk-candidate-preview");
  const width = await waitFor(
    () => preview.evaluate((img) => img.naturalWidth),
    "decoded preview",
    20000,
  );
  check("session 1: actual decoded preview", width > 0, `${width}px wide`);

  const hex = (c) => c.repeat(64);
  const agentDecision = await artbench(desk, "POST", "/__dev/artbench/events", {
    json: {
      type: "review.decided",
      actor: { kind: "agent", id: "hub-qa-agent" },
      payload: {
        candidateId: candidate.candidateId,
        viewedCandidateId: candidate.candidateId,
        viewedSha256: candidate.sha256,
        decision: "approve",
        fitContractHash: hex("f"),
        sceneContractHash: hex("e"),
        contractVersion: "alive43-art-desk-v1",
      },
    },
  });
  check(
    "session 1: an agent cannot record a decision",
    agentDecision.status === 403,
    String(agentDecision.status),
  );
  const decided = await artbench(desk, "POST", "/__dev/artbench/events", {
    json: {
      type: "review.decided",
      actor: FIXTURE_ACTOR,
      payload: {
        candidateId: candidate.candidateId,
        viewedCandidateId: candidate.candidateId,
        viewedSha256: candidate.sha256,
        decision: "request-revision",
        note: "Hub proof only; not an owner decision.",
        fitContractHash: hex("f"),
        sceneContractHash: hex("e"),
        contractVersion: "alive43-art-desk-v1",
      },
    },
  });
  check(
    "session 1: hash-bound fixture decision accepted",
    decided.status === 201,
    `${decided.status} ${decided.text.slice(0, 100)}`,
  );
  if (shots)
    await desk.screenshot({ path: path.join(shots, "artdesk-session1.png") });
  await quitHub(app);
}

// ---- Session 2: restart, same request, candidate and decision ---------------
{
  const { app, chrome } = await launchHub();
  const desk = await openArtDesk(app, chrome);
  await showRow(desk);
  const state = desk.getByTestId("art-desk-candidate-state");
  await waitFor(
    async () =>
      ((await state.textContent()) ?? "").includes(
        `Recorded hash ${candidate.sha256.slice(0, 12)}`,
      ),
    "same hash after restart",
    30000,
  );
  check(
    "session 2: same candidate hash after restart",
    true,
    candidate.sha256.slice(0, 12),
  );
  const preview = desk.getByTestId("art-desk-candidate-preview");
  const width = await waitFor(
    () => preview.evaluate((img) => img.naturalWidth),
    "decoded preview after restart",
    20000,
  );
  check("session 2: preview decodes after restart", width > 0, `${width}px`);
  const snapshot = await artbench(desk, "GET", "/__dev/artbench/state");
  const text = JSON.stringify(snapshot.json ?? {});
  check(
    "session 2: store still holds the request, candidate and bytes",
    snapshot.status === 200 &&
      text.includes(requestId) &&
      text.includes(candidate.candidateId) &&
      snapshot.json?.bytes?.[candidate.candidateId]?.state === "verified",
    snapshot.json?.bytes?.[candidate.candidateId]?.state ?? "missing",
  );
  const events = await artbench(
    desk,
    "GET",
    "/__dev/artbench/events?sinceSeq=0",
  );
  const ours = JSON.stringify(events.json ?? {}).includes("hub-qa-fixture");
  const decisions = (events.json?.events ?? []).filter(
    (e) =>
      e.type === "review.decided" &&
      e.payload?.candidateId === candidate.candidateId,
  );
  check(
    "session 2: decision persisted, bound to the hash, fixture-authored only",
    ours &&
      decisions.length === 1 &&
      decisions[0].payload.outputSha256 === candidate.sha256 &&
      decisions[0].actor?.id === "hub-qa-fixture",
    `${decisions.length} decision(s)`,
  );
  check(
    "session 2: store lives in the hub record root, outside the worktree",
    existsSync(path.join(dataRoot, "art-records", "ocd", "store.json")),
  );
  if (shots)
    await desk.screenshot({ path: path.join(shots, "artdesk-session2.png") });
  await quitHub(app);
}

console.log(`Isolated hub data: ${dataRoot}`);
if (failures.length) {
  console.error(`${failures.length} Art Desk check(s) failed.`);
  process.exit(1);
}
console.log("Hub Art Desk checks passed.");
