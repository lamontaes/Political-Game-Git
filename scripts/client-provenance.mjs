/**
 * Compile-time identity of dist/client.
 *
 * The provenance file is written after Vite finishes and hashed over every
 * other file in the client tree. Staging refuses to copy a tree whose stamp
 * does not match the checkout that is about to claim it.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const provenanceFileName = ".build-provenance.json";

export function hashClientTree(clientDir) {
  if (!existsSync(clientDir)) {
    throw new Error(`No compiled client at ${clientDir}.`);
  }
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name !== provenanceFileName)
        files.push(full);
    }
  }
  walk(clientDir);
  files.sort((a, b) => a.localeCompare(b));
  const hash = createHash("sha256");
  for (const file of files) {
    const rel = path.relative(clientDir, file).split(path.sep).join("/");
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function readProvenance(clientDir) {
  const file = path.join(clientDir, provenanceFileName);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.sourceRevision !== "string") return null;
    if (typeof parsed.treeSha256 !== "string") return null;
    if (typeof parsed.profile !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function defaultComposition({ head, main, branch }) {
  if (head && main && head === main) return "accepted-main";
  const short = head ? head.slice(0, 7) : "unknown";
  const name = branch && branch !== "HEAD" ? branch : "detached";
  return `working:${name}@${short}`;
}

export function assertCompositionAllowed(composition, { head, main }) {
  if (composition === "accepted-main" && head && main && head !== main) {
    throw new Error(
      `composition "accepted-main" is only for a checkout whose HEAD is origin/main (${main.slice(0, 7)}); this tree is ${head.slice(0, 7)}. Pass --composition explicitly.`,
    );
  }
}

export function assertProvenanceMatches({
  clientDir,
  expectedRevision,
  expectedDirty,
}) {
  if (!existsSync(path.join(clientDir, "index.html"))) {
    throw new Error(
      `No compiled client at ${clientDir}. Run \`npm run build\` at the repository root first; staging never builds the game itself.`,
    );
  }
  const provenance = readProvenance(clientDir);
  if (provenance === null) {
    throw new Error(
      "Compiled client has no build provenance. Re-run `npm run build`; staging will not stamp a newer HEAD onto stale output.",
    );
  }
  if (statSync(path.join(clientDir, "index.html")).isDirectory()) {
    throw new Error(`Compiled client at ${clientDir} is not a file tree.`);
  }
  if (provenance.sourceRevision !== expectedRevision) {
    throw new Error(
      `Compiled client was built from ${provenance.sourceRevision}, not ${expectedRevision}. Re-run \`npm run build\` or pass --rebuild.`,
    );
  }
  if (Boolean(provenance.dirty) !== Boolean(expectedDirty)) {
    throw new Error(
      "Compiled client dirty flag does not match this checkout. Re-run `npm run build` or pass --rebuild.",
    );
  }
  const treeSha256 = hashClientTree(clientDir);
  if (treeSha256 !== provenance.treeSha256) {
    throw new Error(
      "Compiled client files do not match their provenance hash. Re-run `npm run build` or pass --rebuild.",
    );
  }
  return { provenance, treeSha256 };
}
