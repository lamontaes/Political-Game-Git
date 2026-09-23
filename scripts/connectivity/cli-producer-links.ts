/**
 * Check and render the producer-and-reader map.
 *
 *   cli-producer-links.ts check
 *   cli-producer-links.ts render [--write]
 *
 * `render --write` puts the document at docs/connectivity/WHO-READS-WHAT.md.
 * The Drive copy is that file, published by whichever lane changed a link.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  PRODUCER_LINK_DIRECTORY,
  renderProducerLinks,
  validateProducerLinks,
  type ProducerLinkEntry,
} from "../../src/connectivity/producer-links";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const documentPath = path.join(
  repositoryRoot,
  "docs/connectivity/WHO-READS-WHAT.md",
);

export function loadProducerLinks(root: string): ProducerLinkEntry[] {
  const directory = path.join(root, PRODUCER_LINK_DIRECTORY);
  const entries: ProducerLinkEntry[] = [];
  for (const file of fs.readdirSync(directory).sort()) {
    if (!file.endsWith(".json")) continue;
    const entry = JSON.parse(
      fs.readFileSync(path.join(directory, file), "utf8"),
    ) as ProducerLinkEntry;
    if (`${entry.linkId}.json` !== file) {
      throw new Error(
        `${file}: its linkId is '${entry.linkId}'. The filename is the id.`,
      );
    }
    entries.push(entry);
  }
  return entries;
}

function head(): string {
  try {
    const run = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
    const commit = run("rev-parse", "--short", "HEAD");
    const dirty = run("status", "--porcelain", "--", PRODUCER_LINK_DIRECTORY);
    return dirty ? `${commit}, with link entries not yet committed,` : commit;
  } catch {
    return "an unknown commit";
  }
}

const [command, ...rest] = process.argv.slice(2);
const entries = loadProducerLinks(repositoryRoot);
const findings = validateProducerLinks(entries, (repositoryPath) =>
  fs.existsSync(path.join(repositoryRoot, repositoryPath)),
);
for (const finding of findings) {
  console.error(`ERROR ${finding.linkId}: ${finding.message}`);
}

if (command === "check") {
  console.log(`${entries.length} producers, ${findings.length} errors.`);
  process.exit(findings.length > 0 ? 1 : 0);
} else if (command === "render") {
  if (findings.length > 0) process.exit(1);
  const document = renderProducerLinks(entries, {
    generatedAt: new Date().toISOString(),
    head: head(),
  });
  if (rest.includes("--write")) {
    fs.writeFileSync(documentPath, document);
    console.log(`Wrote ${path.relative(repositoryRoot, documentPath)}.`);
  } else {
    process.stdout.write(document);
  }
} else {
  console.error("Usage: cli-producer-links.ts check | render [--write]");
  process.exit(2);
}
