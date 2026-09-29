/**
 * Map check for the dissolved 2026 district outlines: run the same method on
 * the 119th Congress block file and compare with the shipped Census outlines,
 * then look for gaps, overlaps and overshoot in the 120th Congress outlines.
 * `npx tsx scripts/maps/check-district-outlines-2026.ts UT[,TX...]`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readZipMember } from "../../src/source/core/archive/zip";
import { dissolveDistricts, RingIndex } from "./district-outlines-2026";
import { readShapefileArchive, type Ring } from "./shapefile";

const ROOT = join(import.meta.dirname, "..", "..");
const LINES = join(ROOT, ".source-cache/district-lines-2026");
const CB = join(ROOT, ".source-cache/map-geometry/genz2025");
const STATES: Record<string, string> = {
  AL: "01",
  CA: "06",
  FL: "12",
  LA: "22",
  NC: "37",
  OH: "39",
  TN: "47",
  TX: "48",
  UT: "49",
};

const cd119 = readShapefileArchive(
  readFileSync(join(CB, "cb_2025_us_cd119_500k.zip")),
).records;
const states = readShapefileArchive(
  readFileSync(join(CB, "cb_2025_us_state_500k.zip")),
).records;
const bef120 = readFileSync(join(LINES, "cd120.zip"));
const national119 = readZipMember(
  readFileSync(join(LINES, "cd119.zip")),
  "NationalCD119.txt",
).toString("utf8");

function district119(fips: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of national119.split("\n")) {
    if (line.startsWith(fips)) {
      const [id, cd] = line.trim().split(",");
      out.set(id as string, cd as string);
    }
  }
  return out;
}
function district120(fips: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = readZipMember(bef120, `CD120_${fips}.txt`)
    .toString("utf8")
    .split(/\r?\n/);
  lines.shift();
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(",");
    out.set(cells[0] as string, cells[5] as string);
  }
  return out;
}

const want = (process.argv[2] ?? Object.keys(STATES).join(",")).split(",");
for (const usps of want) {
  const fips = STATES[usps] as string;
  const outline = states.find((r) => r.attributes.STATEFP === fips)!
    .rings as Ring[];
  const footprint = new RingIndex(outline);
  const blocks = readFileSync(join(LINES, `tl_2025_${fips}_tabblock20.zip`));
  const shipped = new Map<string, RingIndex>();
  for (const r of cd119.filter((x) => x.attributes.STATEFP === fips))
    shipped.set(
      r.attributes.CD119FP as string,
      new RingIndex(r.rings as Ring[]),
    );
  const started = Date.now();
  const run = (label: string, map: Map<string, string>) => {
    const { districts, stats } = dissolveDistricts(blocks, map, outline);
    return {
      label,
      index: new Map([...districts].map(([c, r]) => [c, new RingIndex(r)])),
      stats,
      districts,
    };
  };
  const r119 = run("119", district119(fips));
  const r120 = run("120", district120(fips));
  console.log(
    `${usps} dissolved in ${((Date.now() - started) / 1000).toFixed(0)}s`,
    JSON.stringify({ ...r120.stats, ringsByDistrict: undefined }),
  );
  // Sample a grid across the state.
  const [x0, y0, x1, y1] = footprint.bbox;
  const N = 500;
  const tally = {
    inside: 0,
    sameAs119: 0,
    gap119: 0,
    overlap119: 0,
    over119: 0,
    gap120: 0,
    overlap120: 0,
    over120: 0,
    shippedGap: 0,
    shippedOverlap: 0,
  };
  for (let i = 0; i < N; i += 1)
    for (let j = 0; j < N; j += 1) {
      const lon = x0 + ((x1 - x0) * (i + 0.5)) / N;
      const lat = y0 + ((y1 - y0) * (j + 0.5)) / N;
      const inState = footprint.contains(lon, lat);
      const hit = (m: Map<string, RingIndex>) =>
        [...m].filter(([, idx]) => idx.contains(lon, lat)).map(([c]) => c);
      const s = hit(shipped),
        a = hit(r119.index),
        b = hit(r120.index);
      if (inState) {
        tally.inside += 1;
        if (s.length === 0) tally.shippedGap += 1;
        if (s.length > 1) tally.shippedOverlap += 1;
        if (a.length === 0) tally.gap119 += 1;
        if (a.length > 1) tally.overlap119 += 1;
        if (b.length === 0) tally.gap120 += 1;
        if (b.length > 1) tally.overlap120 += 1;
        if (a.length === 1 && s.length === 1 && a[0] === s[0])
          tally.sameAs119 += 1;
      } else {
        if (a.length) tally.over119 += 1;
        if (b.length) tally.over120 += 1;
      }
    }
  const pct = (n: number) => `${((100 * n) / tally.inside).toFixed(3)}%`;
  console.log(
    `${usps} samples in state ${tally.inside}: shipped119 gap ${pct(tally.shippedGap)} overlap ${pct(tally.shippedOverlap)} | dissolved119 agrees with shipped ${pct(tally.sameAs119)}, gap ${pct(tally.gap119)}, overlap ${pct(tally.overlap119)}, overshoot ${pct(tally.over119)} | dissolved120 gap ${pct(tally.gap120)}, overlap ${pct(tally.overlap120)}, overshoot ${pct(tally.over120)}`,
  );
}
