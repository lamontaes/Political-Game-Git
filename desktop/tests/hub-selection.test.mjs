import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

import {
  barPill,
  activatePending,
  cleanChecks,
  cleanHubState,
  createGeneration,
  emptyHubState,
  playLabel,
  prunedQueue,
  recordCheck,
  selectableTrack,
  updateStatus,
  withPending,
} from "../private-controller/hub-model.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const build = (revision) => ({
  revision,
  appPath: `/tmp/hub/${revision}/Our Civic Duty.app`,
  version: "0.2.0",
  profile: "internal-art-review",
  architecture: "arm64",
  installedAt: "2026-09-17T00:00:00.000Z",
  clientTreeSha256: "c".repeat(64),
  privatePack: { packId: "p", manifestSha256: "d".repeat(64) },
});

const OFFLINE_TEXT =
  "Offline — could not reach the project remote; showing the last known-good build";

const mainOnly = () => ({
  ...emptyHubState("/repo"),
  tracks: {
    main: {
      branch: "main",
      current: build(SHA_A),
      pending: null,
      previous: null,
    },
  },
});

test("install then restart does not retain an instruction for a consumed update", () => {
  const check = recordCheck({}, "main", {
    outcome: "waiting",
    at: "2026-09-23T01:37:49.314Z",
    revision: SHA_B,
    message: "Verified and waiting to be activated.",
  }).main;
  const waiting = withPending(mainOnly(), "main", "main", build(SHA_B));
  assert.equal(
    updateStatus({
      check,
      build: waiting.tracks.main.current,
      pending: waiting.tracks.main.pending,
      building: false,
    }).text,
    "Update ready — press Install update",
  );
  const restarted = cleanHubState(
    JSON.parse(JSON.stringify(activatePending(waiting, "main"))),
  );
  assert.equal(restarted.tracks.main.pending, null);
  assert.deepEqual(
    updateStatus({
      check,
      build: restarted.tracks.main.current,
      pending: restarted.tracks.main.pending,
      building: false,
    }),
    { kind: "current", text: "Up to date", detail: "Update installed." },
  );
});

test("a removed pending update cannot offer installation or claim the old build current", () => {
  const status = updateStatus({
    check: { outcome: "waiting", revision: SHA_B },
    build: build(SHA_A),
    pending: null,
    building: false,
  });
  assert.equal(status.kind, "unchecked");
  assert.doesNotMatch(status.text, /Install|Up to date/);
});

test("a real pending payload is installable even before a check is persisted", () => {
  for (const check of [null, { outcome: "up-to-date", revision: SHA_A }]) {
    assert.equal(
      updateStatus({
        check,
        build: build(SHA_A),
        pending: build(SHA_B),
        building: false,
      }).text,
      "Update ready — press Install update",
    );
  }
});

test("installation progress replaces the install instruction while activation runs", () => {
  const status = updateStatus({
    check: { outcome: "waiting", revision: SHA_B },
    build: build(SHA_A),
    pending: build(SHA_B),
    building: false,
    phase: { phase: "installing", message: "Verifying update…" },
  });
  assert.equal(status.text, "Verifying update…");
  assert.equal(status.kind, "preparing");
});

test("an unbuilt branch selection survives a read (the snap-back)", () => {
  const raw = {
    ...mainOnly(),
    selectedTrack: "branch:antigravity/national-legislative-source-corpus",
  };
  const cleaned = cleanHubState(JSON.parse(JSON.stringify(raw)));
  assert.equal(
    cleaned.selectedTrack,
    "branch:antigravity/national-legislative-source-corpus",
  );
  // No build is invented for it.
  assert.equal(
    cleaned.tracks["branch:antigravity/national-legislative-source-corpus"],
    undefined,
  );
  assert.equal(cleaned.tracks.main.current.revision, SHA_A);
});

test("invalid or foreign selections fall back to main", () => {
  for (const bad of [
    "branch:../etc",
    "branch:",
    "tag:v1",
    7,
    null,
    "branch:-x",
  ])
    assert.equal(
      cleanHubState({ ...mainOnly(), selectedTrack: bad }).selectedTrack,
      "main",
    );
  assert.equal(selectableTrack("main"), "main");
});

test("a finishing build does not overwrite a newer selection", () => {
  // The owner picked branch A (building), then branch B before A finished.
  let state = { ...mainOnly(), selectedTrack: "branch:feature/b" };
  // The worker re-reads the latest state and records A's first build.
  const latest = cleanHubState(JSON.parse(JSON.stringify(state)));
  state = withPending(latest, "branch:feature/a", "feature/a", build(SHA_B));
  const after = cleanHubState(JSON.parse(JSON.stringify(state)));
  assert.equal(after.selectedTrack, "branch:feature/b");
  assert.equal(after.tracks["branch:feature/a"].current.revision, SHA_B);
  assert.equal(after.tracks["branch:feature/b"], undefined);
});

test("a failed check keeps the last success and never reads as up to date", () => {
  let checks = recordCheck({}, "main", {
    outcome: "up-to-date",
    at: "2026-09-17T01:00:00.000Z",
    revision: SHA_A,
  });
  checks = recordCheck(checks, "main", {
    outcome: "offline",
    at: "2026-09-17T02:00:00.000Z",
    message: "Offline",
  });
  const check = cleanChecks(JSON.parse(JSON.stringify(checks))).main;
  assert.equal(check.outcome, "offline");
  assert.equal(check.lastSuccessAt, "2026-09-17T01:00:00.000Z");
  assert.equal(check.lastSuccessRevision, SHA_A);
  assert.deepEqual(
    updateStatus({ check, build: build(SHA_A), building: false }),
    { kind: "offline", text: OFFLINE_TEXT, detail: "Offline" },
  );
});

test("a settled offline check outranks a worker still winding down", () => {
  // The worker flag lingers while the process exits. Before this, the bar kept
  // reading "Checking for updates…" after the check had already failed offline.
  const check = cleanChecks(
    recordCheck({}, "main", {
      outcome: "offline",
      at: "2026-09-17T02:00:00.000Z",
      message: "Offline",
    }),
  ).main;
  const status = updateStatus({
    check,
    build: build(SHA_A),
    building: true,
    phase: { phase: "fetching" },
  });
  assert.equal(status.kind, "offline");
  assert.equal(status.text, OFFLINE_TEXT);
  // A genuine in-flight check with nothing recorded still reads as checking.
  assert.equal(
    updateStatus({
      check: null,
      build: build(SHA_A),
      building: true,
      phase: { phase: "fetching" },
    }).kind,
    "checking",
  );
});

test("up to date only when the checked revision is the loaded build", () => {
  const check = cleanChecks(
    recordCheck({}, "main", {
      outcome: "up-to-date",
      at: "2026-09-17T01:00:00.000Z",
      revision: SHA_A,
    }),
  ).main;
  assert.equal(
    updateStatus({ check, build: build(SHA_A), building: false }).kind,
    "current",
  );
  assert.equal(
    updateStatus({ check, build: build(SHA_B), building: false }).kind,
    "ready",
  );
  assert.equal(
    updateStatus({ phase: { phase: "fetching" }, building: true }).kind,
    "checking",
  );
  assert.equal(
    updateStatus({ phase: { phase: "preparing" }, building: true }).kind,
    "preparing",
  );
});

test("checks from hostile files are dropped", () => {
  assert.deepEqual(
    cleanChecks({
      "branch:../x": { outcome: "up-to-date", at: "2026-09-17T01:00:00Z" },
      main: { outcome: "great", at: "2026-09-17T01:00:00Z" },
    }),
    {},
  );
});

test("offline reads differently from a failed check and keeps its message", () => {
  const checks = cleanChecks(
    recordCheck({}, "main", {
      outcome: "offline",
      at: "2026-09-17T02:00:00.000Z",
      message: "Could not reach origin.",
    }),
  );
  const offline = updateStatus({
    check: checks.main,
    build: build(SHA_A),
    building: false,
  });
  assert.equal(offline.kind, "offline");
  assert.match(offline.text, /^Offline/);
  // After a hub restart there is no phase; the persisted message is the text.
  assert.equal(offline.detail, "Could not reach origin.");
  const failed = updateStatus({
    check: cleanChecks(
      recordCheck({}, "main", {
        outcome: "failed",
        at: "2026-09-17T02:00:00.000Z",
        message: "Packaging failed.",
      }),
    ).main,
    build: build(SHA_A),
    building: false,
  });
  assert.equal(failed.kind, "failed");
  assert.equal(failed.text, "Could not check");
  assert.notEqual(failed.text, offline.text);
  assert.equal(failed.detail, "Packaging failed.");
});

test("a build whose payload is gone is never labeled verified", () => {
  const present = playLabel({
    track: "main",
    build: build(SHA_A),
    remoteRevision: SHA_A,
    fetchState: "online",
    present: true,
  });
  assert.equal(present.kind, "latest");
  const absent = playLabel({
    track: "main",
    build: build(SHA_A),
    remoteRevision: SHA_A,
    fetchState: "online",
    present: false,
  });
  assert.equal(absent.kind, "needs-rebuild");
  assert.match(absent.text, /missing from disk/);
});

test("a superseded selection neither opens nor starts a build", async () => {
  const selection = createGeneration();
  const opened = [];
  const started = [];
  // Stands in for openPlay: it awaits, then refuses if the choice moved on.
  const openPlay = async (id, stillWanted) => {
    await delay(id === "slow" ? 25 : 0);
    if (!stillWanted()) return { ok: false, message: "superseded" };
    opened.push(id);
    return { ok: true };
  };
  const select = async (id) => {
    const token = selection.begin();
    const current = () => selection.isCurrent(token);
    const result = await openPlay(id, current);
    if (!current()) return "superseded";
    started.push(id);
    return result.ok ? "opened" : "refused";
  };
  const first = select("slow");
  assert.equal(await select("fast"), "opened");
  assert.equal(await first, "superseded");
  assert.deepEqual(opened, ["fast"]);
  assert.deepEqual(started, ["fast"]);
});

test("a new selection drops queued builds it has moved past", () => {
  const queue = [
    { track: "branch:feature/a" },
    { track: "main" },
    { track: "branch:feature/b" },
  ];
  assert.deepEqual(prunedQueue(queue, "branch:feature/b"), [
    { track: "main" },
    { track: "branch:feature/b" },
  ]);
  assert.deepEqual(prunedQueue(queue, "main"), [{ track: "main" }]);
  assert.deepEqual(prunedQueue([], "main"), []);
});

test("openPlay validates and builds the incoming view before closing any preview", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../private-controller/main.mjs", import.meta.url)),
    "utf8",
  );
  const start = source.indexOf("async function openPlay(");
  const end = source.indexOf("/** Close a Play view", start);
  assert.ok(start > 0 && end > start);
  const body = source.slice(start, end);
  const guard = body.indexOf("buildPresentOnDisk(track.current)");
  const view = body.indexOf("new WebContentsView(");
  const close = body.indexOf("await closePlay(other)");
  const register = body.indexOf("hub.play.set(id");
  assert.ok(guard > 0 && view > 0 && close > 0 && register > 0);
  // A refused payload returns while the previous preview is still on screen.
  assert.ok(guard < close, "the payload guard must precede closing a preview");
  assert.ok(view < close, "the incoming view must exist before a close");
  assert.ok(close < register);
  // selectTrack hands its liveness check down, so a stale open is refused.
  assert.match(source, /openPlay\(id, current\)/);
});

test("a missing payload takes the pill away from a verified reading", () => {
  const status = { kind: "current", text: "Up to date" };
  const present = barPill({
    update: status,
    selectedBuilt: true,
    track: { currentPresent: true, label: { kind: "latest" } },
  });
  assert.deepEqual(present, status);
  const absent = barPill({
    update: status,
    selectedBuilt: true,
    track: { currentPresent: false, currentAbsentReason: "missing-client" },
  });
  assert.equal(absent.kind, "needs-rebuild");
  assert.match(absent.text, /missing from disk/);
  assert.notEqual(absent.text, "Up to date");
  // A track with nothing built yet keeps the check's own reading.
  assert.deepEqual(
    barPill({
      update: status,
      selectedBuilt: false,
      track: { currentPresent: false },
    }),
    status,
  );
});

test("the hub resolves the pill and marks a superseded selection", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../private-controller/main.mjs", import.meta.url)),
    "utf8",
  );
  // publicState must hand the renderer an already-resolved pill.
  assert.match(source, /barPill\(\{\s*update: status/);
  // A superseded selection is flagged so no renderer paints it as a failure.
  assert.match(source, /superseded: true/);
  const chrome = readFileSync(
    fileURLToPath(new URL("../private-controller/chrome.mjs", import.meta.url)),
    "utf8",
  );
  assert.match(chrome, /token !== selectRequest \|\| result\?\.superseded/);
  // The renderer paints the pill it was given; it does not re-derive one.
  assert.ok(!/pill needs-rebuild/.test(chrome));
});

test("a checked newer source is not advertised as an installed update", () => {
  const checks = recordCheck({}, "preview", {
    outcome: "source-available",
    at: "2026-09-20T17:00:00Z",
    revision: SHA_B,
    message: "Awaiting verified preparation.",
  });
  const status = updateStatus({
    check: checks.preview,
    build: build(SHA_A),
    building: false,
  });
  assert.equal(status.text, "New version available · awaiting preparation");
  assert.equal(status.kind, "waiting");
  assert.equal(checks.preview.lastSuccessRevision, SHA_B);
});

test("the private hub checks for updates only at start and on request", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../private-controller/main.mjs", import.meta.url)),
    "utf8",
  );
  // No interval timer and no check on window focus: each check can compile a
  // whole build, which stalls the game.
  assert.ok(!source.includes("AUTO_UPDATE_INTERVAL_MS"));
  assert.ok(!source.includes("scheduleAutomaticUpdateCheck"));
  assert.ok(!source.includes("reconcileOnForeground"));
  assert.ok(!source.includes('win.on("focus"'));
  // Startup still checks main and the selection; the button still checks.
  assert.match(source, /startWorker\(MAIN_TRACK, false, true\);/);
  assert.match(
    source,
    /handle\("hub:check-updates", \(\) => \{[\s\S]*?startWorker\(/,
  );
  // A verified update never replaces an open game on its own.
  assert.ok(!source.includes("activateAtIdleTitle"));
  assert.ok(!source.includes("game:title-ready"));
  // Full content verification runs for startup, manual and receiver checks.
  assert.match(source, /receivedFirst \? \["--received-first"\] : \[\]/);
  // A verified runtime-content build does not need an obsolete private pack
  // merely to discover and compile a code-only successor.
  assert.match(source, /!packPath && !usesRuntimeContent/);
});
