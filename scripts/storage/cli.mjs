/* global console, process */
/**
 * `npm run storage -- <command>`
 *
 *   status                         limits, free space, registered workspaces
 *   workspace --owner X            the owner's registered folder (never a new one)
 *   register --owner X --path P [--role R]
 *   protect --path P --reason "…"
 *   run <operation> -- <command>   hold the reservation until the command ends
 *   gate <operation>               admission check only; holds nothing afterwards
 *   output-root --path P [--owner X] [--historical-disposable]
 *                                  name one exact directory as disposable output
 *   outputs [--root P] [--apply]   retention; removes only in a registered root
 *   check --path P                 every reason a folder may not be retired
 *   record --plan FILE             write each path's content manifest into the plan
 *   retire --plan FILE [--apply]   remove exactly an approved list
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  StorageRefusal,
  createStorageGuard,
  formatBytes,
  contentManifest,
  isEphemeralHost,
  runManaged,
} from "./storage-guard.mjs";

const [command, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? undefined : rest[index + 1];
};
const has = (name) => rest.includes(`--${name}`);
const managedRoot =
  process.env.OCD_MANAGED_ROOT ?? path.join(homedir(), "Documents");
const guard = createStorageGuard();

try {
  if (command === "status" || command === undefined) {
    const { policy } = guard;
    console.log(`state: ${guard.files.registryFile}`);
    console.log(
      `free-space reserve:        ${formatBytes(policy.freeSpaceReserveBytes)}`,
    );
    console.log(
      `managed-workspace budget:  ${formatBytes(policy.managedWorkspaceBudgetBytes)} across at most ${policy.maxRegisteredWorkspaces}`,
    );
    console.log(
      `output budget per root:    ${formatBytes(policy.outputBudgetBytes)}, ${policy.outputKeepRecent} recent runs kept, .pin kept always`,
    );
    for (const [operation, bytes] of Object.entries(policy.estimatesBytes))
      console.log(`estimate ${operation.padEnd(18)} ${formatBytes(bytes)}`);
    const registry = guard.registry();
    for (const entry of registry.workspaces)
      console.log(
        `workspace ${entry.owner.padEnd(6)} ${entry.role.padEnd(14)} ${entry.state.padEnd(8)} ${formatBytes(entry.measuredBytes ?? 0).padStart(9)}  ${entry.path}`,
      );
    for (const entry of guard.protectedList())
      console.log(`protected ${entry.path} — ${entry.reason}`);
    for (const entry of registry.outputRoots ?? [])
      console.log(
        `output    ${entry.path} (${entry.owner}; earlier contents: ${entry.historical})`,
      );
    for (const entry of guard.liveReservations())
      console.log(
        `reserved  ${formatBytes(entry.bytes)} ${entry.operation} by ${entry.owner}`,
      );
  } else if (command === "workspace") {
    const { workspace, reused } = guard.ensureWorkspace({
      owner: flag("owner"),
    });
    console.log(`${reused ? "reuse" : "new"}: ${workspace.path}`);
  } else if (command === "register") {
    const workspace = guard.register({
      owner: flag("owner"),
      role: flag("role"),
      folder: flag("path"),
    });
    console.log(
      `registered ${workspace.owner} → ${workspace.path} (${formatBytes(workspace.measuredBytes)})`,
    );
  } else if (command === "protect") {
    guard.protect(flag("path"), flag("reason") ?? "protected");
    console.log(`protected ${flag("path")}`);
  } else if (command === "run") {
    const split = rest.indexOf("--");
    if (split < 1 || split === rest.length - 1) {
      console.error("usage: storage run <operation> -- <command> [args...]");
      process.exitCode = 1;
    } else {
      process.exitCode = await runManaged({
        operation: rest[0],
        command: rest[split + 1],
        args: rest.slice(split + 2),
        outputRoots: [path.join(process.cwd(), "test-results", "runs")],
      });
    }
  } else if (command === "output-root") {
    const record = guard.registerOutputRoot({
      root: flag("path"),
      owner: flag("owner"),
      historical: has("historical-disposable") ? "disposable" : "keep",
    });
    console.log(
      `output root ${record.path} (${record.owner}); contents older than now are ${record.historical === "keep" ? "kept until a disposition is recorded" : "disposable"}`,
    );
  } else if (command === "gate" && isEphemeralHost()) {
    console.log(
      `ok: ${rest[0]} — GitHub-hosted runner, the workstation reserve does not apply`,
    );
  } else if (command === "gate" && process.env.OCD_STORAGE_OVERRIDE) {
    console.log(`OVERRIDDEN ${rest[0]}: ${process.env.OCD_STORAGE_OVERRIDE}`);
  } else if (command === "gate") {
    const reservation = guard.gate({
      operation: rest[0],
      target: process.cwd(),
      // Every typecheck leaves a run directory here, so a build is also an
      // output producer and answers to the same per-root budget.
      outputRoots: [path.join(process.cwd(), "test-results", "runs")],
      owner: process.env.OCD_WORKSPACE_OWNER ?? "unregistered",
    });
    guard.release(reservation.id);
    console.log(
      `ok: ${rest[0]} fits (${formatBytes(reservation.bytes)} with the ${formatBytes(guard.policy.freeSpaceReserveBytes)} reserve kept)`,
    );
  } else if (command === "outputs") {
    const root =
      flag("root") ?? path.join(process.cwd(), "test-results", "runs");
    const report = guard.pruneOutputs(root, { apply: has("apply") });
    console.log(
      `${report.root}: ${formatBytes(report.totalBytes)} in ${report.kept.length + report.removed.length} run(s); budget ${formatBytes(guard.policy.outputBudgetBytes)}; ${report.registered ? "registered output root" : "NOT a registered output root — read-only"}`,
    );
    for (const run of report.kept)
      if (!["recent", "within budget"].includes(run.reason))
        console.log(
          `kept ${formatBytes(run.bytes).padStart(9)} ${run.path} — ${run.reason}`,
        );
    for (const run of report.removed)
      console.log(
        `${has("apply") ? "removed" : "would remove"} ${formatBytes(run.bytes).padStart(9)} ${run.path}`,
      );
  } else if (command === "check") {
    const blockers = guard.retirementBlockers(flag("path"), {
      managedRoot,
      searchRoots: [managedRoot],
    });
    if (blockers.length === 0) console.log("no blockers");
    for (const blocker of blockers)
      console.log(`${blocker.code}: ${blocker.detail}`);
    process.exitCode = blockers.length === 0 ? 0 : 2;
  } else if (command === "record") {
    const plan = JSON.parse(readFileSync(flag("plan"), "utf8"));
    for (const item of plan.items) {
      item.expectedManifest = contentManifest(item.path, {
        identicalTo: item.identicalTo,
        disposableRoots: item.disposableRoots ?? [],
      });
      console.log(
        `${item.expectedManifest === null ? "UNREADABLE" : `${String(item.expectedManifest.filter((line) => /^(FILE|LINK|ABSENT|EMPTYDIR|SPECIAL) /.test(line)).length).padStart(5)} digested path(s)`} ${item.path}`,
      );
    }
    writeFileSync(flag("plan"), `${JSON.stringify(plan, null, 1)}\n`);
  } else if (command === "retire") {
    const plan = JSON.parse(readFileSync(flag("plan"), "utf8"));
    const results = guard.retire(plan.items, {
      apply: has("apply"),
      managedRoot,
      searchRoots: [managedRoot],
    });
    let reclaimed = 0;
    for (const result of results) {
      if (result.removed) reclaimed += result.bytes;
      console.log(
        `${result.removed ? "REMOVED" : result.blockers.length ? "REFUSED" : "would remove"} ${formatBytes(result.bytes).padStart(9)} ${result.path}${result.blockers.map((b) => `\n      ${b.code}: ${b.detail}`).join("")}`,
      );
    }
    console.log(
      `${has("apply") ? "reclaimed" : "would reclaim"} ${formatBytes(has("apply") ? reclaimed : results.filter((r) => !r.blockers.length).reduce((s, r) => s + r.bytes, 0))}`,
    );
    process.exitCode = results.some((result) => result.blockers.length) ? 2 : 0;
  } else {
    console.error(`unknown command: ${command}`);
    process.exitCode = 1;
  }
} catch (error) {
  if (error instanceof StorageRefusal) {
    console.error(`[storage-guard] ${error.message}`);
    process.exitCode = 3;
  } else throw error;
}
