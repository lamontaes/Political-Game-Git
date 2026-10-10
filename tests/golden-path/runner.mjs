/* global process, console */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
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
export async function runSuite({
  document,
  commit,
  cwd,
  budget,
  drawPlace,
  execute = runCommand,
}) {
  const features = validateFeatures(document),
    started = performance.now(),
    results = [];
  for (const row of [...features].sort(
    (a, b) => Number(b.passes) - Number(a.passes),
  )) {
    const place = drawPlace(commit, row.id);
    let receipt = { code: null, timedOut: false, milliseconds: 0, output: "" },
      status = "missing-command";
    if (row.command) {
      const remaining = budget - (performance.now() - started);
      status = "not-reached";
      if (remaining > 0) {
        receipt = await execute(row.command, {
          cwd,
          milliseconds: remaining,
          env: {
            GOLDEN_PATH_SEED: place.seed,
            GOLDEN_PATH_PLACE_KEY: place.key,
            GOLDEN_PATH_SPEC_ID: row.id,
            GOLDEN_PATH_COMMIT: commit,
          },
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
    budget: policies[`${mode}Milliseconds`],
  });
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
