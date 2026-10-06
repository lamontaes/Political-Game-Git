/* global Buffer, console, process */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_MATERIAL_EXTENSION =
  /\.(?:p12|pfx|p8|pem|key|cer|mobileprovision|provisionprofile)$/iu;
const PRIVATE_KEY_MARKER = new RegExp(
  ["-----BEGIN ", "(?:[A-Z0-9 ]+ )?", "PRIVATE KEY", "-----"].join(""),
  "u",
);
const CERTIFICATE_MARKER = new RegExp(
  ["-----BEGIN ", "CERTIFICATE", "-----"].join(""),
  "u",
);
const PROVIDER_SECRET_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
];
const GENERIC_KEY_VALUE =
  /(?:api[_-]?key|secret|access[_-]?token|password)\s*[:=]\s*["'`]([A-Za-z0-9+/=_-]{24,})["'`]/iu;
// The preserved public Cornell Legal Information Institute HTML embeds a
// browser-visible third-party API key.
// This exact content hash exempts only that sourced public value; changing
// the value or path makes the secret scan fail again.
const PUBLIC_SOURCE_KEY_HASHES = new Map([
  [
    "data/source/constitutional-process/raw/us-proposal-denominator.html",
    "b23975947f2f614e65248976084a74a85a3ed655a929f5c970910a4eb918027c",
  ],
]);

function hasSecretPattern(filePath, text) {
  if (
    PRIVATE_KEY_MARKER.test(text) ||
    CERTIFICATE_MARKER.test(text) ||
    PROVIDER_SECRET_PATTERNS.some((pattern) => pattern.test(text))
  )
    return true;
  const genericKey = GENERIC_KEY_VALUE.exec(text);
  if (!genericKey) return false;
  const approvedHash = PUBLIC_SOURCE_KEY_HASHES.get(filePath);
  return (
    !approvedHash ||
    createHash("sha256").update(genericKey[1]).digest("hex") !== approvedHash
  );
}

function isTextContent(bytes) {
  return !bytes.subarray(0, Math.min(bytes.length, 8192)).includes(0);
}

export function inspectTrackedEntry(filePath, content) {
  const findings = [];
  const baseName = path.basename(filePath);
  if (/^\.env(?:$|\.)/iu.test(baseName))
    findings.push({ path: filePath, reason: "environment file is tracked" });
  if (FORBIDDEN_MATERIAL_EXTENSION.test(filePath))
    findings.push({
      path: filePath,
      reason: "signing key or certificate file is tracked",
    });
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (
    isTextContent(bytes) &&
    hasSecretPattern(filePath, bytes.toString("utf8"))
  )
    findings.push({ path: filePath, reason: "key-like material is present" });
  return findings;
}

export function scanTrackedEntries(entries) {
  return entries.flatMap(({ path: filePath, content }) =>
    inspectTrackedEntry(filePath, content),
  );
}

export function scanTrackedFiles(root = process.cwd()) {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const findings = [];
  for (const relativePath of tracked) {
    const content = readFileSync(path.join(root, relativePath));
    findings.push(...inspectTrackedEntry(relativePath, content));
  }
  return findings;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const findings = scanTrackedFiles();
  if (findings.length) {
    console.error(`Secret scan found ${findings.length} issue(s):`);
    for (const finding of findings)
      console.error(`- ${finding.path}: ${finding.reason}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Secret scan passed: no tracked credentials or signing material found.",
    );
  }
}
