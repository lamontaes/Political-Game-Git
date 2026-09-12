import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertCompositionAllowed,
  assertProvenanceMatches,
  defaultComposition,
  hashClientTree,
  provenanceFileName,
} from "../../scripts/client-provenance.mjs";

function aClient(revision, extra = "alpha") {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ocd-client-"));
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(
    path.join(dir, "index.html"),
    "<!doctype html><title>g</title>",
  );
  writeFileSync(
    path.join(dir, "assets", "app.js"),
    `console.log(${JSON.stringify(extra)});`,
  );
  const treeSha256 = hashClientTree(dir);
  writeFileSync(
    path.join(dir, provenanceFileName),
    JSON.stringify({
      sourceRevision: revision,
      dirty: false,
      profile: "production",
      treeSha256,
      stampedAt: "2026-09-12T00:00:00.000Z",
    }),
  );
  return dir;
}

test("default composition is accepted-main only when HEAD is origin/main", () => {
  assert.equal(
    defaultComposition({
      head: "aaa",
      main: "aaa",
      branch: "main",
    }),
    "accepted-main",
  );
  assert.equal(
    defaultComposition({
      head: "bbb",
      main: "aaa",
      branch: "cursor/desktop-client1-continuity-3b75",
    }),
    "working:cursor/desktop-client1-continuity-3b75@bbb",
  );
});

test("accepted-main is refused on an unmerged working tree", () => {
  assert.throws(
    () =>
      assertCompositionAllowed("accepted-main", {
        head: "bbb",
        main: "aaa",
      }),
    /only for a checkout whose HEAD is origin\/main/,
  );
  assert.doesNotThrow(() =>
    assertCompositionAllowed("working:desktop@bbb", {
      head: "bbb",
      main: "aaa",
    }),
  );
});

test("staging detects a compiled tree from a different revision", () => {
  const dir = aClient("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  try {
    assert.throws(
      () =>
        assertProvenanceMatches({
          clientDir: dir,
          expectedRevision: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          expectedDirty: false,
        }),
      /was built from a{8}/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("staging detects bytes that no longer match the stamped tree hash", () => {
  const dir = aClient("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "one");
  try {
    writeFileSync(path.join(dir, "assets", "app.js"), "console.log('two');");
    assert.throws(
      () =>
        assertProvenanceMatches({
          clientDir: dir,
          expectedRevision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          expectedDirty: false,
        }),
      /do not match their provenance hash/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("matching provenance is accepted", () => {
  const dir = aClient("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  try {
    const matched = assertProvenanceMatches({
      clientDir: dir,
      expectedRevision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      expectedDirty: false,
    });
    assert.equal(matched.provenance.profile, "production");
    assert.equal(matched.treeSha256.length, 64);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
