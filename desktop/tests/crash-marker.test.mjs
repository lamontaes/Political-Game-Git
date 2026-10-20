import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { markCleanQuit, takePreviousCrash } from "../crash-marker.mjs";

const folder = () =>
  path.join(mkdtempSync(path.join(tmpdir(), "ocd-crash-")), "data");

test("a first start is not a crash", () => {
  assert.equal(takePreviousCrash(folder()), false);
});

test("a clean quit leaves nothing to report at the next start", () => {
  const dir = folder();
  takePreviousCrash(dir);
  markCleanQuit(dir);
  assert.equal(existsSync(path.join(dir, "running.marker")), false);
  assert.equal(takePreviousCrash(dir), false);
});

test("a run that never quit cleanly is reported once, at the next start", () => {
  const dir = folder();
  takePreviousCrash(dir);
  assert.equal(takePreviousCrash(dir), true);
  // That start was clean: the prompt is not offered again.
  markCleanQuit(dir);
  assert.equal(takePreviousCrash(dir), false);
});
