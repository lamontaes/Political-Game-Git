import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { readZipMember, readXlsxSheet } from "../../src/source/core/index";
import { compileEducation } from "../../src/source/domains/education/index";
import { sha256HexOfUtf8, toCanonicalJson } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
const corpus = compileEducation(
  JSON.parse(
    readFileSync("data/source/education/artifact-lock.json", "utf8"),
  ) as ArtifactLock,
);
// Source compilation is Node-only; runtime fetches inert, versioned data only on panel opening.
mkdirSync("public/education", { recursive: true });
const lock = JSON.parse(
  readFileSync("data/source/education/artifact-lock.json", "utf8"),
) as ArtifactLock;
const capabilities: Record<string, { label: string; kind: string }> = {};
const ic = readZipMember(
  readFileSync("data/source/education/raw/IC2024_Dict.zip"),
  "ic2024.xlsx",
);
for (const r of readXlsxSheet(ic, "Varlist").rows)
  if (r[1] && /^(LEVEL\d|NONCRDT[1-8]$)/.test(r[1]))
    capabilities[r[1]] = {
      label: r[6]!,
      kind: r[1].startsWith("LEVEL") ? "award" : "noncredit",
    };
const ccd = readZipMember(
  readFileSync("data/source/education/raw/ccd-2024-25.zip"),
  "SY 2024-25 School Directory Companion 2025-046d.xlsx",
);
for (const r of readXlsxSheet(ccd, "File Layout").rows)
  if (r[1] && /^G_.+_OFFERED$/.test(r[1]))
    capabilities[r[1]] = { label: r[6]!, kind: "grade" };
const dictionary = {
  capabilities,
  hashes: Object.fromEntries(
    lock.artifacts.map((a) => [a.artifactId, a.bytes.sha256]),
  ),
};
const chunks = [];
for (const kind of ["postsecondary", "school", "district"]) {
  const records = corpus.records.filter((r) => r[1] === kind);
  const data = JSON.stringify({ version: 1, dictionary, records }) + "\n";
  const digest = sha256HexOfUtf8(data);
  const path = `catalog-${digest}.json`;
  writeFileSync(`public/education/${path}`, data);
  chunks.push({ kind, path, sha256: digest, recordCount: records.length });
}
writeFileSync(
  "public/education/manifest.json",
  toCanonicalJson({
    version: 1,
    chunks,
    recordCount: corpus.records.length,
    source: corpus.corpus,
  }),
);
console.log(
  `Exported ${corpus.records.length} institutions in ${chunks.length} lazy chunks`,
);
