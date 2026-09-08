// Civic-prose blind-evaluation harness CLI.
//
//   npm run prose:eval -- hygiene
//     Fail if holdout-eval material leaks into the civic-prose skill/agent.
//
//   npm run prose:eval -- ground <packet-file> <output-file>
//     Run the deterministic grounding gate over one candidate output and print
//     PASS or the specific unsupported claims. Never rewrites prose.
//
//   npm run prose:eval -- probes
//     Run the deterministic gate over every fresh grounding probe in
//     scripts/prose-eval/fixtures/grounding/ and report mismatches.
//
//   npm run prose:eval -- verify-review <reviewer-reply-file>
//     Enforce the grounding reviewer's verdict. Reads the reviewer's reply from
//     a file (its deterministic development interface) and exits zero only when
//     that reply is exactly a valid GROUNDING: PASS under the contract. Any
//     UNSUPPORTED, malformed, partial, extra-text, ambiguous, or empty reply
//     exits non-zero. It never rewrites prose and never scores style; the mere
//     presence of reviewer output is not a pass.
//
//   npm run prose:eval -- bundle <run-dir> [seed]
//     Read raw outputs from <run-dir>/raw/<PACKET>__<CONFIG>.md (CONFIG one of
//     A|B|C|D), write anonymized per-packet review files to <run-dir>/review/
//     and the sealed version->configuration mapping to <run-dir>/mapping.json.
//     The mapping stays out of the owner-facing review surface until verdicts
//     are locked. Run directories live under prose-eval-runs/ (gitignored).
//
// This tooling never judges prose. Owner preference is decisive; no model
// judge is called anywhere in the harness.

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  CONFIG_IDS,
  buildPacketBundle,
  scanHoldoutHygiene,
  type ConfigId,
  type RawOutput,
} from "./lib";
import {
  checkGrounding,
  formatGroundingReport,
  parseReviewerVerdict,
} from "./grounding";
import { loadProbes } from "./probes";

// Everything the holdout-hygiene hard rule names: the Skill, both prose agents,
// the fresh grounding probes, and the grounding tests. Retired holdout packets
// may not appear in any of them.
const SKILL_ROOTS = [
  ".agents/skills/civic-prose",
  ".codex/agents/civic-prose-writer.toml",
  ".codex/agents/civic-prose-grounding-reviewer.toml",
  ".claude/skills/civic-prose",
  ".claude/agents/civic-prose-writer.md",
  ".claude/agents/civic-prose-grounding-reviewer.md",
  "scripts/prose-eval/fixtures/grounding",
  "scripts/prose-eval/grounding.test.ts",
];

function listFilesRecursive(path: string): string[] {
  const entries = readdirSync(path, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? listFilesRecursive(child) : [child];
  });
}

function runHygiene(): number {
  const paths = SKILL_ROOTS.flatMap((root) =>
    statSync(root).isDirectory() ? listFilesRecursive(root) : [root],
  );
  const files = paths.map((path) => ({
    path,
    content: readFileSync(path, "utf8"),
  }));
  const violations = scanHoldoutHygiene(files);
  if (violations.length === 0) {
    console.log(
      `hygiene: OK — ${files.length} skill/agent files carry no holdout material`,
    );
    return 0;
  }
  for (const violation of violations) {
    console.error(`hygiene: ${violation.path}: ${violation.reason}`);
  }
  return 1;
}

function parseRawFilename(
  name: string,
): { packetId: string; config: ConfigId } | null {
  const match = /^(.+)__([ABCD])\.(md|txt)$/.exec(name);
  if (!match) return null;
  return { packetId: match[1], config: match[2] as ConfigId };
}

function runBundle(runDir: string, seed: string): number {
  const rawDir = join(runDir, "raw");
  const byPacket = new Map<string, RawOutput[]>();
  for (const name of readdirSync(rawDir)) {
    const parsed = parseRawFilename(name);
    if (!parsed) {
      console.error(
        `bundle: unrecognized raw file "${name}" — expected <PACKET>__<A|B|C|D>.md`,
      );
      return 1;
    }
    const content = readFileSync(join(rawDir, name), "utf8");
    const outputs = byPacket.get(parsed.packetId) ?? [];
    outputs.push({ packetId: parsed.packetId, config: parsed.config, content });
    byPacket.set(parsed.packetId, outputs);
  }
  if (byPacket.size === 0) {
    console.error(`bundle: no raw outputs found in ${rawDir}`);
    return 1;
  }
  const reviewDir = join(runDir, "review");
  mkdirSync(reviewDir, { recursive: true });
  const mapping: Record<
    string,
    { versionSources: Record<string, string>; parseProblems: object }
  > = {};
  for (const [packetId, outputs] of [...byPacket.entries()].sort()) {
    const seen = new Set(outputs.map((output) => output.config));
    for (const config of CONFIG_IDS.slice(0, 3)) {
      if (!seen.has(config)) {
        console.error(
          `bundle: packet ${packetId} is missing configuration ${config}; ` +
            `A, B, and C are required (D is optional)`,
        );
        return 1;
      }
    }
    const bundle = buildPacketBundle(packetId, outputs, seed);
    writeFileSync(join(reviewDir, `${packetId}.md`), bundle.reviewMarkdown);
    mapping[packetId] = {
      versionSources: bundle.versionSources,
      parseProblems: bundle.parseProblems,
    };
    const problems = Object.entries(bundle.parseProblems).filter(
      ([, list]) => list.length > 0,
    );
    for (const [config, list] of problems) {
      console.warn(
        `bundle: packet ${packetId} config ${config} result-shape issues: ${list.join("; ")} ` +
          `(kept verbatim — do not clean outputs before judging)`,
      );
    }
  }
  writeFileSync(
    join(runDir, "mapping.json"),
    JSON.stringify({ seed, packets: mapping }, null, 2) + "\n",
  );
  writeFileSync(
    join(runDir, "MAPPING-README.txt"),
    "mapping.json identifies which configuration produced each anonymized\n" +
      "version. Do NOT open it, share it, or show it to the owner until all\n" +
      "Wave verdicts are locked. Review files in review/ are the only\n" +
      "owner-facing surface.\n",
  );
  console.log(
    `bundle: wrote ${byPacket.size} review files to ${reviewDir} (mapping sealed in ${runDir}/mapping.json)`,
  );
  return 0;
}

function runGround(packetPath: string, outputPath: string): number {
  const report = checkGrounding(
    readFileSync(packetPath, "utf8"),
    readFileSync(outputPath, "utf8"),
  );
  const text = formatGroundingReport(report);
  if (report.pass) {
    console.log(text);
    return 0;
  }
  console.error(text);
  return 1;
}

function runVerifyReview(replyPath: string): number {
  const reply = readFileSync(replyPath, "utf8");
  const verdict = parseReviewerVerdict(reply);
  if (verdict.pass) {
    console.log("REVIEW: PASS — reviewer returned a clean GROUNDING: PASS");
    return 0;
  }
  if (verdict.malformed) {
    console.error(
      "REVIEW: REJECTED — reviewer reply is not a valid verdict under the " +
        "contract (empty, malformed, partial, ambiguous, or a PASS wrapped in " +
        "other text). A gate never passes on unverifiable output.",
    );
    return 1;
  }
  console.error("REVIEW: UNSUPPORTED — reviewer reported unsupported claims:");
  for (const claim of verdict.claims) {
    console.error(`  - ${claim}`);
  }
  return 1;
}

function runProbes(): number {
  const probes = loadProbes();
  let failures = 0;
  for (const probe of probes) {
    const report = checkGrounding(probe.packet, probe.output);
    const expected = probe.expectPass ? "PASS" : `FAIL ${probe.expectedRule}`;
    const rules = report.findings.map((finding) => finding.rule);
    const ok = probe.expectPass
      ? report.pass
      : !report.pass && rules.includes(probe.expectedRule!);
    if (ok) {
      console.log(`probe ${probe.id}: OK (${expected})`);
    } else {
      failures += 1;
      console.error(
        `probe ${probe.id}: expected ${expected}, got ` +
          (report.pass ? "PASS" : `FAIL ${rules.join(",")}`),
      );
    }
  }
  console.log(
    `probes: ${probes.length - failures}/${probes.length} grounding probes behaved as specified`,
  );
  return failures === 0 ? 0 : 1;
}

const [command, ...args] = process.argv.slice(2);
let exitCode: number;
switch (command) {
  case "hygiene":
    exitCode = runHygiene();
    break;
  case "ground": {
    const packetPath = args[0];
    const outputPath = args[1];
    if (!packetPath || !outputPath) {
      console.error("usage: prose:eval ground <packet-file> <output-file>");
      exitCode = 1;
      break;
    }
    exitCode = runGround(packetPath, outputPath);
    break;
  }
  case "probes":
    exitCode = runProbes();
    break;
  case "verify-review": {
    const replyPath = args[0];
    if (!replyPath) {
      console.error("usage: prose:eval verify-review <reviewer-reply-file>");
      exitCode = 1;
      break;
    }
    exitCode = runVerifyReview(replyPath);
    break;
  }
  case "bundle": {
    const runDir = args[0];
    if (!runDir) {
      console.error("usage: prose:eval bundle <run-dir> [seed]");
      exitCode = 1;
      break;
    }
    exitCode = runBundle(runDir, args[1] ?? "wave-1");
    break;
  }
  default:
    console.error(
      "usage: prose:eval <hygiene | ground <packet-file> <output-file> | " +
        "probes | verify-review <reviewer-reply-file> | bundle <run-dir> [seed]>",
    );
    exitCode = 1;
}
process.exit(exitCode);
