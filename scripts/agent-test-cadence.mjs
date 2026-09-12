/* global console, process */
/**
 * Suggest a focused test cadence from the files actually changed on this branch.
 *
 * This does not run gates or weaken required final checks. It routes workers to
 * the smallest honest commands during iteration, and to readiness commands when
 * asked. Pair recorded stages with scripts/agent-run-receipt.mjs for LAND.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @typedef {{ readonly label: string; readonly command: string; readonly receiptStage: string; readonly kind: "focus" | "readiness" }} CadenceStage */

/**
 * @param {readonly string[]} changedFiles
 * @param {{ readonly readiness?: boolean }} options
 * @returns {readonly CadenceStage[]}
 */
export function planCadence(changedFiles, options = {}) {
  const paths = changedFiles.map((file) => file.replace(/\\/g, "/"));
  const stages = [];
  const has = (pattern) => paths.some((file) => pattern.test(file));

  const code = has(
    /\.(ts|tsx|mjs|js|json)$|^package\.json$|^tsconfig|^vite\.config/i,
  );
  const release = has(/^docs\/release\//);
  const player = has(/^src\/player\//);
  const simulation = has(/^src\/simulation\//);
  const presentation = has(/^src\/presentation\//);
  const browser = has(/^tests\/e2e\//);
  const skillOps = has(
    /^scripts\/skill-ops\/|^\.agents\/|^\.claude\/|^AGENTS\.md$|^CLAUDE\.md$|^\.cursor\//,
  );
  const art = has(/^art\/|^scripts\/art-asset-factory\//);
  const source = has(/^src\/source\/|^data\/source\/|^scripts\/source\//);
  const receipt = has(/^scripts\/agent-(run-receipt|test-cadence|preflight)/);

  if (code) {
    stages.push({
      label: "Typecheck",
      command: "npm run typecheck",
      receiptStage: "typecheck",
      kind: "focus",
    });
  }

  if (skillOps || receipt) {
    stages.push({
      label: "Instruction and receipt contracts",
      command: "npm run test:skill-ops",
      receiptStage: "skill-ops",
      kind: "focus",
    });
  }

  if (simulation) {
    stages.push({
      label: "Simulation unit tests",
      command: "npm run test -- src/simulation",
      receiptStage: "test-simulation",
      kind: "focus",
    });
  }

  if (presentation) {
    stages.push({
      label: "Presentation unit tests",
      command: "npm run test -- src/presentation",
      receiptStage: "test-presentation",
      kind: "focus",
    });
  }

  if (player || browser) {
    stages.push({
      label: "Collect Playwright specs (early compile/collection)",
      command: "npx playwright test --list",
      receiptStage: "e2e-list",
      kind: "focus",
    });
  }

  if (player) {
    stages.push({
      label: "Player-facing browser proofs",
      command: "npm run test:e2e",
      receiptStage: "e2e",
      kind: options.readiness ? "readiness" : "focus",
    });
  }

  if (source) {
    stages.push({
      label: "Source validate and replay",
      command: "npm run source:validate && npm run source:replay",
      receiptStage: "source",
      kind: options.readiness ? "readiness" : "focus",
    });
  }

  if (art) {
    stages.push({
      label: "Art validation trio",
      command:
        "npm run validate:art && npm run inventory:art && npm run qa:art",
      receiptStage: "art",
      kind: options.readiness ? "readiness" : "focus",
    });
  }

  if (release) {
    stages.push({
      label: "Release declaration range",
      command: "npm run release:check",
      receiptStage: "release-check",
      kind: "focus",
    });
  }

  if (options.readiness) {
    stages.push({
      label: "Repository validation aggregate",
      command: "npm run validate",
      receiptStage: "validate",
      kind: "readiness",
    });
  }

  const seen = new Set();
  return stages.filter((stage) => {
    if (seen.has(stage.command)) return false;
    seen.add(stage.command);
    return true;
  });
}

function gitChangedFiles() {
  const run = (args) =>
    execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  try {
    const upstream = run(["rev-parse", "--abbrev-ref", "@{upstream}"]);
    if (upstream) {
      const base = run(["merge-base", "HEAD", "@{upstream}"]);
      return run(["diff", "--name-only", `${base}...HEAD`])
        .split("\n")
        .filter(Boolean);
    }
  } catch {
    // No upstream yet; fall back to the working tree.
  }
  const tracked = run(["diff", "--name-only", "HEAD"])
    .split("\n")
    .filter(Boolean);
  const untracked = run(["ls-files", "--others", "--exclude-standard"])
    .split("\n")
    .filter(Boolean);
  return [...tracked, ...untracked];
}

function printPlan(stages) {
  if (stages.length === 0) {
    console.log("No changed files detected. Run agent:preflight, then edit.");
    return;
  }
  console.log("Suggested cadence for changed files:\n");
  for (const stage of stages) {
    console.log(`- [${stage.kind}] ${stage.label}`);
    console.log(`  command: ${stage.command}`);
    console.log(
      `  receipt: node scripts/agent-run-receipt.mjs --stage ${stage.receiptStage} --out .agent-receipts -- ${stage.command}`,
    );
    console.log("");
  }
  console.log(
    "Record readiness with --readiness. Prior receipts from other heads are historical until re-run.",
  );
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const readiness = process.argv.includes("--readiness");
  const json = process.argv.includes("--json");
  const files = process.argv.includes("--files")
    ? process.argv.slice(process.argv.indexOf("--files") + 1)
    : gitChangedFiles();
  const stages = planCadence(files, { readiness });

  if (json) {
    console.log(JSON.stringify({ files, stages }, null, 2));
  } else {
    printPlan(stages);
  }
}
