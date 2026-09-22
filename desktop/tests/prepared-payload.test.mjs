import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashClientTree } from "../../scripts/client-provenance.mjs";
import { installPreparedPayload } from "../private-controller/prepared-payload.mjs";
import { emptyHubState } from "../private-controller/hub-model.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ocd-prepared-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const stagedRoot = path.join(root, "staged");
  const client = path.join(stagedRoot, "client");
  mkdirSync(client, { recursive: true });
  writeFileSync(
    path.join(client, "index.html"),
    "<title>Private fixture</title>",
  );
  const revision = "a".repeat(40);
  const hash = hashClientTree(client);
  writeFileSync(
    path.join(client, ".build-provenance.json"),
    JSON.stringify({
      sourceRevision: revision,
      treeSha256: hash,
      dirty: false,
      profile: "internal-art-review",
    }),
  );
  writeFileSync(
    path.join(stagedRoot, "build-identity.json"),
    JSON.stringify({
      revision,
      clientTreeSha256: hash,
      dirty: false,
      profile: "internal-art-review",
    }),
  );
  const dataRoot = path.join(root, "console");
  mkdirSync(dataRoot);
  const state = {
    ...emptyHubState("/repo"),
    privatePackPath: "/old-owner-pack",
    tracks: {
      main: {
        branch: "main",
        current: {
          revision: "b".repeat(40),
          appPath: "/old-owner-app",
          profile: "internal-art-review",
        },
        pending: null,
        previous: null,
      },
    },
  };
  const statePath = path.join(dataRoot, "state.json");
  writeFileSync(statePath, JSON.stringify(state));
  return {
    stagedRoot,
    dataRoot,
    repositoryPath: "/repo",
    branch: "codex/fixture",
    revision,
    privatePack: { packId: "fixture", manifestSha256: "c".repeat(64) },
    statePath,
    client,
  };
}

test("prepared payload preserves main, backup, pack and isolated preview identity", (t) => {
  const f = fixture(t);
  const before = readFileSync(f.statePath);
  const result = installPreparedPayload(f);
  const state = JSON.parse(readFileSync(f.statePath));
  assert.equal(state.tracks.main.current.revision, "b".repeat(40));
  assert.equal(state.privatePackPath, "/old-owner-pack");
  assert.equal(state.selectedTrack, "branch:codex/fixture");
  assert.equal(state.tracks[state.selectedTrack].current.revision, f.revision);
  assert.deepEqual(readFileSync(result.backup), before);
  assert.throws(() => installPreparedPayload(f), /already exists/);
});

test("corrupt client bytes leave the selected build and state unchanged", (t) => {
  const f = fixture(t);
  const before = readFileSync(f.statePath);
  writeFileSync(path.join(f.client, "index.html"), "changed after provenance");
  assert.throws(() => installPreparedPayload(f), /provenance hash/);
  assert.deepEqual(readFileSync(f.statePath), before);
});

test("concurrent console state update refuses registration", (t) => {
  const f = fixture(t);
  const changed = JSON.stringify({
    ...emptyHubState("/repo"),
    privatePackPath: "/new-owner-pack",
  });
  assert.throws(
    () =>
      installPreparedPayload({
        ...f,
        beforeRegister: () => writeFileSync(f.statePath, changed),
      }),
    /state changed/,
  );
  assert.equal(readFileSync(f.statePath, "utf8"), changed);
});
