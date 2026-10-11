/** Scan every emitted file, including maps and server assets. Research stays local. */
import { createHash } from "node:crypto";
import process from "node:process";
import console from "node:console";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalize = (text) =>
  text
    .replace(
      /\\u\{([\da-f]+)\}|\\u([\da-f]{4})|\\x([\da-f]{2})/gi,
      (_, wide, narrow, hex) =>
        String.fromCodePoint(parseInt(wide ?? narrow ?? hex, 16)),
    )
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\\?['’]/g, "'")
    .toLowerCase();

export function shippingPolicy(root = process.cwd()) {
  const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
  const corpusPath = "data/source/electoral-calibration-2024/corpus.json";
  const corpus = read(corpusPath);
  const names = [
    ...new Set([
      ...corpus.governors.map((row) => row.officeholderName),
      "Jon Ossoff",
      "Raphael G. Warnock",
      "Raphael Warnock",
      "Phil Murphy",
    ]),
  ];
  const electoral = read(
    "data/source/electoral-calibration-2024/artifact-lock.json",
  );
  const salaries = read("data/source/book-of-the-states/artifact-lock.json");
  const identifyingSourceIds = new Set(
    corpus.governors.flatMap((row) => row.sourceIds),
  );
  const captures = [
    {
      path: corpusPath,
      sha256: sha256(readFileSync(resolve(root, corpusPath))),
    },
    ...[...electoral.artifacts, ...salaries.artifacts].map((row) => ({
      path: row.localPath,
      sha256: row.sha256,
    })),
  ];
  return {
    names,
    captures,
    forbiddenText: [
      ...electoral.artifacts
        .filter((row) => identifyingSourceIds.has(row.id))
        .map((row) => row.url),
      ...salaries.artifacts.flatMap((row) => [
        row.url,
        row.localPath.split("/").at(-1),
        row.sha256,
      ]),
      "officeholderName",
      "data/source/electoral-calibration-2024",
      "NGA-printed term in progress",
    ],
  };
}

export function inspectShippingBytes(bytes, policy) {
  const text = normalize(bytes.toString("utf8"));
  const failures = [];
  for (const name of policy.names)
    if (text.includes(normalize(name))) failures.push(`real-name:${name}`);
  for (const token of policy.forbiddenText)
    if (text.includes(normalize(token)))
      failures.push(`research-or-salary-token:${token}`);
  const digest = sha256(bytes);
  for (const capture of policy.captures)
    if (digest === capture.sha256)
      failures.push(`research-capture:${capture.path}`);
  return failures;
}

export function scanShippingDirectory(directory, policy) {
  const inventory = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const target = resolve(path, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile()) {
        const bytes = readFileSync(target);
        inventory.push({
          file: relative(directory, target),
          bytes: bytes.length,
          sha256: sha256(bytes),
          failures: inspectShippingBytes(bytes, policy),
        });
      } else throw new Error(`Unexpected shipped filesystem entry: ${target}`);
    }
  }
  walk(directory);
  if (!inventory.length)
    throw new Error("Empty shipping directory cannot establish absence");
  return {
    schema: "data-shipping-scan/v1",
    directory: relative(process.cwd(), directory),
    namesChecked: policy.names.length,
    researchDigestsChecked: policy.captures.length,
    filesChecked: inventory.length,
    bytesChecked: inventory.reduce((sum, row) => sum + row.bytes, 0),
    violations: inventory.filter((row) => row.failures.length),
    inventory,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = resolve(process.argv[2] ?? "dist");
  const result = scanShippingDirectory(directory, shippingPolicy());
  if (process.argv[3])
    writeFileSync(
      resolve(process.argv[3]),
      JSON.stringify(result, null, 2) + "\n",
    );
  console.log(JSON.stringify({ ...result, inventory: undefined }));
  if (result.violations.length) process.exitCode = 1;
}
