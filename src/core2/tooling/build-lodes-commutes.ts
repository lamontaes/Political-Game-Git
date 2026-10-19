/**
 * Reduces the Census LEHD LODES8 origin-destination tables (all jobs, JT00;
 * U.S. government work) to one file: for each county where workers live, how
 * many hold a job and how many of those work in the same county. The files are
 * streamed, never stored.
 * Usage: npx tsx src/core2/tooling/build-lodes-commutes.ts [year]
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";

const year = process.argv[2] ?? "2022";
const states = [
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "dc",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
];
/** county FIPS of residence -> [resident workers, those working in the same county]. */
const counties: Record<string, [number, number]> = {};
const used = new Set<string>();
for (const state of states) {
  // A state's file lists the pairs where the worker lives in the state; a
  // worker living here and working elsewhere is in its "aux" file.
  for (const part of ["main", "aux"]) {
    // The newest year the state's file exists for: a few states publish later than the rest.
    let res: Response | undefined;
    for (let y = Number(year); y >= 2014; y -= 1) {
      const url = `https://lehd.ces.census.gov/data/lodes/LODES8/${state}/od/${state}_od_${part}_JT00_${y}.csv.gz`;
      const got = await fetch(url);
      if (got.ok && got.body) {
        res = got;
        used.add(`${state}:${String(y)}`);
        break;
      }
    }
    if (!res?.body) throw new Error(`no LODES8 ${part} file for ${state}`);
    const lines = createInterface({
      input: Readable.fromWeb(res.body as never).pipe(createGunzip()),
    });
    let first = true;
    for await (const line of lines) {
      if (first) {
        first = false;
        continue;
      }
      // w_geocode,h_geocode,S000,...
      const cells = line.split(",");
      const work = cells[0]!.slice(0, 5),
        home = cells[1]!.slice(0, 5),
        jobs = Number(cells[2]);
      const row = (counties[home] ??= [0, 0]);
      row[0] += jobs;
      if (work === home) row[1] += jobs;
    }
  }
  console.log(state, Object.keys(counties).length);
}
writeFileSync(
  join(import.meta.dirname, "../data/laws/lodes-commutes.json"),
  `${JSON.stringify(
    {
      source: `U.S. Census Bureau, LEHD Origin-Destination Employment Statistics LODES8, all jobs (JT00), ${year}; U.S. government work. Each county of residence: [workers living there, those who also work in that county], from the main files (live and work in the state) and aux files (live here, work out of state).`,
      year,
      yearsUsed: [...used].sort(),
      counties,
    },
    null,
    1,
  )}\n`,
);
