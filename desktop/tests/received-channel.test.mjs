/* global Buffer, process */
import test from "node:test";
import { execFileSync } from "node:child_process";
import { leaseUpdateWorkspace } from "../private-controller/update-workspace.mjs";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { URL } from "node:url";
import {
  contentHash,
  receiveContent,
  CONTENT_SCHEMA,
  CONTENT_CAPABILITY,
} from "../runtime-content.mjs";
import {
  publishReceivedChannel,
  reconcileReceivedChannel,
} from "../private-controller/received-channel.mjs";
import { hashClientTree } from "../../scripts/client-provenance.mjs";
import { activatePending } from "../private-controller/hub-model.mjs";
function fixture(t) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "client65-channel-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const revision = "a".repeat(40),
    track = "branch:example",
    appPath = path.join(dataRoot, "versions/a/Game.app"),
    client = appPath + "/Contents/Resources/client";
  mkdirSync(client, { recursive: true });
  writeFileSync(client + "/index.html", "<p>game</p>");
  const clientTreeSha256 = hashClientTree(client);
  writeFileSync(
    client + "/.build-provenance.json",
    JSON.stringify({
      sourceRevision: revision,
      dirty: false,
      profile: "internal-art-review",
      treeSha256: clientTreeSha256,
      runtimeArtCapability: CONTENT_CAPABILITY,
    }),
  );
  writeFileSync(
    appPath + "/Contents/Resources/build-identity.json",
    JSON.stringify({ revision, profile: "internal-art-review" }),
  );
  const build = {
    revision,
    appPath,
    clientTreeSha256,
    profile: "internal-art-review",
    preparedLocally: true,
  };
  const state = {
    schema: 2,
    repositoryPath: "/unchanged",
    selectedTrack: track,
    tracks: {
      [track]: {
        branch: "example",
        current: build,
        pending: null,
        previous: null,
      },
    },
  };
  const save = (v) =>
    writeFileSync(dataRoot + "/state.json", JSON.stringify(v));
  save(state);
  mkdirSync(dataRoot + "/input/art", { recursive: true });
  const bytes = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
  );
  writeFileSync(dataRoot + "/input/art/a.svg", bytes);
  const manifest = {
    schema: CONTENT_SCHEMA,
    capability: CONTENT_CAPABILITY,
    files: [
      {
        path: "art/a.svg",
        sha256: contentHash(bytes),
        bytes: bytes.length,
        mime: "image/svg+xml",
      },
    ],
    metadata: {},
  };
  const content = () => {
    writeFileSync(dataRoot + "/input/manifest.json", JSON.stringify(manifest));
    return receiveContent({
      sourceRoot: dataRoot + "/input",
      manifestPath: "manifest.json",
      cacheRoot: dataRoot + "/content",
    });
  };
  return {
    dataRoot,
    build,
    track,
    manifest,
    content,
    state,
    save,
    read: () => JSON.parse(readFileSync(dataRoot + "/state.json")),
  };
}
test("same code / new content becomes pending and repeated checks converge", (t) => {
  const f = fixture(t),
    snapshot = f.content();
  publishReceivedChannel({ ...f, build: { ...f.build, content: snapshot } });
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "pending",
  );
  assert.equal(f.read().tracks[f.track].current.content, undefined);
  assert.equal(
    f.read().tracks[f.track].pending.clientTreeSha256,
    f.build.clientTreeSha256,
  );
  const pending = readFileSync(f.dataRoot + "/state.json");
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "pending",
  );
  assert.ok(readFileSync(f.dataRoot + "/state.json").equals(pending));
  f.save(activatePending(f.read(), f.track));
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "up-to-date",
  );
  f.manifest.metadata["art/manifest/test.json"] = { label: "additional data" };
  const revised = f.content();
  assert.equal(revised.changedBytes, 0);
  publishReceivedChannel({ ...f, build: { ...f.build, content: revised } });
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "pending",
  );
  assert.equal(f.read().tracks[f.track].current.content.id, snapshot.id);
});
test("pinned selection and rejected dependencies preserve state", (t) => {
  const f = fixture(t);
  f.state.tracks[f.track].pinned = true;
  f.save(f.state);
  const before = readFileSync(f.dataRoot + "/state.json");
  publishReceivedChannel({ ...f, build: { ...f.build, content: f.content() } });
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "kept-local",
  );
  assert.ok(readFileSync(f.dataRoot + "/state.json").equals(before));
  assert.throws(
    () =>
      publishReceivedChannel({
        ...f,
        build: { ...f.build, content: { ...f.content(), cacheRoot: tmpdir() } },
      }),
    /wrong root/,
  );
  assert.ok(readFileSync(f.dataRoot + "/state.json").equals(before));
});
test("code-only successor reuses the exact content snapshot", (t) => {
  const f = fixture(t),
    content = f.content();
  const revision = "b".repeat(40),
    appPath = f.dataRoot + "/versions/b/Game.app",
    client = appPath + "/Contents/Resources/client";
  mkdirSync(client, { recursive: true });
  writeFileSync(client + "/index.html", "<p>changed code</p>");
  const clientTreeSha256 = hashClientTree(client);
  writeFileSync(
    client + "/.build-provenance.json",
    JSON.stringify({
      sourceRevision: revision,
      dirty: false,
      profile: "internal-art-review",
      treeSha256: clientTreeSha256,
      runtimeArtCapability: CONTENT_CAPABILITY,
    }),
  );
  writeFileSync(
    appPath + "/Contents/Resources/build-identity.json",
    JSON.stringify({ revision, profile: "internal-art-review" }),
  );
  publishReceivedChannel({
    ...f,
    build: { ...f.build, revision, appPath, clientTreeSha256, content },
  });
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "pending",
  );
  assert.equal(f.read().tracks[f.track].pending.content.id, content.id);
  assert.equal(f.content().changedBytes, 0);
});
test("code-only successor cannot replace a concurrently changed current build", (t) => {
  const f = fixture(t),
    content = f.content();
  publishReceivedChannel({
    ...f,
    build: { ...f.build, content },
    base: {
      revision: f.build.revision,
      clientTreeSha256: f.build.clientTreeSha256,
      contentId: null,
    },
  });
  const changed = f.read();
  changed.tracks[f.track].current = {
    ...changed.tracks[f.track].current,
    revision: "c".repeat(40),
  };
  f.save(changed);
  const before = readFileSync(f.dataRoot + "/state.json");
  assert.equal(
    reconcileReceivedChannel(f.dataRoot, f.track).outcome,
    "superseded",
  );
  assert.ok(readFileSync(f.dataRoot + "/state.json").equals(before));
});

test("channel publication nests under its updater lease and refuses a competing process", (t) => {
  const f = fixture(t),
    build = { ...f.build, content: f.content() };
  const release = leaseUpdateWorkspace(f.dataRoot);
  try {
    const module = new URL(
      "../private-controller/received-channel.mjs",
      import.meta.url,
    ).href;
    const source = `import {publishReceivedChannel} from ${JSON.stringify(module)}; try { publishReceivedChannel(${JSON.stringify({ dataRoot: f.dataRoot, track: f.track, build })}); process.exitCode=9; } catch(error) { if(!error.message.includes("Another update")) throw error; }`;
    execFileSync(process.execPath, ["--input-type=module", "-e", source], {
      stdio: "pipe",
    });
    publishReceivedChannel({ ...f, build });
    assert.equal(
      reconcileReceivedChannel(f.dataRoot, f.track).outcome,
      "pending",
    );
  } finally {
    release();
  }
});
