/**
 * Usage:
 *   cli-connectivity-map.ts file <entry.json> [--replace]
 *   cli-connectivity-map.ts list
 *   cli-connectivity-map.ts check
 *   cli-connectivity-map.ts render [--write] [--allow-drop]
 *
 * The map of what reaches what. `file` takes the entry as JSON on disk so a
 * lane can write it with the tools it already has, and so the thing filed is
 * exactly the thing that was reviewed. `--replace` is for re-measuring a
 * subject already on the map — a wire that got built, or a reading that turned
 * out wrong.
 *
 * `render` refuses when this checkout holds fewer subjects than the document
 * already on disk, because the document is a function of whichever entry files
 * the branch happens to hold and a short render is indistinguishable from a
 * complete one. `--allow-drop` says the missing ones were withdrawn on purpose.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  droppedEntryIds,
  renderConnectivityMap,
  summarizeConnectivity,
  validateConnectivityEntries,
  type ConnectivityEntry,
} from "../../src/connectivity/connectivity-map";
import {
  ConnectivityEntryExistsError,
  loadConnectivityEntries,
  writeConnectivityEntry,
} from "./map-store";

const RENDERED_DOCUMENT = "docs/connectivity/WHAT-REACHES-WHAT.md";

const repositoryRoot = process.cwd();
const [command, ...rest] = process.argv.slice(2);

function report(entries: readonly ConnectivityEntry[]): boolean {
  const validation = validateConnectivityEntries(entries);
  for (const finding of validation.findings) {
    const mark = finding.severity === "error" ? "ERROR" : "warn ";
    console.error(`${mark} ${finding.entryId}: ${finding.message}`);
  }
  return validation.valid;
}

function git(...args: readonly string[]): string | undefined {
  try {
    return execFileSync("git", [...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

/** The head this render describes. The Drive copy is read by people who
 * cannot see our branches, so it has to carry its own provenance. */
function currentCommit(): string | undefined {
  const revision = git("rev-parse", "--short", "HEAD");
  if (revision === undefined) return undefined;
  const dirty = (git("status", "--porcelain") ?? "").length > 0;
  return dirty ? `${revision} (working tree modified)` : revision;
}

function currentBranch(): string | undefined {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  return branch === undefined || branch === "HEAD" ? undefined : branch;
}

function loadAll(): readonly ConnectivityEntry[] {
  const loaded = loadConnectivityEntries(repositoryRoot);
  for (const bad of loaded.unreadable) {
    console.error(`ERROR ${bad.filePath}: ${bad.reason}`);
  }
  if (loaded.unreadable.length > 0) process.exit(1);
  return loaded.entries.map((entry) => entry.entry);
}

if (command === "file") {
  const [argument] = rest;
  if (!argument) {
    console.error(
      "Usage: cli-connectivity-map.ts file <entry.json> [--replace]",
    );
    process.exit(2);
  }
  const replace = rest.includes("--replace");
  const entry = JSON.parse(
    fs.readFileSync(path.resolve(argument), "utf8"),
  ) as ConnectivityEntry;
  const existing = loadAll().filter(
    (other) => !replace || other.entryId !== entry.entryId,
  );
  if (!report([...existing, entry])) {
    console.error("Nothing was filed.");
    process.exit(1);
  }
  try {
    const written = await writeConnectivityEntry(repositoryRoot, entry, {
      replace,
    });
    console.log(
      `Recorded ${entry.entryId} at ${path.relative(repositoryRoot, written)}`,
    );
  } catch (cause) {
    if (cause instanceof ConnectivityEntryExistsError) {
      console.error(cause.message);
      process.exit(1);
    }
    throw cause;
  }
} else if (command === "list") {
  const lines = summarizeConnectivity(loadAll());
  if (lines.length === 0) {
    console.log("Nothing is on the map yet.");
  } else {
    for (const line of lines) console.log(line);
  }
} else if (command === "check") {
  if (!report(loadAll())) process.exit(1);
  console.log("Every entry on the map is complete enough to act on.");
} else if (command === "render") {
  const entries = loadAll();
  const target = path.join(repositoryRoot, RENDERED_DOCUMENT);
  if (fs.existsSync(target)) {
    const dropped = droppedEntryIds(fs.readFileSync(target, "utf8"), entries);
    if (dropped.length > 0) {
      const allowed = rest.includes("--allow-drop");
      console.error(
        `${allowed ? "warn " : "ERROR"} this render drops ${dropped.length} subject(s) the last one carried:`,
      );
      for (const id of dropped) console.error(`  ${id}`);
      console.error(
        allowed
          ? "Continuing because --allow-drop was given."
          : [
              "This branch does not hold them. Fetch the branches that do, or",
              "pass --allow-drop if they were withdrawn on purpose. Publishing",
              "this document as it stands would delete them from the copy",
              "people read.",
            ].join("\n"),
      );
      if (!allowed) process.exit(1);
    }
  }
  const document = renderConnectivityMap(
    entries,
    new Date().toISOString(),
    currentCommit(),
    currentBranch(),
  );
  if (rest.includes("--write")) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, document);
    console.log(`Wrote ${RENDERED_DOCUMENT}`);
  } else {
    process.stdout.write(document);
  }
} else {
  console.error(
    [
      "Usage:",
      "  cli-connectivity-map.ts file <entry.json> [--replace]",
      "  cli-connectivity-map.ts list",
      "  cli-connectivity-map.ts check",
      "  cli-connectivity-map.ts render [--write] [--allow-drop]",
    ].join("\n"),
  );
  process.exit(2);
}
