/* global console, process, fetch, window, setTimeout */
/** Real candidate round trip in the packaged client; isolated game profiles.
 * The explicitly supplied existing bench root/exchange receive one labeled QA
 * child. Owner approval events are compared verbatim and never authored here.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { _electron as electron } from "playwright";
const args = process.argv.slice(2);
const arg = (name) => args[args.indexOf(name) + 1];
for (const name of [
  "--hub",
  "--build",
  "--repo",
  "--pack",
  "--data-root",
  "--record-root",
  "--drive-root",
])
  assert(args.includes(name), `Required ${name}`);
const root = path.resolve(arg("--data-root"));
const recordRoot = path.resolve(arg("--record-root"));
const driveRoot = path.resolve(arg("--drive-root"));
const repo = path.resolve(arg("--repo"));
const downloads = path.join(root, "downloads");
mkdirSync(downloads, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const identity = JSON.parse(
  readFileSync(
    path.join(arg("--build"), "Contents/Resources/build-identity.json"),
  ),
);
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repo,
  encoding: "utf8",
}).trim();
const branch = execFileSync("git", ["branch", "--show-current"], {
  cwd: repo,
  encoding: "utf8",
}).trim();
const json = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2));
if (!existsSync(path.join(root, "state.json")))
  json(path.join(root, "state.json"), {
    schema: 2,
    repositoryPath: repo,
    privatePackPath: arg("--pack"),
    selectedTrack: "main",
    tracks: {
      main: {
        branch: "main",
        current: {
          revision: identity.revision,
          appPath: path.resolve(arg("--build")),
          version: identity.version,
          profile: identity.profile,
          architecture: "arm64",
          installedAt: new Date().toISOString(),
          clientTreeSha256: identity.clientTreeSha256,
          privatePack: null,
        },
        pending: null,
        previous: null,
      },
    },
  });
json(path.join(root, "settings.json"), {
  installId: "playtest65-bench-proof",
  artDeskBranch: branch,
  artDeskSource: "local",
  artDeskPin: head,
  artbenchDriveRoot: driveRoot,
});
const wait = async (predicate, label, ms = 120000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const result = await predicate();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out: ${label}`);
};
const events = () =>
  readFileSync(path.join(recordRoot, "events/events.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
const reviewsBefore = events().filter(
  (event) => event.type === "review.decided",
);
const parentId = "cand-bf01adf1-0c1f-10e6-7fd0-cfe659bd3a7a";
const originalId = "cand-18627397-9b4c-eed8-434c-c307c1b0b835";
const deskId = "cand-51191810-44c4-326a-fb42-4808188a9386";
const report = {
  head,
  recordRoot,
  driveRoot,
  checks: [],
  externalBrowserDrop: "not yet observed",
};
let app;
const launch = async () => {
  app = await electron.launch({
    executablePath: path.resolve(arg("--hub")),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: root,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_BUILDS: "1",
      OCD_DOWNLOAD_DIR: downloads,
      PG_ARTBENCH_DATA_ROOT: recordRoot,
      PG_CACHE_DIR: path.join(repo, "test-results/runs/playtest65-u-cache"),
    },
  });
  const chrome = await wait(
    () =>
      app
        .windows()
        .find((p) => /\/private-controller\/index.html/.test(p.url())),
    "client chrome",
  );
  const desk = await wait(
    () => app.windows().find((p) => /\/art-desk.html/.test(p.url())),
    "bench starts",
    180000,
  );
  await desk.getByTestId("art-desk").waitFor({ timeout: 90000 });
  await chrome.getByRole("tab", { name: "Art Desk", exact: true }).click();
  return { chrome, desk };
};
const state = (desk) =>
  desk.evaluate(async () => (await fetch("/__dev/artbench/state")).json());
const view = async (desk, id) => {
  await desk.getByTestId(`art-desk-candidate-${id}`).click();
  await wait(
    () =>
      desk
        .getByTestId("art-desk-viewed")
        .getAttribute("data-candidate-id")
        .then((x) => x === id),
    "exact candidate",
  );
  await wait(
    () =>
      desk
        .getByTestId("art-desk-candidate-preview")
        .getAttribute("data-native-drag")
        .then((x) => x === "ready"),
    "native bytes ready",
  );
};
try {
  let { chrome, desk } = await launch();
  await chrome.locator("#track").waitFor({ state: "attached" });
  assert((await chrome.locator("#track option").count()) > 0);
  await chrome.getByRole("tab", { name: "Play", exact: true }).click();
  assert(
    await wait(
      () => app.windows().find((p) => p.url().startsWith("app://game/")),
      "preserved Play build",
    ),
  );
  report.checks.push("Play and build selector remain available");
  await chrome.getByRole("tab", { name: "Art Desk", exact: true }).click();
  await desk.getByTestId("art-desk-tab-library").click();
  await desk.getByTestId("art-desk-row-playtest65-resolute-desk").click();
  await view(desk, deskId);
  await desk.screenshot({ path: path.join(root, "desk.png") });
  await desk.getByTestId("art-desk-row-playtest65-white-house-opening").click();
  await view(desk, originalId);
  await desk.screenshot({ path: path.join(root, "original.png") });
  await view(desk, parentId);
  await desk.screenshot({ path: path.join(root, "revision.png") });
  const before = await state(desk);
  const parent = before.projection.candidates[parentId];
  assert.equal(parent.width, 1672);
  assert.equal(parent.height, 941);
  const prompt = await desk
    .getByRole("textbox", { name: "Firefly prompt", exact: true })
    .inputValue();
  assert(prompt.length > 0 && prompt.length <= 1024);
  await desk
    .getByRole("button", { name: "Copy Firefly prompt", exact: true })
    .click();
  assert.equal(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
    prompt,
  );
  report.checks.push(
    "real original/edited White House and desk previews; exact Firefly prompt copied",
  );
  await desk.getByTestId("art-desk-download-original").click();
  const saved = await wait(
    () =>
      readdirSync(downloads)
        .map((name) => path.join(downloads, name))
        .find((file) => hash(readFileSync(file)) === parent.sha256),
    "exact revision download",
  );
  report.download = {
    file: saved,
    sha256: hash(readFileSync(saved)),
    width: parent.width,
    height: parent.height,
  };
  // The platform editor performs a deterministic crop of these existing pixels,
  // solely to exercise reimport. It is not a new background generation/admission.
  const childFile = path.join(root, "QA-external-crop.png");
  execFileSync("/usr/bin/sips", [
    "--cropToHeightWidth",
    "900",
    "1600",
    saved,
    "--out",
    childFile,
  ]);
  const childHash = hash(readFileSync(childFile));
  await desk.getByTestId("art-desk-edit-kind").selectOption("crop");
  await desk
    .getByTestId("art-desk-edit-note")
    .fill(
      "QA only — external sips crop for revision round-trip proof; not owner-approved art.",
    );
  await desk.getByTestId("art-desk-upload-edited").setInputFiles(childFile);
  const child = await wait(
    async () =>
      Object.values((await state(desk)).projection.candidates).find(
        (c) => c.parentCandidateId === parentId && c.sha256 === childHash,
      ),
    "child intake",
  );
  assert.equal(child.requestId, parent.requestId);
  assert.equal(child.assetId, parent.assetId);
  assert.deepEqual(child.tags, parent.tags);
  assert.equal(child.nativeDetail, "derived");
  assert(child.calibrationRecheck.length > 0);
  await view(desk, child.candidateId);
  await desk.getByTestId("art-desk-download-original").click();
  await wait(
    () =>
      readdirSync(downloads).some(
        (name) => hash(readFileSync(path.join(downloads, name))) === childHash,
      ),
    "child exact export",
  );
  assert.equal(hash(readFileSync(saved)), parent.sha256);
  await desk.screenshot({ path: path.join(root, "qa-child.png") });
  report.child = child;
  report.checks.push(
    "external child retains request, asset, parent, tags; original download unchanged",
  );
  await desk.getByRole("button", { name: "Sync now", exact: true }).click();
  await wait(() => {
    const catalog = JSON.parse(
      readFileSync(path.join(driveRoot, "02_CATALOG/catalog.json")),
    );
    return catalog.candidates.some(
      (c) =>
        c.candidateId === child.candidateId &&
        c.sha256 === childHash &&
        c.exchangePath,
    );
  }, "real mirror catalog child");
  const exported = path.join(
    driveRoot,
    "02_CATALOG/candidates",
    `${childHash}.png`,
  );
  assert.equal(hash(readFileSync(exported)), childHash);
  report.exchangeFile = exported;
  await app.close();
  app = null;
  ({ chrome, desk } = await launch());
  assert.equal(
    await desk.getByTestId("art-desk-viewed").getAttribute("data-candidate-id"),
    child.candidateId,
  );
  const restarted = (await state(desk)).projection.candidates[
    child.candidateId
  ];
  assert.equal(restarted.parentCandidateId, parentId);
  assert.deepEqual(restarted.tags, parent.tags);
  assert.deepEqual(
    events().filter((event) => event.type === "review.decided"),
    reviewsBefore,
  );
  await view(desk, originalId);
  await desk.reload();
  await wait(
    () =>
      desk
        .getByTestId("art-desk-viewed")
        .getAttribute("data-candidate-id")
        .then((id) => id === originalId),
    "viewed original survives reload despite newer child",
  );
  report.checks.push(
    "restart, reload, lineage, exact viewed revision and all prior approvals preserved",
  );
  report.nativeExport = await desk.evaluate(
    async (subject) => window.ocdArtBench.prepare(subject),
    {
      candidateId: originalId,
      sha256: before.projection.candidates[originalId].sha256,
      revision: before.projection.candidates[originalId].revision,
    },
  );
  json(path.join(root, "result.json"), report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error);
  json(path.join(root, "result.json"), report);
  if (app)
    for (const page of app.windows())
      if (/art-desk.html/.test(page.url()))
        await page
          .screenshot({ path: path.join(root, "failure.png") })
          .catch(() => {});
  throw error;
} finally {
  if (app) await app.close();
}
