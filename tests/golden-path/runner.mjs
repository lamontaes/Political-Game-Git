/* global process, console */
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { runCommand } from "../../scripts/core2-guard/process.mjs";
import policies from "../../scripts/core2-guard/policies.json" with { type: "json" };
export function validateFeatures(document) {
  if (!Array.isArray(document.features))
    throw new Error("Missing feature list");
  const ids = new Set();
  for (const row of document.features) {
    if (
      typeof row.id !== "string" ||
      ids.has(row.id) ||
      typeof row.passes !== "boolean"
    )
      throw new Error("Invalid or duplicate feature spec");
    ids.add(row.id);
    if (
      row.command !== null &&
      !(typeof row.command === "string" && row.command.trim()) &&
      !(
        Array.isArray(row.command) &&
        row.command.length &&
        row.command.every((x) => typeof x === "string" && x.length)
      )
    )
      throw new Error(`Invalid command: ${row.id}`);
  }
  return document.features;
}
/**
 * A registered command is batchable when it is plain `vitest run <files>`
 * (optionally through `npx`), with no flags: those run together in one vitest
 * process, so startup and module loading are paid once. Anything else runs
 * alone, as before.
 */
export function vitestBatch(command) {
  if (command === null || command === undefined) return null;
  const tokens =
    typeof command === "string"
      ? /^[\w./@:=-]+(\s+[\w./@:=-]+)*$/.test(command.trim())
        ? command.trim().split(/\s+/)
        : null
      : command;
  if (!tokens) return null;
  const at = tokens.findIndex((t) => t === "vitest" || t.endsWith("/vitest"));
  if (at < 0 || at > 1 || (at === 1 && tokens[0] !== "npx")) return null;
  if (tokens[at + 1] !== "run") return null;
  const files = tokens.slice(at + 2);
  if (!files.length || files.some((f) => f.startsWith("-"))) return null;
  return { prefix: tokens.slice(0, at + 2), files };
}
async function runBatch(rows, { cwd, milliseconds, env, execute }) {
  const directory = mkdtempSync(join(tmpdir(), "golden-vitest-")),
    outputFile = join(directory, "report.json");
  try {
    const first = vitestBatch(rows[0].command),
      files = [...new Set(rows.flatMap((r) => vitestBatch(r.command).files))];
    const receipt = await execute(
      [
        ...first.prefix,
        ...files,
        "--reporter=json",
        `--outputFile=${outputFile}`,
      ],
      { cwd, milliseconds, env },
    );
    let report = null;
    try {
      report = JSON.parse(readFileSync(outputFile, "utf8"));
    } catch {
      /* a crash or timeout leaves no report */
    }
    const byFile = new Map(
      (report?.testResults ?? []).map((r) => [resolve(cwd, r.name), r]),
    );
    return new Map(
      rows.map((row) => {
        const own = vitestBatch(row.command).files.map((f) =>
          byFile.get(resolve(cwd, f)),
        );
        const passed =
          receipt.code === 0 || own.every((r) => r?.status === "passed");
        return [
          row.id,
          {
            ...receipt,
            code: passed ? 0 : (receipt.code ?? 1),
            timedOut: !passed && receipt.timedOut,
          },
        ];
      }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
export async function runSuite({
  document,
  commit,
  cwd,
  budget,
  drawPlace,
  mode = "pr",
  only = "all",
  execute = runCommand,
}) {
  // "quick" leaves out the long-running specs (a played year), which run as
  // their own job with their own budget ("long"); "all" runs both.
  const features = validateFeatures(document).filter(
      (r) => only === "all" || (only === "long") === (r.longRunning === true),
    ),
    started = performance.now(),
    results = [],
    batchRows = features.filter((r) => r.command && vitestBatch(r.command));
  let batch = null;
  // Accepted specs first; within each group the long ones (a played year)
  // last, so one of them cannot spend the budget the quick specs need.
  for (const row of [...features].sort(
    (a, b) =>
      Number(b.passes) - Number(a.passes) ||
      Number(a.longRunning === true) - Number(b.longRunning === true),
  )) {
    const batched = batchRows.length > 1 && batchRows.includes(row),
      place = drawPlace(commit, batched ? "vitest-batch" : row.id);
    let receipt = { code: null, timedOut: false, milliseconds: 0, output: "" },
      status = "missing-command";
    if (row.command) {
      const remaining = budget - (performance.now() - started);
      status = "not-reached";
      if (remaining > 0) {
        const env = {
          GOLDEN_PATH_SEED: place.seed,
          GOLDEN_PATH_PLACE_KEY: place.key,
          GOLDEN_PATH_SPEC_ID: batched
            ? batchRows.map((r) => r.id).join(",")
            : row.id,
          GOLDEN_PATH_COMMIT: commit,
          GOLDEN_PATH_MODE: mode,
        };
        if (batched) {
          batch ??= await runBatch(batchRows, {
            cwd,
            milliseconds: remaining,
            env,
            execute,
          });
          receipt = batch.get(row.id);
        } else
          receipt = await execute(row.command, {
            cwd,
            milliseconds: remaining,
            env,
          });
        status = receipt.timedOut
          ? "timeout"
          : receipt.code === 0
            ? "passed"
            : "failed";
      }
    }
    results.push({
      id: row.id,
      accepted: row.passes,
      command: row.command,
      place,
      status,
      ...receipt,
      output: status === "passed" ? "" : receipt.output,
    });
  }
  return {
    schema: "golden-path-v1",
    commit,
    budgetMilliseconds: budget,
    elapsedMilliseconds: performance.now() - started,
    configuredCommands: results.filter((r) => r.command).length,
    regression: results.some((r) => r.accepted && r.status !== "passed"),
    results,
  };
}
export function summary(receipt) {
  return (
    `## Golden path: ${receipt.regression ? "REGRESSION" : "no accepted regression"}\n\n${receipt.configuredCommands} registered commands. Unaccepted results are goals, not acceptance.\n\n| Spec | Acceptance | Result | Place / seed | ms |\n|---|---|---|---|---|\n` +
    receipt.results
      .map(
        (r) =>
          `| ${r.id} | ${r.accepted ? "accepted" : "goal"} | ${r.status} | ${r.place.name.replaceAll("|", "\\|")} / ${r.place.seed} | ${Math.round(r.milliseconds)} |`,
      )
      .join("\n") +
    "\n"
  );
}
export async function main() {
  const args = process.argv.slice(2),
    mode = args.includes("--nightly") ? "nightly" : "pr",
    only = args.includes("--only-long")
      ? "long"
      : args.includes("--skip-long")
        ? "quick"
        : "all",
    value = (flag) => args[args.indexOf(flag) + 1];
  const cwd = process.cwd(),
    commit = args.includes("--commit")
      ? value("--commit")
      : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const document = JSON.parse(
    readFileSync(
      args.includes("--features")
        ? value("--features")
        : "docs/roadmap/features.json",
      "utf8",
    ),
  );
  const { drawPlace } = await import("./place.ts");
  const receipt = await runSuite({
    document,
    cwd,
    commit,
    drawPlace,
    mode,
    only,
    budget:
      only === "long"
        ? policies.longRunningMilliseconds
        : policies[`${mode}Milliseconds`],
  });
  receipt.sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const text = summary(receipt);
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  if (args.includes("--output"))
    writeFileSync(value("--output"), JSON.stringify(receipt, null, 2) + "\n");
  process.exitCode = receipt.regression ? 1 : 0;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
