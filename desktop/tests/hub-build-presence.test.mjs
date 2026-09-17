import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import { buildPresentOnDisk } from "../private-controller/private-update.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

/** Writes a payload that looks exactly like a packaged internal build. */
function payload(
  root,
  {
    revision = SHA_A,
    profile = "internal-art-review",
    client = true,
    identity = true,
  } = {},
) {
  const appPath = path.join(root, "Our Civic Duty Internal Art Review.app");
  const resources = path.join(appPath, "Contents", "Resources");
  mkdirSync(resources, { recursive: true });
  if (client) {
    mkdirSync(path.join(resources, "client"), { recursive: true });
    writeFileSync(
      path.join(resources, "client", "index.html"),
      "<!doctype html>\n",
    );
  }
  if (identity)
    writeFileSync(
      path.join(resources, "build-identity.json"),
      `${JSON.stringify({ revision, profile, version: "0.2.0" })}\n`,
    );
  return appPath;
}

const record = (appPath, revision = SHA_A) => ({
  revision,
  appPath,
  version: "0.2.0",
  profile: "internal-art-review",
  architecture: "arm64",
  installedAt: "2026-09-17T00:00:00.000Z",
});

test("a complete payload is present; a deleted or mismatched one is not", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-presence-"));
  try {
    const appPath = payload(root);
    assert.deepEqual(buildPresentOnDisk(record(appPath)), {
      ok: true,
      reason: null,
    });

    // The owner deleted the application the record still names.
    rmSync(appPath, { recursive: true, force: true });
    assert.deepEqual(buildPresentOnDisk(record(appPath)), {
      ok: false,
      reason: "missing-application",
    });

    // Packaged shell, no compiled client.
    const noClient = payload(path.join(root, "no-client"), { client: false });
    assert.equal(buildPresentOnDisk(record(noClient)).reason, "missing-client");

    // No identity, and an unparseable identity, are both unverified.
    const noIdentity = payload(path.join(root, "no-identity"), {
      identity: false,
    });
    assert.equal(
      buildPresentOnDisk(record(noIdentity)).reason,
      "unreadable-identity",
    );
    const broken = payload(path.join(root, "broken"));
    writeFileSync(
      path.join(broken, "Contents", "Resources", "build-identity.json"),
      "{ not json",
    );
    assert.equal(
      buildPresentOnDisk(record(broken)).reason,
      "unreadable-identity",
    );

    // The payload on disk is another revision, or another profile.
    const other = payload(path.join(root, "other"), { revision: SHA_B });
    assert.equal(buildPresentOnDisk(record(other)).reason, "revision-mismatch");
    const publicProfile = payload(path.join(root, "public"), {
      profile: "public",
    });
    assert.equal(
      buildPresentOnDisk(record(publicProfile)).reason,
      "profile-mismatch",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a record that is not a record is never present", () => {
  for (const bad of [null, undefined, "x", {}, { revision: "nope" }])
    assert.equal(buildPresentOnDisk(bad).ok, false);
  assert.equal(
    buildPresentOnDisk({ revision: SHA_A, appPath: "relative/app" }).reason,
    "invalid-record-path",
  );
});

const read = (name) =>
  readFileSync(
    fileURLToPath(new URL(`../private-controller/${name}`, import.meta.url)),
    "utf8",
  );

test("the worker asks the disk before calling a build up to date or waiting", () => {
  const source = read("private-update-worker.mjs");
  assert.match(
    source,
    /pendingMatches =[\s\S]*?buildPresentOnDisk\(existing\.pending\)\.ok/,
  );
  assert.match(
    source,
    /assessment\.action === "none" &&\s*samePack &&\s*buildPresentOnDisk\(existing\?\.current\)\.ok/,
  );
  // The bare existence check it replaced is gone.
  assert.ok(!source.includes("existsSync(existing.pending.appPath)"));
});

test("the hub state reports a missing payload instead of a verified label", () => {
  const source = read("main.mjs");
  assert.match(source, /const present = buildPresentOnDisk\(track\.current\)/);
  assert.match(source, /present: present\.ok,/);
  assert.match(source, /currentPresent: present\.ok,/);
});
