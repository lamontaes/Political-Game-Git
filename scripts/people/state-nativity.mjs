/* global console, process */
/**
 * Builds src/core2/data/state-nativity-2024.json: each state's adults and
 * the native-born among them, from the American Community Survey 2020-2024
 * 5-year estimates, table B05003 (sex by age by nativity and citizenship),
 * adults 18 and over. The succession module reads it to say whether someone
 * in the line is a natural-born citizen (U.S. Const. art. II, sec. 1, cl. 5).
 * Native-born is born in the United States or a U.S. island area, which is
 * how the survey counts it.
 *
 *   curl -o b05003.dat https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b05003.dat
 *   node scripts/people/state-nativity.mjs b05003.dat
 */
import { readFileSync, writeFileSync } from "node:fs";

const FIPS = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
  72: "PR",
};
const [head, ...lines] = readFileSync(process.argv[2], "utf8")
  .trim()
  .split("\n");
const names = head.split("|");
const at = (name) => names.indexOf(name);
const byUsps = {};
let native = 0;
let adults = 0;
for (const line of lines) {
  const cells = line.split("|");
  const geo = cells[0];
  if (!geo.startsWith("0400000US")) continue;
  const usps = FIPS[geo.slice(-2)];
  if (!usps) throw new Error(`No state for ${geo}`);
  const n = (key) => Number(cells[at(key)]);
  const row = [
    n("B05003_E009") + n("B05003_E020"),
    n("B05003_E008") + n("B05003_E019"),
  ];
  byUsps[usps] = row;
  if (usps !== "PR") {
    native += row[0];
    adults += row[1];
  }
}
const out = {
  version: "core2-state-nativity-acs2024-v1",
  citation:
    "U.S. Census Bureau, American Community Survey 2020-2024 5-year estimates, table B05003 (sex by age by nativity and citizenship), summary file acsdt5y2024-b05003.dat (www2.census.gov table-based summary file), states, adults 18 and over: native-born versus all. Native-born is born in the United States or a U.S. island area. Read Oct. 15, 2026.",
  columns: ["nativeAdults", "adults"],
  nationalFiftyStatesAndDc: [native, adults],
  byUsps,
};
writeFileSync(
  "src/core2/data/state-nativity-2024.json",
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  `${Object.keys(byUsps).length} states; national native share ${(native / adults).toFixed(4)}`,
);
