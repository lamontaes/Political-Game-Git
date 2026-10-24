/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { measuredSpan, nextPairFits, paired, profileFits } from "./paired.mjs";
import { runMonth } from "./month.mjs";
const scripts = dirname(fileURLToPath(import.meta.url));

test("month rejects missing output before opening a world or writing a file", async () => {
  await assert.rejects(
    runMonth({ seed: "fixture", placeKey: "fixture" }),
    /output/i,
  );
  const cwd = mkdtempSync(resolve(tmpdir(), "core2-month-options-"));
  for (const suffix of [[], ["--output"], ["--output", "--seed", "fixture"]]) {
    const result = spawnSync(
      process.execPath,
      [
        resolve(scripts, "month.mjs"),
        "--seed",
        "fixture",
        "--place-key",
        "fixture",
        ...suffix,
      ],
      { cwd, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing value for --output/);
  }
  assert.deepEqual(readdirSync(cwd), []);
});

test("a complete paired run including profiles restores a clean branch and can run again", async () => {
  // Tiny command/checkout fixture, not a game simulation or a repository copy.
  const directory = mkdtempSync(resolve(tmpdir(), "core2-paired-clean-"));
  const cwd = resolve(directory, "checkout");
  mkdirSync(cwd);
  const write = (path, content) => {
    const target = resolve(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  symlinkSync(
    resolve(scripts, "../../node_modules"),
    resolve(cwd, "node_modules"),
    "dir",
  );
  write(".gitignore", "node_modules\n");
  write("src/core2/life.ts", "// Tooling fixture: presence marker only.\n");
  mkdirSync(resolve(cwd, "scripts/core2-guard"), { recursive: true });
  copyFileSync(
    resolve(scripts, "policies.json"),
    resolve(cwd, "scripts/core2-guard/policies.json"),
  );
  // Preserve the old missing-flag behavior so omitting --output in either
  // caller writes --seed in the checkout and makes this regression test fail.
  write(
    "scripts/core2-guard/month.mjs",
    `
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const receipt = {
  schema: 'core2-month-v1', revision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(),
  seed: value('--seed'), placeKey: value('--place-key'), inputHash: 'tooling-fixture',
  startedAt: 'tooling-fixture', days: Number(value('--days')), settings: {}, host: {},
  opening: {budget: {passed: true}}, advanceMilliseconds: 1, millisecondsPerDay: 1, peakRssMiB: 1
};
writeFileSync(value('--output'), JSON.stringify(receipt));
`,
  );
  copyFileSync(
    resolve(scripts, "profile-summary.mjs"),
    resolve(cwd, "scripts/core2-guard/profile-summary.mjs"),
  );
  const summarizer =
    "docs/reports/2026-10-10-core2-slowdown-profile-tools/summarize.mjs";
  mkdirSync(dirname(resolve(cwd, summarizer)), { recursive: true });
  copyFileSync(resolve(scripts, "../..", summarizer), resolve(cwd, summarizer));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "--initial-branch=fixture");
  git("config", "user.name", "Guard Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", ".");
  git("commit", "-m", "Tooling fixture");
  const revision = git("rev-parse", "HEAD");
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    for (const attempt of [1, 2]) {
      const result = await paired({
        base: revision,
        head: revision,
        output: resolve(directory, `paired-${attempt}.json`),
      });
      assert.equal(result.passed, true, result.error);
      // A fixture month takes no time, so the whole year fits.
      assert.equal(result.measuredDays, 365);
      assert.deepEqual(Object.keys(result.profiles), ["base", "head"]);
      for (const profile of Object.values(result.profiles)) {
        assert.ok(profile.totalMs > 0);
        assert.ok(profile.self.length > 0);
      }
      assert.equal(git("symbolic-ref", "--short", "HEAD"), "fixture");
      assert.equal(git("rev-parse", "HEAD"), revision);
      assert.equal(git("status", "--porcelain"), "");
    }
  } finally {
    process.chdir(previous);
  }
});

test("another pair or a profile starts only while its last time fits what is left", () => {
  // Six minutes a run, as a large drawn town's year took on GitHub's runner.
  const run = 6 * 60_000;
  assert.equal(nextPairFits(33 * 60_000, run, run), true);
  assert.equal(nextPairFits(9 * 60_000, run, run), false);
  assert.equal(nextPairFits(2 * run * 1.1, run, run), true);
  // The margin: exactly the last pair's time is not enough.
  assert.equal(nextPairFits(2 * run * 1.05, run, run), false);
  assert.equal(profileFits(run * 1.1, run), false);
  assert.equal(profileFits(9 * 60_000, run), true);
  assert.equal(profileFits(3 * 60_000, run), false);
});

test("the measured span is the longest whose three pairs and two profiles fit what is left", () => {
  const runs = 2 * 3 + 2 * 1.25,
    month = (fixed, perDay) => ({
      wallMilliseconds: fixed + 31 * perDay,
      advanceMilliseconds: 31 * perDay,
      days: 31,
    }),
    fits = (left, fixed, perDay, days) =>
      (fixed + days * perDay) * runs * 1.1 <= left;
  // Derry, New Hampshire on a four-core container: about a minute to open and
  // 1.35 s a game day, with about 41.6 minutes left after the two warmups.
  const left = 41.6 * 60_000,
    derry = measuredSpan(left, [month(70_000, 1_355), month(60_000, 1_340)]);
  assert.ok(derry > 31 && derry < 365, String(derry));
  // The slower warmup sizes it, and one day more would not fit.
  assert.equal(fits(left, 70_000, 1_355, derry), true);
  assert.equal(fits(left, 70_000, 1_355, derry + 1), false);
  // A small town plays its whole year; a town too slow for even a month still
  // plays a month, and the pair checks then measure as many pairs as fit.
  assert.equal(measuredSpan(left, [month(10_000, 100)]), 365);
  assert.equal(measuredSpan(left, [month(60_000, 20_000)]), 31);
});
