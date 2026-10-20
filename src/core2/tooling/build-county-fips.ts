/**
 * Writes the county FIPS code of every county, by state postal code and county
 * name, from the county file of the Census Bureau's citizen voting-age
 * tabulation (U.S. government work), so county-keyed data (the 2024
 * presidential vote) can be joined to block groups.
 * Usage: npx tsx src/core2/tooling/build-county-fips.ts <path to CVAP_2019-2023_ACS_csv_files.zip>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const zip = process.argv[2];
if (!zip) throw new Error("Usage: build-county-fips.ts <zip>");
const text = execFileSync("unzip", ["-p", zip, "County.csv"], {
  encoding: "latin1",
  maxBuffer: 64 * 1024 * 1024,
});
const abbreviations: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "Puerto Rico": "PR",
};
const fips: Record<string, string> = {};
for (const line of text.split(/\r?\n/).slice(1)) {
  // "Autauga County, Alabama",Total,0500000US01001,1,...
  const m = /^"([^"]+), ([^",]+)",Total,0500000US(\d{5}),/.exec(line);
  if (!m) continue;
  const usps = abbreviations[m[2]!];
  if (usps) fips[`${usps}|${m[1]}`] = m[3]!;
}
writeFileSync(
  join(import.meta.dirname, "../data/census/county-fips.json"),
  `${JSON.stringify(
    {
      source:
        "U.S. Census Bureau, Citizen Voting Age Population by Race and Ethnicity, 2019-2023 ACS special tabulation, county file; U.S. government work. Keys are the state's postal code and the county's name.",
      fips,
    },
    null,
    1,
  )}\n`,
);
console.log(Object.keys(fips).length);
