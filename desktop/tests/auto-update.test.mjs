import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runUpdateCheck,
  updateActivation,
  updateConfigForBuild,
} from "../updater.mjs";

const stableConfig = updateConfigForBuild({
  channel: "stable",
  distribution: "direct",
  feedURL: "https://updates.example.test/desktop",
  signingConfigured: true,
});

function setup({
  channel = "stable",
  updateInfo = { version: "0.3.0", channel: "stable" },
  downloadError = null,
  installChoice = 1,
  closes = true,
} = {}) {
  const state = {
    downloads: 0,
    prompts: 0,
    notices: [],
    installOnQuit: false,
    installs: 0,
  };
  const updater = {
    async checkForUpdates() {
      return { updateInfo };
    },
    async downloadUpdate() {
      state.downloads += 1;
      if (downloadError) throw downloadError;
    },
    setAutoInstallOnAppQuit(value) {
      state.installOnQuit = value;
    },
    quitAndInstall() {
      state.installs += 1;
    },
  };
  return {
    state,
    deps: {
      activation: updateActivation(stableConfig, {
        distribution: "direct",
        channel,
      }),
      channel,
      currentVersion: "0.2.0",
      loadUpdater: async () => updater,
      ask: async () => {
        state.prompts += 1;
        return installChoice;
      },
      notify: async (...notice) => state.notices.push(notice),
      closeAllWindows: async () => closes,
    },
  };
}

test("stable config requires HTTPS, direct distribution and signing material", () => {
  assert.deepEqual(stableConfig, {
    enabled: true,
    channel: "stable",
    feedURL: "https://updates.example.test/desktop",
  });
  assert.deepEqual(
    updateConfigForBuild({
      channel: "stable",
      distribution: "direct",
      feedURL: "https://updates.example.test/desktop",
    }),
    { enabled: false, channel: "stable", feedURL: null },
  );
  assert.deepEqual(
    updateConfigForBuild({
      channel: "stable",
      distribution: "steam",
      feedURL: "https://updates.example.test/desktop",
      signingConfigured: true,
    }),
    { enabled: false, channel: "stable", feedURL: null },
  );
  assert.equal(
    updateConfigForBuild({
      channel: "stable",
      distribution: "direct",
      feedURL: "http://updates.example.test/desktop",
      signingConfigured: true,
    }).enabled,
    false,
  );
});

test("stable install requires a player confirmation and stays off auto-install", async () => {
  const { deps, state } = setup();

  assert.equal(await runUpdateCheck(deps), "stable-installing");
  assert.equal(state.downloads, 1);
  assert.equal(state.prompts, 1);
  assert.equal(state.installOnQuit, false);
  assert.equal(state.installs, 1);
});

test("stable deferral never arms installation on quit", async () => {
  const { deps, state } = setup({ installChoice: 0 });
  assert.equal(await runUpdateCheck(deps), "stable-player-deferred");
  assert.equal(state.downloads, 1);
  assert.equal(state.installs, 0);
  assert.equal(state.installOnQuit, false);
  assert.match(state.notices[0][0], /ready when you are/);
});

test("stable install confirmation cannot interrupt a window that will not close", async () => {
  const { deps, state } = setup({ closes: false });
  assert.equal(await runUpdateCheck(deps), "stable-install-blocked");
  assert.equal(state.installs, 0);
  assert.equal(state.installOnQuit, false);
});

test("stable download failure keeps the current install and reports the error", async () => {
  const { deps, state } = setup({
    downloadError: new Error("signature verification failed"),
  });

  assert.equal(await runUpdateCheck(deps), "download-failed");
  assert.equal(state.installOnQuit, false);
  assert.match(state.notices[0][1], /signature verification failed/);
  assert.match(state.notices[0][1], /Nothing was installed/);
});

test("stable channel refuses a downgrade before enabling installation", async () => {
  const { deps, state } = setup({
    updateInfo: { version: "0.1.0", channel: "stable" },
  });

  assert.equal(await runUpdateCheck(deps), "refused-downgrade");
  assert.equal(state.downloads, 0);
  assert.equal(state.installOnQuit, false);
});

test("internal channel retains its ask-first update selector", async () => {
  const config = {
    enabled: true,
    channel: "internal",
    feedURL: "https://updates.example.test/internal",
  };
  const state = { prompts: 0, downloads: 0 };
  const deps = {
    activation: updateActivation(config, {
      distribution: "direct",
      channel: "internal",
    }),
    channel: "internal",
    currentVersion: "0.2.0",
    loadUpdater: async () => ({
      checkForUpdates: async () => ({
        updateInfo: { version: "0.3.0", channel: "internal" },
      }),
      downloadUpdate: async () => {
        state.downloads += 1;
      },
      setAutoInstallOnAppQuit: () => {},
    }),
    ask: async () => {
      state.prompts += 1;
      return 1;
    },
    notify: async () => {},
    closeAllWindows: async () => true,
  };

  assert.equal(await runUpdateCheck(deps), "declined");
  assert.equal(state.prompts, 1);
  assert.equal(state.downloads, 0);
});
