import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";

const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const revision = "a".repeat(40);
const current = {
  revision,
  version: "0.4.0",
  privatePack: { packId: "pack-a" },
};

function state() {
  return {
    architecture: "arm64",
    hubVersion: "0.4.0",
    selectedTrack: "main",
    selectedBuilt: true,
    selectedPresent: true,
    activeTab: "play",
    building: null,
    tracks: {
      main: {
        current,
        currentPresent: true,
        pending: { ...current, revision: "b".repeat(40), version: "0.5.0" },
        label: { kind: "waiting", text: "Update ready" },
      },
    },
    update: {
      kind: "waiting",
      text: "Update ready",
      message: "New build available",
    },
    identities: {
      hub: { revision, signing: "unsigned" },
      game: {
        revision,
        architecture: "arm64",
        clientTreeSha256: "c".repeat(64),
        contentId: "art-a",
      },
      loaded: { title: "Main game", revision },
    },
    log: [],
  };
}

// Run the real renderer and its event handlers with an isolated document/hub.
// This proves labels and callback identity, not native window pixel approval.
async function renderer(file, snapshot) {
  const elements = new Map();
  function element() {
    const events = new Map();
    let text = "";
    let html = null;
    return {
      events,
      children: [],
      attributes: {},
      get textContent() {
        return text;
      },
      set textContent(value) {
        text = String(value);
        html = null;
      },
      get innerHTML() {
        return (
          html ??
          text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
        );
      },
      set innerHTML(value) {
        html = value;
      },
      append(...children) {
        this.children.push(...children);
      },
      replaceChildren(...children) {
        this.children = children;
      },
      setAttribute(key, value) {
        this.attributes[key] = value;
      },
      addEventListener(key, handler) {
        events.set(key, handler);
      },
    };
  }
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const applied = [];
  const hub = {
    onState() {},
    state: async () => snapshot,
    branches: async () => ({
      ok: true,
      chooser: { previews: [], technical: [] },
    }),
    apply: async (id) => {
      applied.push(id);
      return { ok: true };
    },
  };
  runInNewContext(source(file), {
    window: { ocdHub: hub },
    document: {
      getElementById: get,
      createElement: element,
      querySelector: get,
      querySelectorAll: () => [],
    },
  });
  // Initial state and chooser are already-resolved promises.
  await Promise.resolve();
  await Promise.resolve();
  return { get, applied };
}

test("hub header and pending install label omit release numbers but retain build and status", async () => {
  const snapshot = state();
  const before = JSON.stringify(snapshot);
  const view = await renderer("../private-controller/chrome.mjs", snapshot);
  assert.match(view.get("status").innerHTML, /Main game/);
  assert.match(view.get("status").innerHTML, /build aaaaaaaa/);
  assert.match(view.get("status").innerHTML, /Update ready/);
  assert.doesNotMatch(view.get("status").innerHTML, /0\.4\.0|0\.5\.0/);
  assert.match(view.get("status").title, new RegExp(`build ${revision}`));
  assert.match(view.get("status").title, /pack pack-a/);
  assert.equal(view.get("apply").textContent, "Install update");
  assert.equal(view.get("apply").hidden, false);
  assert.equal(
    JSON.stringify(snapshot),
    before,
    "display must not change update versions or build identity",
  );
  await view.get("apply").events.get("click")();
  assert.deepEqual(view.applied, ["main"]);
  assert.equal(view.get("apply").textContent, "Install update");
});

test("same-release update and unavailable payload keep their existing status and controls", async () => {
  const snapshot = state();
  snapshot.tracks.main.pending.version = snapshot.tracks.main.current.version;
  snapshot.tracks.main.currentAbsentReason = "payload missing";
  snapshot.update = { kind: "needs-rebuild", text: "Needs rebuild" };
  const view = await renderer("../private-controller/chrome.mjs", snapshot);
  assert.equal(view.get("apply").textContent, "Install update");
  assert.match(view.get("status").innerHTML, /Needs rebuild/);
  assert.match(view.get("status").innerHTML, /payload missing/);
  assert.doesNotMatch(view.get("status").innerHTML, /0\.4\.0/);
});

test("Settings drops only the hub-version suffix and keeps recorded identities and architecture", async () => {
  const snapshot = state();
  const before = JSON.stringify(snapshot);
  const view = await renderer("../private-controller/settings.mjs", snapshot);
  assert.equal(view.get("arch").textContent, "arm64");
  assert.doesNotMatch(view.get("arch").textContent, /hub|0\.4\.0/);
  assert.match(view.get("id-hub").textContent, new RegExp(revision));
  assert.match(
    view.get("id-game").textContent,
    new RegExp(snapshot.identities.game.clientTreeSha256),
  );
  assert.match(
    view.get("id-game").textContent,
    /arm64.*artwork art-a.*update waiting/,
  );
  assert.match(view.get("id-loaded").textContent, new RegExp(revision));
  assert.equal(view.get("tracks").children.length, 1);
  assert.equal(JSON.stringify(snapshot), before);
});

test("About omits only Release version while preserving composition and staged build identity", () => {
  const main = source("../main.mjs");
  const about = main.slice(
    main.indexOf("function showAbout()"),
    main.indexOf("function createWindow()"),
  );
  const identity = {
    version: "0.4.0",
    revision,
    dirty: true,
    composition: "accepted-main",
    profile: "art-preview",
    clientTreeSha256: "c".repeat(64),
    distribution: "direct",
    channel: "internal",
    stagedAt: "2026-10-04T00:00:00Z",
  };
  let shown;
  runInNewContext(`${about}\nshowAbout();`, {
    identity,
    dialog: {
      showMessageBox: (options) => {
        shown = options;
      },
    },
  });
  assert.equal(shown.message, "Our Civic Duty");
  assert.doesNotMatch(shown.detail, /Release version|0\.4\.0/);
  assert.match(
    shown.detail,
    new RegExp(`Build revision: ${revision} \\(dirty tree\\)`),
  );
  for (const line of [
    "Composition: accepted-main",
    "Build profile: art-preview",
    `Client tree: ${identity.clientTreeSha256}`,
    "Distribution: direct / channel internal",
    `Staged: ${identity.stagedAt}`,
  ])
    assert.ok(shown.detail.includes(line), `missing build identity: ${line}`);
  assert.match(
    main,
    /currentVersion: identity\.version/,
    "the direct updater must still receive the actual release version",
  );
});
