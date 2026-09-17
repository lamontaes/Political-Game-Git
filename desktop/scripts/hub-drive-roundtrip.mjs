/* global console, process, setTimeout, fetch */
/**
 * One real Drive round trip for the Art Desk through the packaged hub, kept
 * inside a dedicated QA exchange folder (never the owner's shared folders):
 *
 *   1. a completed incoming batch (PNG + manifest written last) is dropped in
 *      <qa root>/01_INBOX/<batchId>/ of the Drive-for-desktop mirror;
 *   2. the hub's bench ingests it and shows the candidate in the owner view;
 *   3. an isolated revision and approval (fixture owner actor) are exported
 *      to <qa root>/03_REVIEW_AND_INTEGRATION_EVENTS/<eventId>.json.
 *
 * It writes round-trip.json with the batch id, candidate hash and event ids.
 * Cloud visibility is checked separately through the Drive API; a local
 * mirror file is only "pending cloud transfer" until then.
 *
 * Usage:
 *   node scripts/hub-drive-roundtrip.mjs --hub <exe> --build <app>
 *     --repo <dir> --pack <dir> --branch <name> --qa-root <mirror dir>
 *     --data-root <dir> [--screenshot-dir <dir>]
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { _electron as electron } from "playwright";

import {
  EXCHANGE_FOLDERS,
  readDriveItemId,
} from "../private-controller/drive-exchange.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const [hubExecutable, build, repo, pack, branch, qaRoot, dataRoot] = [
  "--hub",
  "--build",
  "--repo",
  "--pack",
  "--branch",
  "--qa-root",
  "--data-root",
].map(value);
if (
  ![hubExecutable, build, repo, pack, branch, qaRoot, dataRoot].every(Boolean)
) {
  console.error("Missing arguments; see the usage comment.");
  process.exit(2);
}
if (!qaRoot.includes("80_ARTBENCH_EXCHANGE/QA-"))
  throw new Error("Refusing a Drive root that is not a dedicated QA folder.");
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });
for (const child of [
  "01_INBOX",
  "02_CATALOG",
  "03_REVIEW_AND_INTEGRATION_EVENTS",
])
  mkdirSync(path.join(qaRoot, child), { recursive: true });
mkdirSync(dataRoot, { recursive: true });

const requireRoot = createRequire(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);
const { PNG } = requireRoot("pngjs");
const image = new PNG({ width: 64, height: 40 });
for (let i = 0; i < image.data.length; i += 4) {
  image.data[i] = (i * 5) % 256;
  image.data[i + 1] = (i * 11) % 256;
  image.data[i + 2] = 140;
  image.data[i + 3] = 255;
}
const bytes = PNG.sync.write(image);
const sha = createHash("sha256").update(bytes).digest("hex");

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
if (!existsSync(path.join(dataRoot, "state.json")))
  writeFileSync(
    path.join(dataRoot, "state.json"),
    `${JSON.stringify({
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
    })}\n`,
  );
writeFileSync(
  path.join(dataRoot, "settings.json"),
  `${JSON.stringify({
    installId: "hub-drive-roundtrip",
    artDeskBranch: branch,
    artbenchDriveRoot: qaRoot,
    // A dedicated QA exchange is a different set of Drive folders, so the
    // hub's configured identities are overridden with the QA folders' own
    // ids; a QA root with no Drive identity resolves by name and says so.
    artbenchExchangeFolderIds: Object.fromEntries(
      EXCHANGE_FOLDERS.map((folder) => [
        folder.key,
        readDriveItemId(path.join(qaRoot, folder.name)),
      ]).filter(([, id]) => id),
    ),
  })}\n`,
);

const app = await electron.launch({
  executablePath: path.resolve(hubExecutable),
  env: {
    ...process.env,
    OCD_CONTROLLER_DATA_ROOT: dataRoot,
    OCD_HUB_SKIP_STARTUP_CHECK: "1",
    OCD_HUB_NO_BUILDS: "1",
    PG_ARTBENCH_SYNC_MS: "3000",
  },
});
const find = (pattern, label, timeout) =>
  waitFor(
    () => app.windows().find((page) => pattern.test(page.url())),
    label,
    timeout,
  );
const record = {
  qaRoot,
  requestId: `qa-hub-drive-${Date.now().toString(36)}`,
  batchId: `hub-qa-batch-${Date.now().toString(36)}`,
  candidateSha256: sha,
};
try {
  const chrome = await find(/^file:.*\/index\.html$/, "hub chrome");
  const desk = await find(
    /^http:\/\/127\.0\.0\.1:\d+\/art-desk\.html/,
    "Art Desk view",
    15 * 60000,
  );
  await desk.getByTestId("art-desk-inputs").waitFor({ timeout: 60000 });
  const bench = (method, route, json) =>
    desk.evaluate(
      async ({ method, route, json }) => {
        const r = await fetch(route, {
          method,
          cache: "no-store",
          headers: json ? { "Content-Type": "application/json" } : {},
          body: json ? JSON.stringify(json) : undefined,
        });
        const text = await r.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        return { status: r.status, json: parsed, text };
      },
      { method, route, json },
    );
  const ACTOR = { kind: "owner", id: "hub-qa-fixture" };
  const created = await bench("POST", "/__dev/artbench/events", {
    type: "request.created",
    actor: ACTOR,
    payload: {
      qa: true,
      request: {
        requestId: record.requestId,
        requestVersion: 1,
        priority: "P3",
        status: "queued",
        title: "QA hub Drive round trip (disposable)",
        consumer: {
          consumerId: "qa-hub-drive",
          runtimeComponent: "none",
          playerVisibleUse: "Hub Drive round-trip proof only.",
        },
        whyNeeded: "Proves a real Drive exchange through the hub.",
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
        acceptanceCriteria: ["Round trip through Drive."],
        dependsOn: [],
      },
    },
  });
  check("request created in the QA bench", created.status === 201);

  const folder = path.join(qaRoot, "01_INBOX", record.batchId);
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "plate.png"), bytes);
  writeFileSync(
    path.join(folder, "manifest.json"),
    JSON.stringify({
      batchId: record.batchId,
      items: [
        {
          itemId: "plate",
          file: "plate.png",
          requestId: record.requestId,
          worker: "hub-qa-fixture",
          provider: "fixture",
          model: "none",
          promptRef: "none",
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  );
  await bench("POST", "/__dev/artbench/sync");
  const candidate = await waitFor(async () => {
    const state = (await bench("GET", "/__dev/artbench/state")).json;
    const ids = state?.projection?.requests?.[record.requestId]?.candidateIds;
    return ids?.length ? state.projection.candidates[ids[0]] : null;
  }, "batch ingested");
  record.candidateId = candidate.candidateId;
  check(
    "completed incoming batch ingested with the exact bytes",
    candidate.sha256 === sha,
    candidate.candidateId,
  );
  await desk.reload();
  await desk.getByTestId("art-desk-inputs").waitFor();
  await desk.getByLabel("Search requests").fill(record.requestId);
  const row = desk.getByTestId(`art-desk-row-${record.requestId}`);
  const lanes = desk.locator('[data-testid^="art-desk-lane-"]');
  for (let i = 0; i < (await lanes.count()); i += 1) {
    if (await row.isVisible()) break;
    await lanes.nth(i).click();
    await sleep(300);
  }
  check("the batch is visible in the hub's owner view", await row.isVisible());

  const decide = (decision, note) =>
    bench("POST", "/__dev/artbench/events", {
      type: "review.decided",
      actor: ACTOR,
      payload: {
        candidateId: candidate.candidateId,
        viewedCandidateId: candidate.candidateId,
        viewedSha256: candidate.sha256,
        decision,
        note,
        fitContractHash: "f".repeat(64),
        sceneContractHash: "e".repeat(64),
        contractVersion: "alive43-art-desk-v1",
      },
    });
  const revision = await decide(
    "request-revision",
    "Isolated QA revision through the hub (fixture, not the owner).",
  );
  const approval = await decide(
    "approve",
    "Isolated QA approval through the hub (fixture, not the owner).",
  );
  record.revisionEventId = revision.json?.events?.[0]?.eventId;
  record.approvalEventId = approval.json?.events?.[0]?.eventId;
  check(
    "fixture revision and approval recorded",
    revision.status === 201 && approval.status === 201,
    `${record.revisionEventId} ${record.approvalEventId}`,
  );
  const sync = await bench("POST", "/__dev/artbench/sync");
  record.sync = sync.json;
  const exported = [record.revisionEventId, record.approvalEventId].map((id) =>
    path.join(qaRoot, "03_REVIEW_AND_INTEGRATION_EVENTS", `${id}.json`),
  );
  await waitFor(
    () => exported.every((file) => existsSync(file)),
    "event files exported to the mirror",
    30000,
  );
  check("event files written to the local Drive mirror", true);
  record.localExports = exported;
  record.catalog = path.join(qaRoot, "02_CATALOG", "CATALOG.md");
  record.status = "local export written; cloud visibility pending";
  if (shots) {
    await row.click();
    await desk.screenshot({ path: path.join(shots, "drive-roundtrip.png") });
  }
  void chrome;
} finally {
  writeFileSync(
    path.join(dataRoot, "round-trip.json"),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}
console.log(JSON.stringify(record, null, 2));
if (failures.length) process.exit(1);
