/* global process, console */
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { runCommand } from "./process.mjs";
import { compare } from "./compare.mjs";
import policies from "./policies.json" with { type: "json" };
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
export function outsideRepository(output, cwd = process.cwd()) {
  const path = resolve(output),
    rel = relative(cwd, path);
  if (!rel || (!rel.startsWith("../") && rel !== ".."))
    throw new Error("Measurement artifacts must be outside the checkout");
  return path;
}
/**
 * Whether another measured pair still fits the paired budget: the last pair's
 * time with a margin (policies.runTimeMargin) against the time left.
 */
export function nextPairFits(remainingMilliseconds, lastBase, lastHead) {
  return (
    remainingMilliseconds >= (lastBase + lastHead) * policies.runTimeMargin
  );
}
/**
 * The span the measured runs play: the longest, up to a whole year, whose
 * three pairs and two profiles (each run its fixed time plus its days at the
 * warmups' time a day, with policies.runTimeMargin) fit the time left; never
 * shorter than a warmup. Each warmup is { wallMilliseconds, advanceMilliseconds,
 * days }; the slower warmup's numbers are used.
 */
export function measuredSpan(remainingMilliseconds, warmups) {
  const fixed = Math.max(
      ...warmups.map((row) => row.wallMilliseconds - row.advanceMilliseconds),
    ),
    perDay = Math.max(
      ...warmups.map((row) => row.advanceMilliseconds / row.days),
    ),
    runs = 2 * policies.measuredRuns + 2 * policies.profileTimeMargin,
    perRun = remainingMilliseconds / policies.runTimeMargin / runs,
    days = Math.floor((perRun - fixed) / perDay);
  return Math.max(policies.warmupDays, Math.min(policies.measuredDays, days));
}
/** Whether a profile run fits the time left (policies.profileTimeMargin). */
export function profileFits(remainingMilliseconds, lastRun) {
  return remainingMilliseconds >= lastRun * policies.profileTimeMargin;
}
export async function paired({ base, head, output }) {
  const cwd = process.cwd(),
    started = performance.now();
  output = outsideRepository(output);
  mkdirSync(dirname(output), { recursive: true });
  if (git("status", "--porcelain"))
    throw new Error("Paired measurements require a clean registered checkout");
  const original = git("rev-parse", "HEAD");
  let branch;
  try {
    branch = git("symbolic-ref", "--short", "HEAD");
  } catch {
    branch = original;
  }
  base = git("rev-parse", `${base}^{commit}`);
  head = git("rev-parse", `${head}^{commit}`);
  const { drawPlace } = await import("../../tests/golden-path/place.ts");
  const place = drawPlace(head, "M0-11");
  // Base and head open on the head's start date, so the two worlds match.
  const { gameStartDate } = await import("../../src/core2/game-start.ts");
  const startDate = gameStartDate();
  const directory = mkdtempSync(resolve(tmpdir(), "core2-paired-"));
  for (const name of ["month.mjs", "policies.json", "profile-summary.mjs"])
    copyFileSync(
      resolve("scripts/core2-guard", name),
      resolve(directory, name),
    );
  copyFileSync(
    "docs/reports/2026-10-10-core2-slowdown-profile-tools/summarize.mjs",
    resolve(directory, "summarize.mjs"),
  );
  const groups = {},
    profiles = {};
  let result, span;
  const execute = async (command) => {
    const receipt = await runCommand(command, {
      cwd,
      milliseconds:
        policies.performanceMilliseconds - (performance.now() - started),
    });
    if (receipt.code !== 0 || receipt.timedOut)
      throw new Error(
        `Measurement failed (${receipt.timedOut ? "deadline" : receipt.code}): ${receipt.output}`,
      );
    return receipt;
  };
  // One measured process at the revision; returns its receipt and keeps how
  // long it took, which sizes what still fits the budget.
  const revisions = { base, head },
    lastMilliseconds = {},
    remaining = () =>
      policies.performanceMilliseconds - (performance.now() - started),
    monthArgs = (output, days) => [
      "--import",
      "tsx",
      resolve(directory, "month.mjs"),
      "--seed",
      place.seed,
      "--place-key",
      place.key,
      "--start-date",
      startDate,
      "--output",
      output,
      "--days",
      String(days),
    ],
    checkout = (label) => {
      git("checkout", "--detach", revisions[label]);
      if (!existsSync("src/core2/life.ts"))
        throw new Error(
          `Core not available at ${label} ${revisions[label]}; no benchmark was run`,
        );
    },
    measure = async (label, index, days) => {
      checkout(label);
      const receiptPath = resolve(directory, `${label}-${index}.json`);
      process.stderr.write(
        `Measuring ${label} ${revisions[label]} run ${index + 1}\n`,
      );
      const began = performance.now();
      await execute([
        process.execPath,
        `--max-old-space-size=${policies.nodeHeapMiB}`,
        `--max-semi-space-size=${policies.nodeSemiSpaceMiB}`,
        ...monthArgs(receiptPath, days),
      ]);
      lastMilliseconds[label] = performance.now() - began;
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
      if (receipt.revision !== revisions[label])
        throw new Error("Measured revision does not match requested revision");
      return { ...receipt, wallMilliseconds: lastMilliseconds[label] };
    };
  try {
    groups.base = [];
    groups.head = [];
    let index = 0;
    // The warmups play a month each; their time a day and fixed time size the
    // span every measured run plays, so a large drawn town measures its three
    // pairs over the part of the year that fits rather than running out.
    const warmed = [];
    for (let warm = 0; warm < policies.warmupRuns; warm++, index++)
      for (const label of ["base", "head"])
        warmed.push(await measure(label, index, policies.warmupDays));
    span = measuredSpan(remaining(), warmed);
    // Base and head alternate, so the machine's drift falls on both. After the
    // first pair the next one starts only while the last pair's time (with a
    // margin) still fits, in case the year's later days run slower.
    for (let pair = 0; pair < policies.measuredRuns; pair++, index++) {
      if (
        pair > 0 &&
        !nextPairFits(remaining(), lastMilliseconds.base, lastMilliseconds.head)
      )
        break;
      for (const label of ["base", "head"])
        groups[label].push(await measure(label, index, span));
    }
    // Profiles only name the slowest functions and never enter the
    // comparison, so they run in the time left, the head's first (the receipt
    // still lists base, then head).
    profiles.base = undefined;
    profiles.head = undefined;
    for (const label of ["head", "base"]) {
      if (!profileFits(remaining(), lastMilliseconds[label])) {
        profiles[label] = { skipped: "time budget" };
        continue;
      }
      checkout(label);
      const profileDir = resolve(directory, label);
      mkdirSync(profileDir);
      await execute([
        process.execPath,
        `--max-old-space-size=${policies.nodeHeapMiB}`,
        `--max-semi-space-size=${policies.nodeSemiSpaceMiB}`,
        "--cpu-prof",
        `--cpu-prof-dir=${profileDir}`,
        "--cpu-prof-name=month.cpuprofile",
        ...monthArgs(resolve(profileDir, "month.json"), span),
      ]);
      const profile = await execute([
        process.execPath,
        resolve(directory, "profile-summary.mjs"),
        resolve(directory, "summarize.mjs"),
        resolve(profileDir, "month.cpuprofile"),
        String(policies.profileTop),
      ]);
      const parsed = JSON.parse(profile.output);
      profiles[label] = {
        totalMs: parsed.totalMs,
        self: parsed.self,
        total: parsed.total,
      };
    }
    result = {
      ...compare(groups.base, groups.head),
      profiles,
      runs: groups,
      elapsedMilliseconds: performance.now() - started,
    };
  } catch (error) {
    result = {
      schema: "core2-paired-v1",
      passed: false,
      error: String(error),
      baseRevision: base,
      headRevision: head,
      seed: place.seed,
      placeKey: place.key,
      profiles,
      elapsedMilliseconds: performance.now() - started,
    };
  } finally {
    git("checkout", branch);
  }
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  const summary = result.error
    ? `## Core guard: ERROR\n\n${result.error.slice(0, 1000)}\n`
    : `## Core guard: ${result.passed ? "PASS" : result.speedPassed ? "INPUT BUDGET FAILURE" : "SLOWDOWN"}\n\nBase ${result.baseMillisecondsPerDay.toFixed(2)} ms/day; head ${result.headMillisecondsPerDay.toFixed(2)} ms/day; ratio ${result.ratio.toFixed(3)} (limit ${result.maximumRatio}). Opening-input budgets: ${result.openingBudgetPassed ? "passed" : "FAILED"}.\n\n${result.inputHash.changed ? `The opening's input changed (base ${result.inputHash.base}, head ${result.inputHash.head}); both opened the same seed, place and day.\n\n` : ""}Peak RSS: base ${result.peakRssMiB.base.toFixed(1)} MiB; head ${result.peakRssMiB.head.toFixed(1)} MiB.\n\nSeed ${result.seed}; place ${result.placeKey}; ${result.measuredPairs} measured pair(s) of ${policies.measuredRuns}, each run playing ${result.measuredDays} of ${policies.measuredDays} days after ${policies.warmupDays}-day warmups.\n\n` +
      (profiles.head?.self
        ? "Slowest sampled head functions (profiles include opening and month):\n\n" +
          profiles.head.self
            .map((row) => `- ${row.name}: ${row.ms} ms (${row.pct}%)`)
            .join("\n")
        : "Profiles skipped: the measured runs used the time budget.") +
      "\n";
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2),
    value = (flag) => args[args.indexOf(flag) + 1];
  paired({
    base: value("--base"),
    head: value("--head"),
    output: value("--output"),
  })
    .then((result) => {
      process.exitCode = result.passed ? 0 : 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
