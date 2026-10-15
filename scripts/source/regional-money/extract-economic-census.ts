/**
 * Cut the few rows the game reads out of the Census Bureau's 2022 Economic
 * Census downloads.
 *
 * The full downloads are 35 to 150 MB each and are not kept in the repository;
 * `data/source/economic-census-2022/artifact-lock.json` names each one, where
 * it came from and its SHA-256. This keeps the establishments, sales and
 * employees of the nine industries the town businesses use, for the nation and
 * for each state and D.C., taking each geography's total row (not a subset of
 * the legal form or tax status), and writes
 * `data/source/economic-census-2022/raw/business-receipts.csv`.
 *
 * Run: `node --import tsx scripts/source/regional-money/extract-economic-census.ts <folder with EC22nnBASIC.dat files>`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const ECONOMIC_CENSUS_INDUSTRIES = [
  "2381",
  "2382",
  "4441",
  "4451",
  "5411",
  "5412",
  "7225",
  "8111",
  "8121",
] as const;

const FILES = [
  "EC2223BASIC.dat",
  "EC2244BASIC.dat",
  "EC2254BASIC.dat",
  "EC2272BASIC.dat",
  "EC2281BASIC.dat",
];

export const ECONOMIC_CENSUS_EXTRACT =
  "data/source/economic-census-2022/raw/business-receipts.csv";

function extract(folder: string): string {
  const lines = ["naics,geography,establishments,receiptsThousands,employees"];
  const hashes: string[] = [];
  for (const file of FILES) {
    const bytes = readFileSync(`${folder}/${file}`);
    hashes.push(`${file} ${createHash("sha256").update(bytes).digest("hex")}`);
    const rows = bytes.toString("latin1").split("\n");
    const header = rows[0]!.replace(/^#/, "").split("|");
    const at = (name: string) => header.indexOf(name);
    for (const row of rows.slice(1)) {
      const cells = row.split("|");
      const naics = cells[at("NAICS2022")];
      if (
        !naics ||
        !(ECONOMIC_CENSUS_INDUSTRIES as readonly string[]).includes(naics)
      )
        continue;
      const geotype = cells[at("GEOTYPE")];
      const component = at("GEOCOMP") >= 0 ? cells[at("GEOCOMP")] : "00";
      const taxStatus = at("TAXSTAT") >= 0 ? cells[at("TAXSTAT")] : "00";
      if (component !== "00" || taxStatus !== "00") continue;
      const geography =
        geotype === "01" ? "US" : geotype === "02" ? cells[at("ST")] : null;
      if (!geography) continue;
      const cell = (name: string, flag: string) =>
        cells[at(flag)] ? "" : (cells[at(name)] ?? "");
      lines.push(
        [
          naics,
          geography,
          cell("ESTAB", "ESTAB_F"),
          cell("RCPTOT", "RCPTOT_F"),
          cell("EMP", "EMP_F"),
        ].join(","),
      );
    }
  }
  console.log(hashes.join("\n"));
  return `${lines.join("\n")}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const folder = process.argv[2];
  if (!folder) throw new Error("Pass the folder holding the EC22 .dat files.");
  writeFileSync(ECONOMIC_CENSUS_EXTRACT, extract(folder));
  console.log(`wrote ${ECONOMIC_CENSUS_EXTRACT}`);
}
