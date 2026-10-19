/**
 * Reads each state's resident population for 2020 and 2024 from the BEA
 * regional accounts (CAINC1 line 2, data/source/bea-regional/raw/CAINC1.zip;
 * U.S. government work) beside the 2020 Census apportionment population
 * (data/research/apportionment/apportionment-2020.json) and writes the file the
 * census count projects from.
 * Usage: npx tsx src/core2/tooling/build-state-population-path.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");
const zip = join(root, "data/source/bea-regional/raw/CAINC1.zip");
const apportionment = JSON.parse(
  readFileSync(
    join(root, "data/research/apportionment/apportionment-2020.json"),
    "utf8",
  ),
) as {
  states: { state: string; apportionmentPopulation: number }[];
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

const states: Record<
  string,
  { apportionment2020: number; resident2020: number; resident2024: number }
> = {};
for (const row of apportionment.states) {
  const text = execFileSync(
    "unzip",
    ["-p", zip, `CAINC1_${row.state}_1969_2024.csv`],
    { encoding: "latin1", maxBuffer: 64 * 1024 * 1024 },
  );
  const lines = text.split(/\r?\n/);
  const header = cells(lines[0]!);
  const at2020 = header.indexOf("2020"),
    at2024 = header.indexOf("2024");
  // The state's own row: FIPS ending 000, line 2 (population).
  const line = lines.find((l) => {
    const c = cells(l);
    return c[0]?.trim().endsWith('000"') || /^\s*"?\d\d000"?\s*$/.test(c[0]!)
      ? c[4]!.trim() === "2"
      : false;
  });
  if (!line) throw new Error(`No state population row for ${row.state}`);
  const c = cells(line);
  states[row.state] = {
    apportionment2020: row.apportionmentPopulation,
    resident2020: Number(c[at2020]),
    resident2024: Number(c[at2024]),
  };
}
writeFileSync(
  join(root, "src/core2/data/census/state-population-path.json"),
  `${JSON.stringify(
    {
      source:
        "U.S. Bureau of Economic Analysis, Regional Economic Accounts CAINC1 line 2 (population, July 1 estimates) for 2020 and 2024, and the 2020 Census apportionment population by state (U.S. Census Bureau, Table 1); U.S. government works.",
      states,
    },
    null,
    1,
  )}\n`,
);
console.log(Object.keys(states).length);
