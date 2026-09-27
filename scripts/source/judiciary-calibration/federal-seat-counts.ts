/** Source-only seat table. No World writes or runtime imports. */
import { readFileSync, writeFileSync } from "node:fs";
import {
  assertValidArtifactLock,
  normalizeRetrievedText,
  openProductionArtifacts,
  toCanonicalJson,
} from "../../../src/source/core/index";
import type { ArtifactLock } from "../../../src/source/core/index";
import { readTwoColumnTable } from "../../../src/source/domains/federal-courts/parse";

const root = "data/source/judiciary-calibration";
const lock = JSON.parse(
  readFileSync(`${root}/artifact-lock.json`, "utf8"),
) as ArtifactLock;
assertValidArtifactLock(lock);
const input = openProductionArtifacts("judiciary-calibration", lock, {
  supreme: "usc28-1",
  circuits: "usc28-44",
  districts: "usc28-133",
});
const records: {
  kind: string;
  publishedLabel: string;
  allocation: "single-court" | "joint-districts";
  districtLabels: string[];
  authorizedSeats: number;
  termYears?: number;
  holdsUntilSuccessorQualified?: boolean;
  artifactId: string;
  sha256: string;
  citation: string;
  row: number;
  sourceCurrentThrough: string | null;
}[] = [];
for (const [role, opened] of Object.entries(input.artifacts)) {
  const html = Buffer.from(opened.bytes).toString("utf8");
  const start = html.indexOf("<!-- field-start:statute -->");
  const end = html.indexOf("<!-- field-end:statute -->", start);
  if (start < 0 || end <= start)
    throw new Error(`${role}: missing operative-text boundaries`);
  const markup = html.slice(start, end);
  const section = role === "supreme" ? "1" : role === "circuits" ? "44" : "133";
  const sourceCurrentThrough =
    /laws in effect on ([A-Za-z]+ \d{1,2}, \d{4})/.exec(
      normalizeRetrievedText(Buffer.from(html)),
    )?.[1] ?? null;
  const evidence = {
    artifactId: opened.artifact.artifactId,
    sha256: opened.artifact.bytes.sha256,
    citation: `28 U.S.C. ${section}${role === "supreme" ? "" : "(a)"}`,
    sourceCurrentThrough,
  };
  if (role === "supreme") {
    const expected =
      "a Chief Justice of the United States and eight associate justices";
    if (!normalizeRetrievedText(Buffer.from(markup)).includes(expected))
      throw new Error("Supreme Court composition text changed");
    records.push({
      kind: "supreme",
      publishedLabel: "Supreme Court of the United States",
      allocation: "single-court",
      districtLabels: [],
      authorizedSeats: 9,
      row: 1,
      ...evidence,
    });
    continue;
  }
  const table = /<table\b[^>]*>[\s\S]*?<\/table>/.exec(markup)?.[0];
  if (!table) throw new Error(`${role}: missing seat table`);
  let parent = "";
  let rowNumber = 0;
  for (const match of table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)) {
    const row = match[0];
    const cells = readTwoColumnTable({
      identifier: section,
      number: section,
      heading: "",
      paragraphs: [],
      markup: row,
    });
    if (!cells.length && /<th\b/.test(row)) continue;
    if (cells.length !== 1) throw new Error(`${role}: malformed table row`);
    rowNumber += 1;
    const [label, value] = cells[0]!.map((cell) =>
      normalizeRetrievedText(Buffer.from(cell)),
    );
    if (!value && label?.endsWith(":")) {
      parent = label.slice(0, -1);
      continue;
    }
    if (!label || !value || !/^\d+\.?$/.test(value))
      throw new Error(`${role}: unrecognized seat count ${value}`);
    const nested = /class="left2em"/.test(row);
    if (nested && !parent) throw new Error("District row lacks state heading");
    if (!nested) parent = "";
    const districts =
      role === "districts" && nested
        ? label
            .replace(/,? and /g, ", ")
            .split(/,\s*/)
            .map((part) => `${parent}: ${part}`)
        : role === "districts"
          ? [label]
          : [];
    records.push({
      allocation: districts.length > 1 ? "joint-districts" : "single-court",
      districtLabels: districts,
      kind: role === "circuits" ? "circuit" : "district",
      publishedLabel: nested ? `${parent}: ${label}` : label,
      authorizedSeats: Number(value.replace(/\.$/, "")),
      row: rowNumber,
      ...evidence,
    });
  }
}
const territorial = openProductionArtifacts("judiciary-calibration", lock, {
  guam: "usc48-1424b",
  virginIslands: "usc48-1614",
  northernMariana: "usc48-1821",
});
for (const opened of Object.values(territorial.artifacts)) {
  const html = Buffer.from(opened.bytes).toString("utf8");
  const start = html.indexOf("<!-- field-start:statute -->");
  const end = html.indexOf("<!-- field-end:statute -->", start);
  if (start < 0 || end <= start)
    throw new Error("Missing territorial operative text");
  const statute = normalizeRetrievedText(Buffer.from(html.slice(start, end)));
  const match =
    /appoint (a judge|two judges) for the (District Court (?:of|for) (?:the )?(?:Guam|Virgin Islands|Northern Mariana Islands)),? who shall hold office for (?:the term|terms) of ten years and until (?:his successor is|their successors are) chosen and qualified/.exec(
      statute,
    );
  if (!match)
    throw new Error(
      `${opened.artifact.artifactId}: territorial composition text changed`,
    );
  const section = opened.artifact.artifactId.replace("usc48-", "");
  records.push({
    kind: "district",
    allocation: "single-court",
    publishedLabel: match[2]!,
    districtLabels: [match[2]!],
    authorizedSeats: match[1] === "a judge" ? 1 : 2,
    termYears: 10,
    holdsUntilSuccessorQualified: true,
    artifactId: opened.artifact.artifactId,
    sha256: opened.artifact.bytes.sha256,
    citation: `48 U.S.C. ${section}${section === "1821" ? "(b)(1)" : "(a)"}`,
    row: 1,
    sourceCurrentThrough:
      /laws in effect on ([A-Za-z]+ \d{1,2}, \d{4})/.exec(
        normalizeRetrievedText(Buffer.from(html)),
      )?.[1] ?? null,
  });
}
const keys = new Set(records.map((r) => `${r.kind}:${r.publishedLabel}`));
if (keys.size !== records.length)
  throw new Error("Duplicate statutory seat row");
const output = toCanonicalJson({
  compilerVersion: "2",
  runtimeWired: false,
  limits:
    "Statutory table counts only; Joint rows allocate shared judgeships across the listed districts and must not be counted once per district. No current vacancies, judicial geography join, inferred. Territorial district appointments are recorded separately from Article III seats; temporary assignments do not add permanent seats. Notes and later operative changes require separate review.",
  records,
});
const path = `${root}/federal-seat-counts.json`;
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error("Federal seat table differs; regenerate");
} else if (process.argv.includes("--write")) writeFileSync(path, output);
else throw new Error("Use --write or --check");
console.log(
  JSON.stringify({
    rows: records.length,
    jointDistrictAllocations: records.filter(
      (r) => r.allocation === "joint-districts",
    ),
    byKind: Object.fromEntries(
      ["supreme", "circuit", "district"].map((kind) => [
        kind,
        records.filter((r) => r.kind === kind).length,
      ]),
    ),
  }),
);
