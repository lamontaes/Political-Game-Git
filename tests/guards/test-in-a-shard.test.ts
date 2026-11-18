import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import list from "./test-runners.json";

/**
 * Every test file is run by some shard, or says what runs it (CTO, #9747,
 * Nov 18: Fixer A found officials-husks.test.ts was never run by any CI unit
 * shard, so a red sat unseen and #10124 folded over it). A pull request's unit
 * job runs only the files it changed, so the hosted full run is the one place
 * that carries every other test. A `.test.` file that run does not discover
 * (a Vitest exclude, or a node:test file) must be in test-runners.json with the
 * command that runs it; the command must exist, and the list only shrinks.
 *
 * Scope: files named `*.test.[cm]?[jt]sx?`. The browser checks
 * (`*.browser.mjs`) and the played-world node tests (`*.node-test.*`) have
 * their own runners and are not counted here.
 */

const ROOT = path.resolve(__dirname, "../..");
type Runner = { covers: string; runBy: string; reason: string };
const runners = list.runners as Runner[];

const run = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    env: { ...process.env, OCD_CALIBRATION: "" },
    stdio: ["ignore", "pipe", "ignore"],
  });

const tracked = run("git", ["ls-files"])
  .split("\n")
  .filter(
    (file) =>
      /\.test\.[cm]?[jt]sx?$/.test(file) && existsSync(path.join(ROOT, file)),
  );
const discovered = new Set(
  run("npx", ["vitest", "list", "--filesOnly"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => path.relative(ROOT, path.resolve(ROOT, line))),
);
const undiscovered = tracked.filter((file) => !discovered.has(file));

const covers = (runner: Runner, file: string) =>
  runner.covers.endsWith("/")
    ? file.startsWith(runner.covers)
    : file === runner.covers;

describe("every test file is run by some shard, or names what runs it", () => {
  it("a test file the hosted full run does not discover is on the list", () => {
    const loose = undiscovered.filter(
      (file) => !runners.some((runner) => covers(runner, file)),
    );
    expect(
      loose,
      `No shard runs these. Fix why Vitest skips them, or add each to tests/guards/test-runners.json with the command that runs it: ${loose.join(", ")}`,
    ).toEqual([]);
  });

  it("the command named for each entry exists and runs its files", () => {
    const scripts = JSON.parse(
      readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ).scripts as Record<string, string>;
    const bad = runners.flatMap((runner) => {
      if (runner.runBy === "desktop:test") {
        const own = path.join(ROOT, "desktop/package.json");
        const test = existsSync(own)
          ? JSON.parse(readFileSync(own, "utf8")).scripts?.test
          : undefined;
        return test
          ? []
          : [`${runner.covers}: desktop/package.json has no test script`];
      }
      const command = scripts[runner.runBy];
      if (!command) return [`${runner.covers}: no npm script ${runner.runBy}`];
      const file = runner.covers.replace(/\/$/, "");
      return command.includes(file)
        ? []
        : [`${runner.covers}: npm script ${runner.runBy} does not run it`];
    });
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("the calibration lane runs in the heavy set", () => {
    const heavy = readFileSync(
      path.join(ROOT, ".github/workflows/heavy.yml"),
      "utf8",
    );
    if (runners.some((runner) => runner.runBy === "test:calibration"))
      expect(heavy).toContain("npm run test:calibration");
  });

  it("the list only shrinks: every entry covers a file the full run skips", () => {
    const stale = runners.filter(
      (runner) => !undiscovered.some((file) => covers(runner, file)),
    );
    expect(
      stale.map((runner) => runner.covers),
      "Take these off tests/guards/test-runners.json",
    ).toEqual([]);
  });
});
