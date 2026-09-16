/* global console, process, setTimeout, fetch */
/**
 * Art Desk inside the packaged private hub, in an isolated data root:
 * import an existing raster for a disposable QA request, see the decoded
 * preview, bind a review to the verified hash, quit, relaunch, and find the
 * same request, candidate hash, preview and review again.
 *
 * The review is written with a fixture author through the bench's bridge.
 * The bench's own decision buttons record the owner as author, so this proof
 * never clicks them: an agent must not fabricate an owner approval.
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
const QA_SIDECAR = "art/generated/candidates/art-desk/qa-requests.json";
const CANDIDATE_SIDECAR = "art/generated/candidates/art-desk/candidates.json";
const REVIEWS = "art/requests/asset-reviews.json";
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

const bridge = (desk, method, file, body, ifMatch) =>
  desk.evaluate(
    async ({ method, file, body, ifMatch }) => {
      const response = await fetch(
        `/__dev/art-desk/file?path=${encodeURIComponent(file)}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(ifMatch ? { "If-Match": ifMatch } : {}),
          },
          body: method === "PUT" ? body : undefined,
        },
      );
      return {
        status: response.status,
        revision: response.headers.get("x-art-desk-revision"),
        text: await response.text(),
      };
    },
    { method, file, body, ifMatch },
  );

async function quitHub(app) {
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}

let hash = null;
const worktree = path.join(dataRoot, "artdesk", branchSlug(branch), "source");
let priorQa = null;
let priorCandidates = null;
let priorReviews = null;

// ---- Session 1: import, preview, review -----------------------------------
{
  const { app, chrome } = await launchHub();
  const desk = await openArtDesk(app, chrome);
  const pack = await desk
    .getByTestId("art-desk-pack")
    .getAttribute("data-pack-status");
  check("session 1: bench reports the private pack", pack === "verified", pack);

  priorQa = await bridge(desk, "GET", QA_SIDECAR);
  priorCandidates = await bridge(desk, "GET", CANDIDATE_SIDECAR);
  priorReviews = await bridge(desk, "GET", REVIEWS);
  const wrote = await bridge(
    desk,
    "PUT",
    QA_SIDECAR,
    JSON.stringify({ documentVersion: 1, requests: [QA_REQUEST] }),
    priorQa.status === 200 ? priorQa.revision : undefined,
  );
  check(
    "session 1: disposable QA request written to the private sidecar",
    wrote.status < 300,
    String(wrote.status),
  );
  await desk.reload();
  await desk.getByTestId("art-desk-inputs").waitFor();
  await desk.getByTestId(`art-desk-row-${QA_ID}`).click();
  const raster = path.join(worktree, RASTER);
  check(
    "session 1: the bench worktree holds the raster to import",
    existsSync(raster),
    raster,
  );
  await desk.getByTestId("art-desk-upload").setInputFiles(raster);
  await desk
    .getByTestId("art-desk-status")
    .filter({ hasText: "Stored candidate" })
    .waitFor({ timeout: 30000 });
  const state = desk.getByTestId("art-desk-candidate-state");
  await waitFor(
    async () =>
      (await state.getAttribute("data-candidate-bytes")) === "verified",
    "verified bytes",
    30000,
  );
  const inputs = await desk.evaluate(() =>
    fetch("/__dev/art-desk/inputs").then((r) => r.json()),
  );
  const candidate = (inputs.candidates ?? []).find(
    (c) => c.requestId === QA_ID,
  );
  hash = candidate?.actualSha256 ?? candidate?.sha256 ?? null;
  check(
    "session 1: imported candidate verified by hash",
    Boolean(hash) && candidate.bytes === "verified",
    hash ?? "none",
  );
  const preview = desk.getByTestId("art-desk-candidate-preview");
  await preview.waitFor();
  const width = await waitFor(
    () => preview.evaluate((img) => img.naturalWidth),
    "decoded preview",
    20000,
  );
  check("session 1: actual decoded preview", width > 0, `${width}px wide`);

  const reviews = await bridge(desk, "GET", REVIEWS);
  const reviewDocument = JSON.parse(reviews.text);
  const review = {
    reviewId: `${QA_ID}-${hash.slice(0, 12)}-hub-fixture`,
    requestId: QA_ID,
    requestVersion: 1,
    outputSha256: hash,
    contractVersion: "alive43-art-desk-v1",
    fitContractHash: "f".repeat(64),
    sceneContractHash: "e".repeat(64),
    decision: "request-revision",
    authorId: "hub-qa-fixture",
    decidedAt: new Date().toISOString(),
    rightsStatus: "unknown",
    sourceDeclaration: "hub QA fixture; not an owner decision",
  };
  const bound = await bridge(
    desk,
    "PUT",
    REVIEWS,
    JSON.stringify({
      ...reviewDocument,
      reviews: [...reviewDocument.reviews, review],
    }),
    reviews.revision,
  );
  check(
    "session 1: hash-bound fixture review accepted at the write boundary",
    bound.status < 300,
    `${bound.status} ${bound.text.slice(0, 120)}`,
  );
  if (shots)
    await desk.screenshot({ path: path.join(shots, "artdesk-session1.png") });
  await quitHub(app);
}

// ---- Session 2: restart, same request, candidate and review ----------------
{
  const { app, chrome } = await launchHub();
  const desk = await openArtDesk(app, chrome);
  // A reviewed request moves to another lane: search, then step through lanes.
  await desk.getByLabel("Search requests").fill(QA_ID);
  const row = desk.getByTestId(`art-desk-row-${QA_ID}`);
  const lanes = desk
    .getByRole("navigation", { name: "Art Desk lanes" })
    .getByRole("button");
  for (let index = 0; index < (await lanes.count()); index += 1) {
    if (await row.isVisible()) break;
    await lanes.nth(index).click();
    await sleep(300);
  }
  await row.click();
  const state = desk.getByTestId("art-desk-candidate-state");
  await waitFor(
    async () =>
      ((await state.textContent()) ?? "").includes(
        `Recorded hash ${hash.slice(0, 12)}`,
      ),
    "same hash after restart",
    30000,
  );
  check(
    "session 2: same candidate hash after restart",
    true,
    hash.slice(0, 12),
  );
  check(
    "session 2: association came back from the private sidecar",
    ((await state.textContent()) ?? "").includes("upload-sidecar"),
  );
  const preview = desk.getByTestId("art-desk-candidate-preview");
  const width = await waitFor(
    () => preview.evaluate((img) => img.naturalWidth),
    "decoded preview after restart",
    20000,
  );
  check(
    "session 2: preview decodes after restart",
    width > 0,
    `${width}px wide`,
  );
  const reviews = JSON.parse((await bridge(desk, "GET", REVIEWS)).text);
  const kept = reviews.reviews.find(
    (r) => r.requestId === QA_ID && r.outputSha256 === hash,
  );
  check(
    "session 2: review still bound to the same hash",
    Boolean(kept),
    kept?.reviewId ?? "missing",
  );
  check(
    "session 2: no owner approval was fabricated",
    !reviews.reviews.some(
      (r) => r.requestId === QA_ID && r.authorId === "lamontae",
    ),
  );
  if (shots)
    await desk.screenshot({ path: path.join(shots, "artdesk-session2.png") });

  if (!args.includes("--keep")) {
    // Leave the isolated bench as it was: restore sidecars and reviews.
    const restore = async (file, prior, empty) => {
      const now = await bridge(desk, "GET", file);
      await bridge(
        desk,
        "PUT",
        file,
        prior?.status === 200 ? prior.text : empty,
        now.status === 200 ? now.revision : undefined,
      );
    };
    await restore(
      QA_SIDECAR,
      priorQa,
      JSON.stringify({ documentVersion: 1, requests: [] }),
    );
    await restore(
      CANDIDATE_SIDECAR,
      priorCandidates,
      JSON.stringify({ documentVersion: 1, candidates: [] }),
    );
    await restore(REVIEWS, priorReviews, null);
  }
  await quitHub(app);
}

console.log(`Isolated hub data: ${dataRoot}`);
if (failures.length) {
  console.error(`${failures.length} Art Desk check(s) failed.`);
  process.exit(1);
}
console.log("Hub Art Desk checks passed.");
