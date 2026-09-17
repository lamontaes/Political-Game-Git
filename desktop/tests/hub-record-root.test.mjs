/* global process */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ArtDeskHost } from "../private-controller/artdesk-host.mjs";

/*
 * POSIX permission bits do not exist on Windows: chmod is a near no-op and
 * the mode a stat reports there says nothing about who can read the records.
 * The structural promise — the hub makes both levels itself — is asserted on
 * every platform; the 0700 promise is asserted where it means something, and
 * says out loud why it is not asserted elsewhere.
 */
const POSIX = process.platform !== "win32";
const WINDOWS_REASON =
  "POSIX modes are not meaningful on win32; record-root confidentiality there needs an ACL check this proof does not make";

function expectPrivateMode(t, directory) {
  if (!POSIX) {
    t.diagnostic(`${WINDOWS_REASON}: ${directory}`);
    return;
  }
  assert.equal(statSync(directory).mode & 0o777, 0o700);
}

test("the hub creates the Art Desk record root itself, 0700 on POSIX", (t) => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "ocd-records-"));
  try {
    const host = new ArtDeskHost({ dataRoot, env: {} });
    const root = host.ensureRecordRoot();
    assert.equal(root, path.join(dataRoot, "art-records", "ocd"));
    assert.ok(statSync(root).isDirectory());
    expectPrivateMode(t, root);
    // Both levels are the hub's, not the first writer's.
    const records = path.join(dataRoot, "art-records");
    assert.ok(statSync(records).isDirectory());
    expectPrivateMode(t, records);
    // Creating it again on a launch is not an error.
    assert.equal(host.ensureRecordRoot(), root);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("a record root an earlier writer left loose is tightened, not trusted", (t) => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "ocd-records-loose-"));
  try {
    const records = path.join(dataRoot, "art-records");
    mkdirSync(path.join(records, "ocd"), { recursive: true });
    chmodSync(records, 0o755);
    chmodSync(path.join(records, "ocd"), 0o755);
    const host = new ArtDeskHost({ dataRoot, env: {} });
    const root = host.ensureRecordRoot();
    expectPrivateMode(t, root);
    expectPrivateMode(t, records);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
