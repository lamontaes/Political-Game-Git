/* global console, process */
/**
 * Mirror the runtime artwork a hub build plays with into a readable folder
 * (normally a Google Drive folder), so reviewers who only have cloud access
 * can open every image by its game path and comment on it.
 *
 *   node scripts/mirror-runtime-art.mjs --data-root <hub data> --dest <folder>
 *        [--snapshot <64-hex id>]
 *
 * Without --snapshot it mirrors what accepted main plays with, falling back to
 * the newest snapshot any track plays. Each snapshot lands once, under its id
 * prefix; bytes are re-hashed on every copy and files already mirrored are
 * verified and kept. CURRENT.md at the destination names the snapshot each
 * track uses, so a reader always knows which folder is live.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { loadContent } from "../runtime-content.mjs";
import { runtimeContentFor } from "../private-controller/private-update.mjs";

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const dataRoot = valueAfter("--data-root");
const dest = valueAfter("--dest");
const requested = valueAfter("--snapshot");
if (
  !dataRoot ||
  !dest ||
  !path.isAbsolute(dataRoot) ||
  !path.isAbsolute(dest)
) {
  console.error(
    "usage: mirror-runtime-art.mjs --data-root <abs> --dest <abs> [--snapshot <id>]",
  );
  process.exit(2);
}

const sha256 = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

const state = JSON.parse(
  readFileSync(path.join(dataRoot, "state.json"), "utf8"),
);
const cacheRoot = path.join(dataRoot, "content");
const content = requested
  ? { schema: "ocd-runtime-art/v1", id: requested, cacheRoot }
  : runtimeContentFor(state, "main");
if (!content) {
  console.error("No track plays with runtime artwork yet; nothing to mirror.");
  process.exit(1);
}
// Refuses a snapshot whose blobs are missing or altered.
loadContent(content);
const snapshot = JSON.parse(
  readFileSync(path.join(cacheRoot, "snapshots", `${content.id}.json`), "utf8"),
);

const root = path.join(dest, content.id.slice(0, 12));
let copied = 0;
let kept = 0;
for (const file of snapshot.files) {
  const target = path.join(root, ...file.path.split("/"));
  if (!target.startsWith(root + path.sep))
    throw new Error(`Snapshot path escapes the mirror: ${file.path}`);
  if (
    existsSync(target) &&
    statSync(target).size === file.bytes &&
    sha256(target) === file.sha256
  ) {
    kept += 1;
    continue;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.mirroring-${process.pid}`;
  copyFileSync(path.join(cacheRoot, "blobs", file.sha256), temporary);
  if (sha256(temporary) !== file.sha256)
    throw new Error(`Copied bytes differ: ${file.path}`);
  renameSync(temporary, target);
  copied += 1;
}
writeFileSync(
  path.join(root, "snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);

const groups = new Map();
for (const file of snapshot.files) {
  const group = file.path.split("/").slice(0, 3).join("/");
  groups.set(group, (groups.get(group) ?? 0) + 1);
}
writeFileSync(
  path.join(root, "INDEX.md"),
  [
    `# Runtime artwork ${content.id.slice(0, 12)}`,
    "",
    `Snapshot \`${content.id}\` — ${snapshot.files.length} files. Paths below are`,
    "the exact paths the game loads; the files sit at the same paths in this folder.",
    "`snapshot.json` lists every file with its SHA-256.",
    "",
    "| files | folder |",
    "| ---: | --- |",
    ...[...groups]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([group, count]) => `| ${count} | \`${group}/\` |`),
    "",
  ].join("\n"),
);

const uses = Object.entries(state.tracks ?? {}).map(([id, track]) => {
  const current = track?.current;
  const snap = current?.content?.id?.slice(0, 12) ?? "pinned pack (no mirror)";
  return `| ${id} | \`${String(current?.revision).slice(0, 12)}\` | ${snap} |`;
});
writeFileSync(
  path.join(dest, "CURRENT.md"),
  [
    "# Which artwork each game version plays",
    "",
    `Mirrored ${new Date().toISOString()}. Newest mirror: \`${content.id.slice(0, 12)}/\`.`,
    "",
    "| track | code revision | artwork folder |",
    "| --- | --- | --- |",
    ...uses,
    "",
  ].join("\n"),
);
console.log(
  JSON.stringify({
    snapshot: content.id,
    root,
    copied,
    kept,
    files: snapshot.files.length,
  }),
);
