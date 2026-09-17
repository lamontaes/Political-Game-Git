import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanChecks,
  cleanHubState,
  emptyHubState,
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
    { kind: "failed", text: "Could not check" },
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
