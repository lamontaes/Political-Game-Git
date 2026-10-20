/**
 * Compiles neighborhood make-up from the 2020 Census P.L. 94-171 redistricting
 * files (U.S. Census Bureau; U.S. government works) into one pack per state:
 * for every block group, its total and voting-age population split by
 * Hispanic origin and, among those not Hispanic, by race. The numbers are for
 * a unit of land, never a field on a person. Each state's zip is downloaded to
 * a working folder, read with `unzip -p`, reduced and deleted.
 * Usage: npx tsx src/core2/tooling/build-neighborhood-packs.ts <work-dir>
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const work = process.argv[2];
if (!work) throw new Error("Usage: build-neighborhood-packs.ts <work-dir>");
mkdirSync(work, { recursive: true });
const out = join(import.meta.dirname, "../data/neighborhoods");

const states: [string, string][] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District_of_Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New_Hampshire"],
  ["NJ", "New_Jersey"],
  ["NM", "New_Mexico"],
  ["NY", "New_York"],
  ["NC", "North_Carolina"],
  ["ND", "North_Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["PR", "Puerto_Rico"],
  ["RI", "Rhode_Island"],
  ["SC", "South_Carolina"],
  ["SD", "South_Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West_Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
];

/** Lines of one member of the zip, streamed. */
async function* lines(zip: string, member: string): AsyncGenerator<string> {
  const child = spawn("unzip", ["-p", zip, member], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  for await (const line of createInterface({ input: child.stdout })) yield line;
}

/** Columns of a PL file after LOGRECNO: the table's cells in order. */
const cell = (cells: string[], first: number, n: number) =>
  Number(cells[first + n - 1]);

for (const [usps, name] of states) {
  const lower = usps.toLowerCase();
  const zip = join(work, `${lower}2020.pl.zip`);
  const url = `https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/${name}/${lower}2020.pl.zip`;
  execFileSync("curl", ["-sf", "-m", "900", "-o", zip, url]);
  // Block groups are summary level 150; the geographic header joins them by LOGRECNO.
  const geoid = new Map<string, string>();
  for await (const line of lines(zip, `${lower}geo2020.pl`)) {
    const c = line.split("|");
    if (c[2] === "150") geoid.set(c[7]!, c[8]!.split("US")[1]!);
  }
  const units: Record<string, number[]> = {};
  // Segment 1: P1 (race, 71 cells) then P2 (Hispanic origin by race, 73 cells), after five key columns.
  for await (const line of lines(zip, `${lower}000012020.pl`)) {
    const c = line.split("|");
    const id = geoid.get(c[4]!);
    if (!id) continue;
    const p2 = 5 + 71;
    units[id] = [
      cell(c, p2, 1), // total
      cell(c, p2, 2), // Hispanic or Latino
      cell(c, p2, 5), // not Hispanic, White alone
      cell(c, p2, 6), // Black alone
      cell(c, p2, 7), // American Indian and Alaska Native alone
      cell(c, p2, 8), // Asian alone
      cell(c, p2, 9) + cell(c, p2, 10) + cell(c, p2, 11), // Pacific Islander, other, two or more
    ];
  }
  // Segment 2: P3 (voting-age race, 71 cells) then P4 (voting-age Hispanic origin by race, 73 cells).
  for await (const line of lines(zip, `${lower}000022020.pl`)) {
    const c = line.split("|");
    const id = geoid.get(c[4]!);
    if (!id) continue;
    const p4 = 5 + 71;
    units[id]!.push(
      cell(c, p4, 1),
      cell(c, p4, 2),
      cell(c, p4, 5),
      cell(c, p4, 6),
      cell(c, p4, 7),
      cell(c, p4, 8),
      cell(c, p4, 9) + cell(c, p4, 10) + cell(c, p4, 11),
    );
  }
  rmSync(zip);
  writeFileSync(
    join(out, `${usps}.json`),
    JSON.stringify({
      source:
        "U.S. Census Bureau, 2020 Census Redistricting Data (P.L. 94-171) Summary File, tables P2 and P4 at the block group; U.S. government work.",
      fields: [
        "population",
        "hispanic",
        "nhWhite",
        "nhBlack",
        "nhAIAN",
        "nhAsian",
        "nhOther",
        "vap",
        "vapHispanic",
        "vapNhWhite",
        "vapNhBlack",
        "vapNhAIAN",
        "vapNhAsian",
        "vapNhOther",
      ],
      units,
    }),
  );
  console.log(usps, Object.keys(units).length);
}
