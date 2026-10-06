import assert from "node:assert/strict";
import test from "node:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  macAppBundleFromExecutable,
  markMacUpdateReady,
  noteMacUpdateStart,
  prepareMacUpdateRetention,
} from "../update-retention.mjs";

function fixture(t) {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "ocd-mac-retention-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const appDataPath = path.join(root, "Application Support");
  mkdirSync(appDataPath);
  const appBundlePath = path.join(root, "Our Civic Duty.app");
  const writeBuild = (bundle, version) => {
    const resources = path.join(bundle, "Contents/Resources");
    mkdirSync(resources, { recursive: true });
    writeFileSync(
      path.join(resources, "build-identity.json"),
      JSON.stringify({ version }),
    );
    writeFileSync(path.join(resources, "payload"), version);
  };
  writeBuild(appBundlePath, "1.0.0");
  return { root, appDataPath, appBundlePath, writeBuild };
}

function replaceBuild(f, version) {
  rmSync(f.appBundlePath, { recursive: true, force: true });
  f.writeBuild(f.appBundlePath, version);
}

test("keeps one prior app and restores it after two starts without title readiness", (t) => {
  const f = fixture(t);
  const retained = prepareMacUpdateRetention({
    ...f,
    nextVersion: "2.0.0",
  });
  assert.equal(retained.previousVersion, "1.0.0");
  replaceBuild(f, "2.0.0");
  assert.deepEqual(noteMacUpdateStart(f), {
    action: "pending",
    failedStarts: 1,
  });
  assert.deepEqual(noteMacUpdateStart(f), {
    action: "rollback-restored",
    previousVersion: "1.0.0",
  });
  assert.equal(
    JSON.parse(
      readFileSync(
        path.join(f.appBundlePath, "Contents/Resources/build-identity.json"),
        "utf8",
      ),
    ).version,
    "1.0.0",
  );
  assert.deepEqual(noteMacUpdateStart(f), {
    action: "rollback-complete",
    previousVersion: "1.0.0",
  });
  assert.deepEqual(markMacUpdateReady(f), {
    action: "rollback-notice",
    previousVersion: "1.0.0",
  });
  assert.equal(
    existsSync(path.join(f.appDataPath, "Our Civic Duty Updates", "previous")),
    false,
  );
});

test("title readiness keeps one fallback and later updates replace it", (t) => {
  const f = fixture(t);
  prepareMacUpdateRetention({ ...f, nextVersion: "2.0.0" });
  replaceBuild(f, "2.0.0");
  assert.deepEqual(noteMacUpdateStart(f), {
    action: "pending",
    failedStarts: 1,
  });
  assert.deepEqual(markMacUpdateReady(f), {
    action: "ready",
    previousVersion: "1.0.0",
  });
  assert.deepEqual(noteMacUpdateStart(f), { action: "stable" });
  prepareMacUpdateRetention({ ...f, nextVersion: "3.0.0" });
  const previous = path.join(
    f.appDataPath,
    "Our Civic Duty Updates",
    "previous",
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        path.join(previous, "Contents/Resources/build-identity.json"),
        "utf8",
      ),
    ).version,
    "2.0.0",
  );
  assert.deepEqual(noteMacUpdateStart(f), { action: "install-not-applied" });
});

test("bundle path resolver requires a Mac app bundle", () => {
  assert.equal(
    macAppBundleFromExecutable(
      "/Applications/Our Civic Duty.app/Contents/MacOS/App",
    ),
    "/Applications/Our Civic Duty.app",
  );
  assert.throws(
    () => macAppBundleFromExecutable("/usr/bin/electron"),
    /Mac app bundle/,
  );
});
