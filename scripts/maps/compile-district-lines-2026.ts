/**
 * compile:district-lines-2026 — U.S. House lines for the 2026 general election.
 *
 *   npm run compile:district-lines-2026 -- --acquire   # download missing locked files first
 *   npm run compile:district-lines-2026                # compile from the locked cache
 *   npm run compile:district-lines-2026 -- --lock      # (re)write the lock from the cache
 *
 * Input, all from the U.S. Census Bureau:
 * - the 120th Congress block equivalency files (which district each 2020 census
 *   block is in), published for every state whose plan changed;
 * - the 2020 block-to-place assignment files;
 * - the 2025 TIGER/Line 2020 block layers, for each block's land area.
 *
 * Output: data/research/district-lines-2026/lines-2026.json. Raw files stay in
 * the ignored `.source-cache/` and are verified against the lock.
 *
 * A state is compiled only when its plan differs from the 119th Congress plan.
 * The Census 120th file for Missouri also differs, because it carries the 2025
 * plan; a court has kept that plan out of use for 2026, so Missouri is left out
 * and stays on its 2022 lines (CTO ruling, September 28, 2026).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  listZipMembers,
  readZipMember,
  readZipMemberEntry,
} from "../../src/source/core/archive/zip";
import {
  LINES_2026_DIRECTORY,
  LINES_2026_FILE,
  LINES_2026_VINTAGE,
  type Lines2026,
  type PlaceLines,
  type StateLines2026,
} from "./lines-2026-overlay";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const LOCK_PATH = join(ROOT, LINES_2026_DIRECTORY, "artifact-lock.json");
const CACHE = join(ROOT, ".source-cache/district-lines-2026");

const BEF_BASE =
  "https://www2.census.gov/programs-surveys/decennial/rdo/mapping-files/2027/120-congressional-district-befs";
const BAF_BASE = "https://www2.census.gov/geo/docs/maps-data/data/baf2020";
const BLOCK_BASE = "https://www2.census.gov/geo/tiger/TIGER2025/TABBLOCK20";

/** States whose 120th Congress plan differs from the 119th (measured). */
const CHANGED: readonly (readonly [string, string])[] = [
  ["01", "AL"],
  ["06", "CA"],
  ["12", "FL"],
  ["22", "LA"],
  ["37", "NC"],
  ["39", "OH"],
  ["47", "TN"],
  ["48", "TX"],
  ["49", "UT"],
];
interface LockArtifact {
  readonly artifactId: string;
  readonly file: string;
  readonly url: string;
  readonly bytes: number;
  readonly sha256: string;
}
interface Lock {
  readonly note: string;
  readonly retrievedOn: string;
  readonly artifacts: LockArtifact[];
}

function wanted(): { artifactId: string; file: string; url: string }[] {
  const list = [
    {
      artifactId: "census-bef-cd120",
      file: "cd120.zip",
      url: `${BEF_BASE}/cd120.zip`,
    },
    {
      artifactId: "census-bef-cd120-block-splits",
      file: "CD120_BlockSplits.pdf",
      url: `${BEF_BASE}/CD120_BlockSplits.pdf`,
    },
  ];
  for (const [fips, usps] of CHANGED) {
    list.push({
      artifactId: `census-baf-2020-place-${usps.toLowerCase()}`,
      file: `BlockAssign_ST${fips}_${usps}.zip`,
      url: `${BAF_BASE}/BlockAssign_ST${fips}_${usps}.zip`,
    });
    list.push({
      artifactId: `census-tiger-2025-tabblock20-${usps.toLowerCase()}`,
      file: `tl_2025_${fips}_tabblock20.zip`,
      url: `${BLOCK_BASE}/tl_2025_${fips}_tabblock20.zip`,
    });
  }
  return list;
}

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const log = (message: string) =>
  process.stdout.write(`[district-lines-2026] ${message}\n`);
const args = new Set(process.argv.slice(2));

async function ensureCached(file: string, url: string): Promise<Buffer> {
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    if (!args.has("--acquire")) {
      throw new Error(`${path} is missing. Re-run with --acquire.`);
    }
    log(`downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Download of ${url} failed: HTTP ${response.status}`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(path);
}

function readLock(): Lock | null {
  return existsSync(LOCK_PATH)
    ? (JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Lock)
    : null;
}

/** Block GEOID to land flag, from the layer's dBASE table (no geometry read). */
function blockLandFlags(archive: Buffer): Map<string, boolean> {
  const member = listZipMembers(archive).find((entry) =>
    entry.path.endsWith(".dbf"),
  );
  if (!member) throw new Error("Block archive has no .dbf table.");
  const dbf = readZipMemberEntry(archive, member);
  const count = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  const fields: { name: string; offset: number; length: number }[] = [];
  let offset = 1;
  for (let at = 32; dbf[at] !== 0x0d; at += 32) {
    const name = dbf.toString("latin1", at, at + 11).replace(/\0+$/, "");
    const length = dbf[at + 16] as number;
    fields.push({ name, offset, length });
    offset += length;
  }
  const geoid = fields.find((field) => field.name === "GEOID20");
  const land = fields.find((field) => field.name === "ALAND20");
  if (!geoid || !land) throw new Error("Block table lacks GEOID20 or ALAND20.");
  const out = new Map<string, boolean>();
  for (let row = 0; row < count; row += 1) {
    const base = headerLength + row * recordLength;
    const id = dbf
      .toString(
        "latin1",
        base + geoid.offset,
        base + geoid.offset + geoid.length,
      )
      .trim();
    const area = Number(
      dbf
        .toString(
          "latin1",
          base + land.offset,
          base + land.offset + land.length,
        )
        .trim(),
    );
    if (!Number.isFinite(area))
      throw new Error(`Block ${id} has an unreadable land area.`);
    out.set(id, area > 0);
  }
  return out;
}

function compileState(
  stateFips: string,
  stateUsps: string,
  bef: Buffer,
  baf: Buffer,
  blocks: Buffer,
): StateLines2026 {
  const districtOf = new Map<string, string>();
  const befLines = readZipMember(bef, `CD120_${stateFips}.txt`)
    .toString("utf8")
    .split(/\r?\n/);
  const befHeader = (befLines.shift() ?? "").split(",");
  if (befHeader.join(",") !== "GEOID,STATEFP,COUNTYFP,TRACTCE,BLOCKCE,CDFP")
    throw new Error(`Unexpected 120th Congress file layout: ${befHeader}`);
  for (const line of befLines) {
    if (!line) continue;
    const cells = line.split(",");
    districtOf.set(cells[0] as string, cells[5] as string);
  }

  const placeOf = new Map<string, string>();
  const placeLines = readZipMember(
    baf,
    `BlockAssign_ST${stateFips}_${stateUsps}_INCPLACE_CDP.txt`,
  )
    .toString("utf8")
    .split(/\r?\n/);
  if (placeLines.shift() !== "BLOCKID|PLACEFP")
    throw new Error("Unexpected block-to-place file layout.");
  for (const line of placeLines) {
    if (!line) continue;
    const [block, place] = line.split("|");
    if (place) placeOf.set(block as string, place);
  }

  const hasLand = blockLandFlags(blocks);
  if (hasLand.size !== districtOf.size)
    throw new Error(
      `${stateUsps}: ${hasLand.size} blocks in the layer but ${districtOf.size} in the district file.`,
    );

  const countyLand = new Map<string, Set<string>>();
  const placeAll = new Map<string, Set<string>>();
  const placeLandSet = new Map<string, Set<string>>();
  const placeResidual = new Set<string>();
  for (const [block, code] of districtOf) {
    const land = hasLand.get(block);
    if (land === undefined)
      throw new Error(`${stateUsps}: block ${block} is not in the layer.`);
    if (land && code !== "ZZ") {
      const county = block.slice(2, 5);
      const set = countyLand.get(county) ?? new Set<string>();
      set.add(code);
      countyLand.set(county, set);
    }
    const place = placeOf.get(block);
    if (!place) continue;
    if (code === "ZZ") {
      placeResidual.add(place);
      continue;
    }
    const all = placeAll.get(place) ?? new Set<string>();
    all.add(code);
    placeAll.set(place, all);
    if (land) {
      const set = placeLandSet.get(place) ?? new Set<string>();
      set.add(code);
      placeLandSet.set(place, set);
    }
  }

  const sorted = (set: Set<string> | undefined) => [...(set ?? [])].sort();
  const counties: Record<string, string | string[]> = {};
  for (const county of [...countyLand.keys()].sort()) {
    const codes = sorted(countyLand.get(county));
    counties[county] = codes.length === 1 ? (codes[0] as string) : codes;
  }
  const places: Record<string, PlaceLines> = {};
  const placeCodes = new Set([...placeAll.keys(), ...placeResidual]);
  for (const place of [...placeCodes].sort()) {
    const all = sorted(placeAll.get(place));
    const landCodes = sorted(placeLandSet.get(place));
    const land = landCodes.length ? landCodes : all;
    const residual = placeResidual.has(place);
    places[place] =
      all.length === 1 && land.length === 1 && land[0] === all[0] && !residual
        ? (all[0] as string)
        : { land, all, residual };
  }
  return { stateFips, stateUsps, counties, places };
}

async function main(): Promise<void> {
  const items = wanted();
  const existing = readLock();
  const artifacts: LockArtifact[] = [];
  const buffers = new Map<string, Buffer>();
  for (const item of items) {
    const bytes = await ensureCached(item.file, item.url);
    const digest = sha256(bytes);
    const locked = existing?.artifacts.find(
      (entry) => entry.artifactId === item.artifactId,
    );
    if (!args.has("--lock")) {
      if (!locked)
        throw new Error(`${item.file} is not in the lock; run with --lock.`);
      if (locked.sha256 !== digest || locked.bytes !== bytes.length)
        throw new Error(`${item.file} does not match the lock.`);
    }
    artifacts.push({
      artifactId: item.artifactId,
      file: item.file,
      url: item.url,
      bytes: bytes.length,
      sha256: digest,
    });
    if (!item.file.endsWith(".pdf")) buffers.set(item.file, bytes);
  }
  if (args.has("--lock")) {
    const lock: Lock = {
      note: "U.S. Census Bureau files, public domain. Raw archives stay in the ignored .source-cache and are verified here. The 120th Congress block equivalency files carry the plans states submitted for the 2026 election; the block split report is documentation.",
      retrievedOn: "2026-09-29",
      artifacts,
    };
    mkdirSync(dirname(LOCK_PATH), { recursive: true });
    writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
    log(`wrote ${LOCK_PATH}`);
  }

  const bef = buffers.get("cd120.zip") as Buffer;
  const states: Record<string, StateLines2026> = {};
  for (const [fips, usps] of CHANGED) {
    log(`compiling ${usps}`);
    states[fips] = compileState(
      fips,
      usps,
      bef,
      buffers.get(`BlockAssign_ST${fips}_${usps}.zip`) as Buffer,
      buffers.get(`tl_2025_${fips}_tabblock20.zip`) as Buffer,
    );
  }
  const payload: Lines2026 = {
    format: "ocd-district-lines-2026/v1",
    vintage: LINES_2026_VINTAGE,
    asOf: "2026-08-24",
    states,
  };
  mkdirSync(join(ROOT, LINES_2026_DIRECTORY), { recursive: true });
  writeFileSync(join(ROOT, LINES_2026_FILE), `${JSON.stringify(payload)}\n`);
  const totals = Object.values(states).map(
    (state) =>
      `${state.stateUsps} ${Object.keys(state.places).length} places, ${Object.keys(state.counties).length} counties`,
  );
  log(totals.join("; "));
}

await main();
