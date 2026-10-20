/**
 * Fetches the USGS county-level estimate of water use for 2015 (ver. 2.0,
 * U.S. Geological Survey data release, https://doi.org/10.5066/F7TB15V5, a
 * U.S. government work) and reduces its irrigation columns to the file the
 * groundwater-law handler reads: per county, the fresh groundwater and
 * surface water withdrawn for irrigation (million gallons a day) and the acres
 * irrigated (thousand acres).
 * Usage: npx tsx src/core2/tooling/build-groundwater-use.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const url =
  "https://www.sciencebase.gov/catalog/file/get/5af3311be4b0da30c1b245d8?f=__disk__eb%2F74%2Feb%2Feb74ebb41169c76aaf374990bd5a71cac82604c1";
const text = new TextDecoder("latin1").decode(
  await (await fetch(url)).arrayBuffer(),
);

/** One CSV record, quotes and embedded commas handled. */
function parse(line: string): string[] {
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

const lines = text.split(/\r?\n/).filter((line) => line.length);
const header = parse(lines[1]!);
const col = (name: string) => {
  const at = header.indexOf(name);
  if (at < 0) throw new Error(`USGS water use file lacks ${name}`);
  return at;
};
const [fips, groundwater, surface, acres] = [
  col("FIPS"),
  col("IR-WGWFr"),
  col("IR-WSWFr"),
  col("IR-IrTot"),
];
const num = (value: string | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const counties: Record<string, [number, number, number]> = {};
const dry: string[] = [];
let gw = 0,
  sw = 0;
for (const line of lines.slice(2)) {
  const row = parse(line);
  const id = row[fips]!.padStart(5, "0");
  if (!/^\d{5}$/.test(id)) continue;
  const g = num(row[groundwater]),
    s = num(row[surface]);
  // A county that irrigates nothing is listed apart: a farm there pumps no irrigation water.
  if (g + s <= 0) {
    dry.push(id);
    continue;
  }
  counties[id] = [g, s, num(row[acres])];
  gw += g;
  sw += s;
}
writeFileSync(
  join(import.meta.dirname, "../data/laws/groundwater-irrigation-2015.json"),
  `${JSON.stringify(
    {
      source:
        "USGS, Estimated Use of Water in the United States County-Level Data for 2015 (ver. 2.0, June 2018), https://doi.org/10.5066/F7TB15V5; U.S. government work. Columns IR-WGWFr (irrigation, fresh groundwater withdrawals), IR-WSWFr (fresh surface water) in million gallons a day and IR-IrTot (acres irrigated) in thousand acres.",
      fields: ["groundwaterMgd", "surfaceMgd", "irrigatedThousandAcres"],
      nationalGroundwaterShare: gw / (gw + sw),
      dryCounties: dry.sort(),
      counties,
    },
    null,
    1,
  )}\n`,
);
console.log(Object.keys(counties).length, gw / (gw + sw));
