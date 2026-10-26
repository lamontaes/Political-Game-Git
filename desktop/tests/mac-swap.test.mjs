/* global process */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  macBundleFromExecPath,
  pickMacZip,
  planMacSwap,
  releaseFileUrl,
  sha512Matches,
  shellQuote,
  swapScript,
} from "../mac-swap.mjs";

const exec = "/Applications/Our Civic Duty.app/Contents/MacOS/Our Civic Duty";
const files = [
  { url: "OurCivicDuty-0.6.0-mac-arm64.zip", sha512: "abc", size: 10 },
  { url: "OurCivicDuty-0.6.0-mac-arm64.dmg", sha512: "def", size: 11 },
];

test("the running bundle is found from the executable path", () => {
  assert.equal(macBundleFromExecPath(exec), "/Applications/Our Civic Duty.app");
  assert.equal(macBundleFromExecPath("/usr/bin/node"), null);
  assert.equal(macBundleFromExecPath(undefined), null);
});

test("the zip for this architecture is chosen, never the dmg", () => {
  assert.equal(pickMacZip(files, "arm64")?.url, files[0].url);
  assert.equal(pickMacZip(files, "x64"), null);
  const both = [
    ...files,
    { url: "OurCivicDuty-0.6.0-mac-x64.zip", sha512: "x", size: 1 },
  ];
  assert.equal(pickMacZip(both, "x64")?.url, "OurCivicDuty-0.6.0-mac-x64.zip");
  assert.equal(pickMacZip([{ url: "a.zip" }], "arm64"), null, "needs sha512");
  assert.equal(pickMacZip(null, "arm64"), null);
});

test("a swap is planned only for a writable, installed bundle", () => {
  const base = { arch: "arm64", updateInfo: { files }, folderWritable: true };
  assert.deepEqual(planMacSwap({ ...base, execPath: exec }), {
    action: "swap",
    bundle: "/Applications/Our Civic Duty.app",
    zip: files[0],
  });
  assert.equal(
    planMacSwap({ ...base, execPath: "/usr/bin/x" }).reason,
    "not-a-bundle",
  );
  assert.equal(
    planMacSwap({
      ...base,
      execPath:
        "/private/var/folders/x/AppTranslocation/ABC/d/Our Civic Duty.app/Contents/MacOS/Our Civic Duty",
    }).reason,
    "translocated",
  );
  assert.equal(
    planMacSwap({
      ...base,
      execPath: "/Volumes/Our Civic Duty/Our Civic Duty.app/Contents/MacOS/x",
    }).reason,
    "disk-image",
  );
  assert.equal(
    planMacSwap({ ...base, execPath: exec, folderWritable: false }).reason,
    "not-writable",
  );
  assert.equal(
    planMacSwap({ ...base, execPath: exec, updateInfo: { files: [] } }).reason,
    "no-zip",
  );
});

test("release file addresses follow the GitHub download path", () => {
  assert.equal(
    releaseFileUrl({
      owner: "o",
      repo: "r",
      tag: "v0.6.0",
      name: "Our Civic Duty.zip",
    }),
    "https://github.com/o/r/releases/download/v0.6.0/Our-Civic-Duty.zip",
  );
});

test("only an exact sha512 match passes", () => {
  assert.equal(sha512Matches("abc", "abc"), true);
  assert.equal(sha512Matches("abc", "abd"), false);
  assert.equal(sha512Matches("", ""), false);
  assert.equal(sha512Matches(undefined, "abc"), false);
});

test("shell quoting survives quotes and spaces", () => {
  assert.equal(shellQuote("a b"), "'a b'");
  assert.equal(shellQuote("it's"), "'it'\\''s'");
});

test("the swap script refuses bad input", () => {
  const ok = { pid: 42, bundle: "/A.app", staged: "/t/A.app", backup: "/B" };
  assert.throws(() => swapScript({ ...ok, pid: 0 }));
  assert.throws(() => swapScript({ ...ok, staged: "relative" }));
  const script = swapScript(ok);
  assert.match(script, /kill -0 42/);
  assert.match(script, /open '\/A.app'/);
});

test(
  "the swap script replaces the bundle and keeps the old one on failure",
  { skip: process.platform === "win32" },
  () => {
    const root = mkdtempSync(path.join(tmpdir(), "ocd-swap-"));
    const bundle = path.join(root, "Our Civic Duty.app");
    const staged = path.join(root, "new", "Our Civic Duty.app");
    const backup = path.join(root, "old's.app");
    mkdirSync(bundle);
    writeFileSync(path.join(bundle, "v"), "old");
    mkdirSync(staged, { recursive: true });
    writeFileSync(path.join(staged, "v"), "new");
    // pid 1 never exits; use an exited child's pid instead.
    const pid = Number(
      execFileSync("sh", ["-c", "echo $$"], { encoding: "utf8" }),
    );
    const run = (script) =>
      execFileSync("sh", ["-c", script.replace(/^open .*$/m, "true")]);
    run(swapScript({ pid, bundle, staged, backup }));
    assert.equal(readFileSync(path.join(bundle, "v"), "utf8"), "new");
    // A missing staged bundle leaves the installed one in place.
    run(swapScript({ pid, bundle, staged, backup }));
    assert.equal(readFileSync(path.join(bundle, "v"), "utf8"), "new");
  },
);
