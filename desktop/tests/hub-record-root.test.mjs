import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ArtDeskHost } from "../private-controller/artdesk-host.mjs";

test("the hub creates the Art Desk record root itself, 0700", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "ocd-records-"));
  try {
    const host = new ArtDeskHost({ dataRoot, env: {} });
    const root = host.ensureRecordRoot();
    assert.equal(root, path.join(dataRoot, "art-records", "ocd"));
    assert.equal(statSync(root).mode & 0o777, 0o700);
    // Both levels are the hub's, not the first writer's.
    assert.equal(
      statSync(path.join(dataRoot, "art-records")).mode & 0o777,
      0o700,
    );
    // Creating it again on a launch is not an error.
    assert.equal(host.ensureRecordRoot(), root);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
