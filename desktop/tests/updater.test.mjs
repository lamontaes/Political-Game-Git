/**
 * Deterministic proof of the direct-update contract (desktop/updater.mjs).
 *
 * Every scenario runs against fakes: this proves the updater LOGIC —
 * activation gates, refusal of malformed/untrusted/downgrade candidates,
 * failure surfacing, and the player-controlled install choices. It is NOT
 * signed Mac automatic-installation proof; that remains unverified until
 * signing credentials exist.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessCandidate,
  compareVersions,
  runUpdateCheck,
  updateActivation,
} from "../updater.mjs";

const directIdentity = { distribution: "direct" };
const enabled = {
  enabled: true,
  channel: "internal",
  feedURL: "https://example.invalid/feed",
};

function deps({
  activation = updateActivation(enabled, directIdentity),
  updateInfo = { version: "0.9.9", channel: "internal" },
  checkError = null,
  downloadError = null,
  answers = [],
  allClosed = true,
} = {}) {
  const record = {
    notices: [],
    questions: [],
    downloads: 0,
    installedNow: 0,
    autoInstallOnAppQuit: false,
    closeRequested: 0,
  };
  const updater = {
    async checkForUpdates() {
      if (checkError) throw checkError;
      return { updateInfo };
    },
    async downloadUpdate() {
      record.downloads += 1;
      if (downloadError) throw downloadError;
    },
    quitAndInstall() {
      record.installedNow += 1;
    },
    setAutoInstallOnAppQuit(value) {
      record.autoInstallOnAppQuit = value;
    },
  };
  const queue = [...answers];
  return {
    record,
    deps: {
      activation,
      currentVersion: "0.2.0",
      channel: "internal",
      loadUpdater: async () => updater,
      ask: async (message, detail, buttons) => {
        record.questions.push({ message, buttons });
        return queue.shift() ?? 1;
      },
      notify: async (message, detail) => {
        record.notices.push({ message, detail });
      },
      closeAllWindows: async () => {
        record.closeRequested += 1;
        return allClosed;
      },
    },
  };
}

test("activation: disabled and unconfigured direct builds never activate", () => {
  assert.deepEqual(
    updateActivation({ enabled: false, feedURL: null }, directIdentity),
    { active: false, reason: "disabled" },
  );
  assert.deepEqual(
    updateActivation({ enabled: true, feedURL: null }, directIdentity),
    {
      active: false,
      reason: "no-feed",
    },
  );
  assert.deepEqual(
    updateActivation(
      { enabled: true, feedURL: "http://plain.invalid" },
      directIdentity,
    ),
    { active: false, reason: "insecure-feed" },
  );
});

test("activation: Steam distribution hard-disables even a fully configured feed", () => {
  assert.deepEqual(updateActivation(enabled, { distribution: "steam" }), {
    active: false,
    reason: "steam",
  });
});

test("flow: unconfigured build reports the truth and touches nothing", async () => {
  const { record, deps: d } = deps({
    activation: updateActivation(
      { enabled: false, feedURL: null },
      directIdentity,
    ),
  });
  assert.equal(await runUpdateCheck(d), "not-configured");
  assert.equal(record.downloads, 0);
  assert.equal(record.installedNow, 0);
  assert.match(record.notices[0].message, /not configured/);
});

test("flow: Steam build reports Steam-managed delivery", async () => {
  const { record, deps: d } = deps({
    activation: updateActivation(enabled, { distribution: "steam" }),
  });
  assert.equal(await runUpdateCheck(d), "steam-disabled");
  assert.match(record.notices[0].detail, /Steam delivers updates/);
  assert.equal(record.downloads, 0);
});

test("flow: malformed metadata surfaces as a failed check, no download", async () => {
  const { record, deps: d } = deps({
    checkError: new Error("Unable to parse latest.yml"),
  });
  assert.equal(await runUpdateCheck(d), "metadata-error");
  assert.equal(record.downloads, 0);
  assert.equal(record.installedNow, 0);
  assert.match(record.notices[0].detail, /Unable to parse/);
});

test("candidate: unparseable version in metadata is refused, not offered", async () => {
  const { record, deps: d } = deps({
    updateInfo: { version: "not-a-version" },
  });
  assert.equal(await runUpdateCheck(d), "refused-malformed-metadata");
  assert.equal(record.questions.length, 0);
  assert.equal(record.downloads, 0);
});

test("candidate: wrong channel is refused before any dialog offers it", async () => {
  const { record, deps: d } = deps({
    updateInfo: { version: "0.9.9", channel: "stable" },
  });
  assert.equal(await runUpdateCheck(d), "refused-untrusted-channel");
  assert.equal(record.questions.length, 0);
  assert.equal(record.downloads, 0);
  assert.match(record.notices[0].detail, /internal channel/);
});

test("candidate: an older candidate is refused as a downgrade", async () => {
  const { record, deps: d } = deps({
    updateInfo: { version: "0.1.9", channel: "internal" },
  });
  assert.equal(await runUpdateCheck(d), "refused-downgrade");
  assert.equal(record.downloads, 0);
  assert.match(record.notices[0].detail, /not newer/);
});

test("candidate: equal version means up to date", async () => {
  const { deps: d } = deps({
    updateInfo: { version: "0.2.0", channel: "internal" },
  });
  assert.equal(await runUpdateCheck(d), "up-to-date");
});

test("candidate: a prerelease of the current version is a downgrade", () => {
  assert.deepEqual(
    assessCandidate({
      currentVersion: "0.2.0",
      channel: "internal",
      updateInfo: { version: "0.2.0-rc.1" },
    }),
    { action: "refuse", reason: "downgrade" },
  );
});

test("flow: failed or partial download is surfaced and installs nothing", async () => {
  const { record, deps: d } = deps({
    answers: [0],
    downloadError: new Error("net::ERR_CONNECTION_RESET at byte 51234"),
  });
  assert.equal(await runUpdateCheck(d), "download-failed");
  assert.equal(record.installedNow, 0);
  assert.equal(record.autoInstallOnAppQuit, false);
  assert.match(record.notices[0].detail, /Nothing was installed/);
});

test("flow: package verification failure travels the same refusing path", async () => {
  const { record, deps: d } = deps({
    answers: [0],
    downloadError: new Error("sha512 checksum mismatch for Our Civic Duty.zip"),
  });
  assert.equal(await runUpdateCheck(d), "download-failed");
  assert.equal(record.installedNow, 0);
  assert.match(record.notices[0].detail, /sha512 checksum mismatch/);
});

test("choice: Not now downloads nothing and changes nothing", async () => {
  const { record, deps: d } = deps({ answers: [1] });
  assert.equal(await runUpdateCheck(d), "declined");
  assert.equal(record.downloads, 0);
  assert.equal(record.autoInstallOnAppQuit, false);
});

test("choice: Later downloads, then defers install to the player's own quit", async () => {
  const { record, deps: d } = deps({ answers: [0, 1] });
  assert.equal(await runUpdateCheck(d), "deferred-to-quit");
  assert.equal(record.downloads, 1);
  assert.equal(record.installedNow, 0);
  // The dialog's promise — "installs the next time you quit" — is made
  // true here rather than merely said.
  assert.equal(record.autoInstallOnAppQuit, true);
});

test("choice: Restart and install closes windows first, then installs", async () => {
  const { record, deps: d } = deps({ answers: [0, 0] });
  assert.equal(await runUpdateCheck(d), "installing");
  assert.equal(record.closeRequested, 1);
  assert.equal(record.installedNow, 1);
});

test("choice: a window that refuses to close blocks the restart and defers instead", async () => {
  const { record, deps: d } = deps({ answers: [0, 0], allClosed: false });
  assert.equal(await runUpdateCheck(d), "install-blocked-deferred");
  assert.equal(record.installedNow, 0);
  assert.equal(record.autoInstallOnAppQuit, true);
  assert.match(record.notices[0].detail, /nothing was interrupted/);
});

test("compareVersions orders releases and prereleases correctly", () => {
  assert.equal(compareVersions("0.2.0", "0.3.0"), -1);
  assert.equal(compareVersions("0.3.0", "0.3.0-rc.1"), 1);
  assert.equal(compareVersions("0.3.0-rc.1", "0.3.0-rc.2"), -1);
  assert.equal(compareVersions("0.3.0-2", "0.3.0-10"), -1);
  assert.equal(compareVersions("garbage", "0.3.0"), null);
});
