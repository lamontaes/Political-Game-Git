/** Scan every emitted file, including maps and server assets. Research stays local. */
import { createHash } from "node:crypto";
import process from "node:process";
import console from "node:console";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
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

// Recent presidents, vice presidents and sitting justices. Real school names honor some of them, so the school catalogs
// are allowed to carry these names until the owner rules on school names
// (docs/legal/legal-check-2026-10-12.md).
const PRESIDENT_NAMES = [
  "Jimmy Carter",
  "Ronald Reagan",
  "George H. W. Bush",
  "George W. Bush",
  "Bill Clinton",
  "Barack Obama",
  "Donald Trump",
  "Joe Biden",
  "Joseph R. Biden",
  // Vice presidents and sitting Supreme Court justices: distinctive full names.
  "JD Vance",
  "J.D. Vance",
  "Kamala Harris",
  "Mike Pence",
  "Dick Cheney",
  "Al Gore",
  "Clarence Thomas",
  "Samuel Alito",
  "Sonia Sotomayor",
  "Elena Kagan",
  "Neil Gorsuch",
  "Brett Kavanaugh",
  "Amy Coney Barrett",
  "Ketanji Brown Jackson",
];
// The bundles that embed the school catalog carry the same names.
const FEDERAL_NAME_ALLOWED_IN =
  /(^|[\\/])(education[\\/]catalog-|client[\\/]assets[\\/].*(worker|preload-helper).*\.js$)/;

// "Last, First Middle" rows of the Federal Judicial Center service file become "First Last".
function federalJudgeNames(read) {
  const names = new Set();
  const lines = readFileSync(
    resolve(read.root, "data/source/judiciary-calibration/raw/fjc-service.csv"),
    "utf8",
  ).split("\n");
  for (const line of lines.slice(1)) {
    const match = line.match(/^"[^"]*","[^"]*","([^"]*)"/);
    if (!match) continue;
    const [last, rest] = match[1].split(/,\s*/);
    const first = rest?.split(" ")[0];
    if (!last || !first || first.length < 3) continue;
    names.add(`${first} ${last.replace(/ (Jr\.|Sr\.|II|III|IV)$/, "")}`);
  }
  return [...names];
}

export function shippingPolicy(root = process.cwd()) {
  const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
  read.root = root;
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
    federalNames: PRESIDENT_NAMES,
    // Full-name matches for 3,996 judges collide with ordinary names (school
    // catalogs, bundled data), so judges are checked in authored text only.
    judgeNames: federalJudgeNames(read),
    federalNameAllowedIn: FEDERAL_NAME_ALLOWED_IN,
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

// One pass over the words: a name matches when its words appear in order,
// each separated by a single space, as the substring search it replaces.
const federalIndexes = new WeakMap();
function federalIndex(policy) {
  let index = federalIndexes.get(policy);
  if (!index) {
    const originals = new Map();
    let maxWords = 1;
    for (const name of policy.federalNames) {
      const key = normalize(name);
      if (!originals.has(key)) originals.set(key, name);
      maxWords = Math.max(maxWords, key.split(" ").length);
    }
    index = { originals, maxWords };
    federalIndexes.set(policy, index);
  }
  return index;
}
function findFederalNames(text, policy) {
  const { originals, maxWords } = federalIndex(policy);
  const words = [...text.matchAll(/[^\s"',;:()[\]{}<>/\\]+/g)];
  const found = new Set();
  for (let i = 0; i < words.length; i++) {
    let phrase = words[i][0];
    for (let n = 1; n <= maxWords; n++) {
      const trimmed = phrase.replace(/[.!?]+$/, "");
      if (originals.has(phrase)) found.add(originals.get(phrase));
      else if (originals.has(trimmed)) found.add(originals.get(trimmed));
      const next = words[i + n];
      if (!next) break;
      const end = words[i + n - 1].index + words[i + n - 1][0].length;
      if (next.index - end !== 1 || text[end] !== " ") break;
      phrase += " " + next[0];
    }
  }
  return [...found].map((name) => `real-name:${name}`);
}

export function inspectShippingBytes(bytes, policy, file = "") {
  const text = normalize(bytes.toString("utf8"));
  const failures = [];
  for (const name of policy.names)
    if (text.includes(normalize(name))) failures.push(`real-name:${name}`);
  if (policy.federalNames && !policy.federalNameAllowedIn.test(file))
    failures.push(...findFederalNames(text, policy));
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
          failures: inspectShippingBytes(
            bytes,
            policy,
            relative(directory, target),
          ),
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
  if (process.argv[3]) {
    // test-results/ is gitignored, so a fresh checkout (CI packaging job) lacks it.
    const out = resolve(process.argv[3]);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  }
  console.log(JSON.stringify({ ...result, inventory: undefined }));
  if (result.violations.length) process.exitCode = 1;
}
