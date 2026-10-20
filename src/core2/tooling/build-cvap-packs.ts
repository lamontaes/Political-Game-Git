/**
 * Reduces the Census Bureau's citizen voting-age population special tabulation
 * (2019-2023 ACS, block group level; U.S. government work) to one pack per
 * state beside the neighborhood packs: each block group's citizen voting-age
 * people, and the Hispanic and, among the rest, White, Black, American Indian
 * and Alaska Native and Asian alone parts (the remainder is "other"). The
 * estimates carry sampling error; a block group's own figure is rough, a
 * district's sum is firm.
 * Usage: npx tsx src/core2/tooling/build-cvap-packs.ts <path to CVAP_2019-2023_ACS_csv_files.zip>
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const zip = process.argv[2];
if (!zip) throw new Error("Usage: build-cvap-packs.ts <zip>");
const out = join(import.meta.dirname, "../data/neighborhoods/cvap");
const fips: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
  "72": "PR",
};
/** Rows of the tabulation we keep, by `lnnumber`, and the field each fills. */
const rows: Record<string, number> = {
  "1": 0,
  "13": 1,
  "7": 2,
  "5": 3,
  "3": 4,
  "4": 5,
};

function cells(line: string): string[] {
  const out: string[] = [];
  let cell = "",
    quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cell);
      cell = "";
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

const packs: Record<string, Record<string, number[]>> = {};
const child = spawn("unzip", ["-p", zip, "BlockGr.csv"], {
  stdio: ["ignore", "pipe", "inherit"],
});
let first = true;
for await (const line of createInterface({ input: child.stdout })) {
  if (first) {
    first = false;
    continue;
  }
  const c = cells(line);
  const at = rows[c[3]!];
  if (at === undefined) continue;
  const geoid = c[2]!.split("US")[1]!;
  const state = fips[geoid.slice(0, 2)];
  if (!state) continue;
  const unit = ((packs[state] ??= {})[geoid] ??= [0, 0, 0, 0, 0, 0]);
  unit[at] = Number(c[6]);
}
for (const [state, units] of Object.entries(packs)) {
  writeFileSync(
    join(out, `${state}.json`),
    JSON.stringify({
      source:
        "U.S. Census Bureau, Citizen Voting Age Population by Race and Ethnicity, 2019-2023 ACS 5-year special tabulation, block group; U.S. government work. Estimates are rounded to five and carry sampling error.",
      fields: [
        "cvap",
        "cvapHispanic",
        "cvapNhWhite",
        "cvapNhBlack",
        "cvapNhAIAN",
        "cvapNhAsian",
      ],
      units,
    }),
  );
}
console.log(
  Object.keys(packs).length,
  Object.values(packs).reduce((n, u) => n + Object.keys(u).length, 0),
);
