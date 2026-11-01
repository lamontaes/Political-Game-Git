/**
 * Group-quarters residents by major type for every locality the game can
 * draw, from the 2020 Census.
 *
 * Run: node --import tsx scripts/research/compile-group-quarters.ts <downloads> [--check]
 *
 * `<downloads>` is a folder outside the repository holding what the Census
 * Bureau publishes (data/research/group-quarters/README.md names every page):
 *
 * - `pl/<xx>2020.pl.zip`: the 2020 Census Redistricting Data (Public Law
 *   94-171) Summary File for the 50 states, D.C. and Puerto Rico. Table P5,
 *   "Group quarters population by major group quarters type", is the ten
 *   cells of file 03 after its five linking fields (technical documentation,
 *   chapter 6, data dictionary). It is published for every block as well as
 *   every place.
 * - `ia/<xx>2020.dhc.zip`: the 2020 Island Areas Censuses Demographic and
 *   Housing Characteristics Summary File for American Samoa, Guam, the
 *   Northern Mariana Islands and the U.S. Virgin Islands. Table P28, "Group
 *   quarters population by sex by age by major group quarters type", is in
 *   segment 12 (each island area's table matrix); its six sex-and-age groups
 *   summed give the same seven types as P5.
 * - `tiger/tl_2025_<ss>_place.zip`: the 2025 TIGER/Line place boundaries,
 *   the same vintage as the Gazetteer the game's locality list comes from.
 * - `acs/acsdt5y2024-b26001.dat`: the 2020-2024 ACS 5-year table B26001,
 *   total group-quarters population, used to cross-check P5, to check an
 *   estimated row and as part of its spread.
 * - `gazetteer/2024_Gaz_place_national.zip`: the 2024 Gazetteer places file,
 *   the boundaries the 2020-2024 ACS is tabulated on, for each place's land
 *   area in 2024.
 *
 * It also reads the 2025 Gazetteer places file already in the repository
 * (data/source/places/raw) for each place's ANSI code and land area.
 *
 * A locality key is a 7-digit place GEOID, an authored locality with the
 * place GEOID it stands for, or an island-area village whose Census GEOID is
 * a place (7 digits) or a county subdivision (10 digits). An island-area
 * village takes its P28 row: the game's village list was built from the same
 * 2020 files, so the boundaries are the same. A place in the 50 states, D.C.
 * or Puerto Rico is checked against its 2025 boundary: the 2020 blocks whose
 * internal points lie inside it hold some group-quarters residents, and
 *
 * 1. the 2020 P5 row for the same GEOID is used when it holds exactly those
 *    residents, type by type (the boundary did not move across any group
 *    quarters);
 * 2. otherwise the 2020 row of the same entity under an older code (same
 *    ANSI code, or the same land area within half a percent with internal
 *    points within two kilometers: a renamed post, a township that became a
 *    municipality) is used when it holds exactly those residents;
 * 3. otherwise the row is ESTIMATED. It is the block sum, unless the ACS,
 *    tabulated on the same land (2024 and 2025 Gazetteer land areas within
 *    0.1%), shows the block sum wrong: more than three margins of error and
 *    more than 50 people from the ACS estimate, and no nearer to it than the
 *    2020 row. An internal point puts a split block's facility wholly in or
 *    wholly out of the place, so a prison just outside town can land inside
 *    it. Then the row is the 2020 row plus only the boundary-crossing blocks
 *    (blocks that entered or left the 2020 place) that bring it toward the
 *    ACS, largest first. A block such a row keeps although its internal
 *    point left is taken out of the block sum of the place it now lies in,
 *    so no block is counted twice. The spread runs from the lowest to the
 *    highest of the row, the block sum, the 2020 row for the same GEOID or
 *    older code, and the ACS estimate plus or minus its margin of error (or,
 *    with none of those, the blocks within a circle of the place's land
 *    area around its internal point).
 *
 * The output is written through prettier so it is committed as generated;
 * `--check` rebuilds it and fails when the committed file differs.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { format } from "prettier";
import authoredPlaces from "../../data/research/authored-life-places.json" with { type: "json" };
import territoryPlaces from "../../src/core2/data/places/territory-places.json" with { type: "json" };
import { placeLocalities, placeStateKeys } from "../../src/core2/places";

const ROOT = resolve(import.meta.dirname, "../..");
const OUTPUT = join(
  ROOT,
  "data/research/group-quarters/census-2020-group-quarters.json",
);
const GAZETTEER = join(
  ROOT,
  "data/source/places/raw/2025_Gaz_place_national.zip",
);

/** The seven major types, in P5's cell order (P0050003-6, P0050008-10). */
export const GROUP_QUARTERS_TYPES = [
  "adultCorrectional",
  "juvenile",
  "nursing",
  "otherInstitutional",
  "college",
  "military",
  "otherNoninstitutional",
] as const;

/** The total, then the seven types. */
type Counts = number[];

/** One 2020 Census geography with its group-quarters counts. */
interface CensusUnit {
  readonly sumlev: string;
  readonly geoid: string;
  readonly name: string;
  /** PLACENS for a place, COUSUBNS for a county subdivision. */
  readonly ns: string;
  readonly aland: number;
  readonly lat: number;
  readonly lon: number;
  readonly table: "P5" | "P28";
  /**
   * For a block, the 2020 place and county subdivision it lies in, as
   * `160:<GEOID>` and `060:<GEOID>`; empty for every other geography.
   */
  readonly parents: readonly string[];
  counts: Counts;
  raw: string;
}

/**
 * Where P28 starts in each island area's segment 12: after the five linking
 * fields and the tables the area's table matrix places before it (P26 and
 * P27, 20 cells each, everywhere but American Samoa).
 */
const P28_OFFSET: Readonly<Record<string, number>> = {
  as: 5,
  gu: 5 + 20 + 20,
  mp: 5 + 20 + 20,
  vi: 5 + 20 + 20,
};
const ISLAND_AREAS = ["60", "66", "69", "78"];

/** Rule 2's tolerances for the same land: area within 0.5%, points 2 km. */
const SAME_LAND_AREA_SHARE = 0.005;
const SAME_LAND_DISTANCE_M = 2000;

/**
 * Rule 3's ACS check. The ACS is on the 2025 boundary when the 2024 and 2025
 * Gazetteer land areas are within 0.1%: of the 32,312 places in both files,
 * 29,110 kept their land area within 0.01% and 30,091 within 0.1%, about a
 * hectare in a town of ten square kilometers.
 * The block sum is wrong when it is more than three margins of error and
 * more than 50 people from the ACS estimate.
 */
const ACS_SAME_LAND_SHARE = 0.001;
const ACS_CHECK_MARGINS = 3;
const ACS_CHECK_PEOPLE = 50;

/** Every line of one member of a zip archive, streamed through `unzip -p`. */
async function* zipLines(
  zip: string,
  member: string,
  encoding: BufferEncoding,
): AsyncGenerator<string> {
  const child = spawn("unzip", ["-p", zip, member], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  child.stdout.setEncoding(encoding);
  const closed = new Promise<number>((done) =>
    child.on("close", (status) => done(status ?? 1)),
  );
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of lines) yield line;
  const code = await closed;
  if (code !== 0) throw new Error(`unzip -p ${zip} ${member} exited ${code}.`);
}

/** One member of a zip archive as bytes. */
function zipBytes(zip: string, member: string): Buffer {
  return execFileSync("unzip", ["-p", zip, member], { maxBuffer: 1 << 30 });
}

/**
 * The total-component rows of the given summary levels, by LOGRECNO. Field
 * order is the geographic header record's (technical documentation, figure
 * 2-4): SUMLEV 3, GEOCOMP 5, LOGRECNO 8, GEOID 9, STATE 13, COUNTY 15,
 * COUSUB 18, COUSUBNS 20, PLACE 30, PLACENS 32, AREALAND 85, NAME 88,
 * INTPTLAT 93, INTPTLON 94 (1-based); a block outside any place or county
 * subdivision has 99999 there. The state PL files and Guam's Island Areas
 * geographic header are Latin-1 (the documentation says UTF-8, but the
 * bytes are not: Guam's "Hagåtña" is stored as single bytes), so every file
 * is read as Latin-1; the fields read are ASCII either way.
 */
async function geographies(
  zip: string,
  member: string,
  levels: ReadonlySet<string>,
  table: "P5" | "P28",
  keep: (sumlev: string, logrecno: string) => boolean = () => true,
): Promise<{ units: Map<string, CensusUnit>; lines: number }> {
  const out = new Map<string, CensusUnit>();
  let lines = 0;
  for await (const line of zipLines(zip, member, "latin1")) {
    lines += 1;
    const cells = line.split("|", 3);
    const sumlev = cells[2]!;
    if (!levels.has(sumlev)) continue;
    const head = line.split("|", 9);
    if (head[4] !== "00" || !keep(sumlev, head[7]!)) continue;
    const all = line.split("|");
    const geoid = all[8]!;
    const at = geoid.indexOf("US");
    if (at < 0) throw new Error(`${member}: GEOID "${geoid}" has no "US".`);
    const [state, county, cousub, place] = [12, 14, 17, 29].map((i) => all[i]!);
    const parents =
      sumlev !== "750"
        ? []
        : [
            ...(place !== "99999" ? [`160:${state}${place}`] : []),
            ...(cousub !== "99999" ? [`060:${state}${county}${cousub}`] : []),
          ];
    out.set(all[7]!, {
      sumlev,
      geoid: geoid.slice(at + 2),
      name: sumlev === "750" ? "" : all[87]!,
      ns: sumlev === "160" ? all[31]! : sumlev === "060" ? all[19]! : "",
      aland: Number(all[84]),
      lat: Number(all[92]),
      lon: Number(all[93]),
      table,
      parents,
      counts: [],
      raw: "",
    });
  }
  return { units: out, lines };
}

function checkSums(counts: Counts, where: string): void {
  const [total, ...types] = counts;
  const sum = types.reduce((a, b) => a + b, 0);
  if (sum !== total)
    throw new Error(`${where}: the seven types sum to ${sum}, not ${total}.`);
}

/**
 * P5 from one state's PL zip for the given summary levels. File 03 is read
 * first and only its rows with someone in group quarters are held, so a
 * block is kept only when someone lives in group quarters there and every
 * other row reads as zeros.
 */
async function readPl(
  zip: string,
  usps: string,
  levels: ReadonlySet<string>,
): Promise<CensusUnit[]> {
  const lower = usps.toLowerCase();
  const withResidents = new Map<string, string>();
  let records = 0;
  for await (const line of zipLines(zip, `${lower}000032020.pl`, "latin1")) {
    records += 1;
    const cells = line.split("|", 6);
    if (cells[5] !== "0") withResidents.set(cells[4]!, line);
  }
  const { units, lines } = await geographies(
    zip,
    `${lower}geo2020.pl`,
    levels,
    "P5",
    (sumlev, logrecno) => sumlev !== "750" || withResidents.has(logrecno),
  );
  if (lines !== records)
    throw new Error(`${usps}: ${lines} geographies but ${records} P5 rows.`);
  for (const [logrecno, unit] of units) {
    const line = withResidents.get(logrecno);
    if (!line) {
      unit.counts = [0, 0, 0, 0, 0, 0, 0, 0];
      continue;
    }
    const p5 = line.split("|").slice(5).map(Number);
    if (p5.length !== 10 || p5.some((n) => !Number.isInteger(n) || n < 0))
      throw new Error(`${usps} LOGRECNO ${logrecno}: bad P5 row "${line}".`);
    const [total, inst, a, b, c, d, noninst, e, f, g] = p5 as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    if (inst !== a + b + c + d || noninst !== e + f + g)
      throw new Error(`${usps} ${unit.geoid}: P5 subtotals do not add up.`);
    unit.counts = [total, a, b, c, d, e, f, g];
    if (unit.sumlev !== "750") unit.raw = line;
    checkSums(unit.counts, `${usps} ${unit.geoid}`);
  }
  return [...units.values()];
}

/** P28 from one island area's DHC zip, summed to the seven types. */
async function readIslandArea(
  zip: string,
  code: string,
  levels: ReadonlySet<string>,
): Promise<CensusUnit[]> {
  const { units: geo } = await geographies(
    zip,
    `${code}geo2020.dhc`,
    levels,
    "P28",
  );
  const offset = P28_OFFSET[code]!;
  for await (const line of zipLines(zip, `${code}000122020.dhc`, "latin1")) {
    const cells = line.split("|");
    const unit = geo.get(cells[4]!);
    if (!unit) continue;
    const p28 = cells.slice(offset, offset + 63).map(Number);
    if (p28.length !== 63 || p28.some((n) => !Number.isInteger(n) || n < 0))
      throw new Error(`${code} LOGRECNO ${cells[4]}: bad P28 row.`);
    // Cell n (1-based) is p28[n - 1]. Male groups start at cells 3, 13, 23,
    // female at 34, 44, 54; each group is a subtotal, then institutionalized
    // (subtotal, then four types) and noninstitutionalized (subtotal, three).
    const cell = (n: number) => p28[n - 1]!;
    const types = [0, 0, 0, 0, 0, 0, 0];
    for (const base of [3, 13, 23, 34, 44, 54]) {
      const group = [2, 3, 4, 5, 7, 8, 9].map((step) => cell(base + step));
      if (
        cell(base) !== cell(base + 1) + cell(base + 6) ||
        cell(base + 1) !== group[0]! + group[1]! + group[2]! + group[3]! ||
        cell(base + 6) !== group[4]! + group[5]! + group[6]!
      )
        throw new Error(`${code} ${unit.geoid}: P28 subtotals do not add up.`);
      group.forEach((n, i) => (types[i]! += n));
    }
    if (cell(1) !== cell(2) + cell(33))
      throw new Error(`${code} ${unit.geoid}: P28 male and female differ.`);
    unit.counts = [cell(1), ...types];
    unit.raw = line;
    checkSums(unit.counts, `${code} ${unit.geoid}`);
  }
  return [...geo.values()];
}

/** B26001 estimate and margin of error by full GEO_ID. */
function readAcs(path: string): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
  if (lines[0] !== "GEO_ID|B26001_E001|B26001_M001")
    throw new Error(`${path}: unexpected header "${lines[0]}".`);
  for (const line of lines.slice(1)) {
    const [geoId, estimate, margin] = line.split("|");
    out.set(geoId!, [Number(estimate), Number(margin)]);
  }
  return out;
}

interface GazetteerPlace {
  readonly name: string;
  readonly ns: string;
  readonly aland: number;
  readonly lat: number;
  readonly lon: number;
}

/**
 * A Gazetteer places file: the 2025 one the game's locality list was built
 * from (pipe-delimited), or the 2024 one the 2020-2024 ACS is tabulated on
 * (tab-delimited).
 */
async function readGazetteer(
  zip: string,
  member: string,
): Promise<Map<string, GazetteerPlace>> {
  const out = new Map<string, GazetteerPlace>();
  let header: string[] | null = null;
  for await (const line of zipLines(zip, member, "utf8")) {
    const cells = line.split(/[|\t]/).map((cell) => cell.trim());
    if (!header) {
      header = cells;
      continue;
    }
    const at = (name: string) => cells[header!.indexOf(name)]!;
    out.set(at("GEOID"), {
      name: at("NAME"),
      ns: at("ANSICODE"),
      aland: Number(at("ALAND")),
      lat: Number(at("INTPTLAT")),
      lon: Number(at("INTPTLONG")),
    });
  }
  return out;
}

/** A boundary ring: longitude and latitude pairs, flat. */
type Ring = Float64Array;

/** Rings of [lon, lat] points, by GEOID, from a TIGER/Line place shapefile. */
function readBoundaries(zip: string): Map<string, Ring[]> {
  const base = zip.slice(zip.lastIndexOf("/") + 1, -".zip".length);
  // dBASE attributes: the GEOID column of each record, in shape order.
  const dbf = zipBytes(zip, `${base}.dbf`);
  const records = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  let fieldAt = 1;
  let geoidAt = -1;
  let geoidLength = 0;
  for (let at = 32; dbf[at] !== 0x0d; at += 32) {
    const name = dbf.toString("latin1", at, at + 11).replace(/\0.*$/, "");
    const length = dbf[at + 16]!;
    if (name === "GEOID") {
      geoidAt = fieldAt;
      geoidLength = length;
    }
    fieldAt += length;
  }
  if (geoidAt < 0) throw new Error(`${base}.dbf has no GEOID field.`);
  // Polygon records (shape type 5): parts and points after a 100-byte header.
  const shp = zipBytes(zip, `${base}.shp`);
  const out = new Map<string, Ring[]>();
  let at = 100;
  for (let i = 0; i < records; i += 1) {
    const start = headerLength + i * recordLength + geoidAt;
    const geoid = dbf.toString("latin1", start, start + geoidLength).trim();
    const content = at + 8;
    at = content + shp.readInt32BE(at + 4) * 2;
    if (shp.readInt32LE(content) !== 5)
      throw new Error(`${base}.shp record ${i} is not a polygon.`);
    const parts = shp.readInt32LE(content + 36);
    const points = shp.readInt32LE(content + 40);
    const starts: number[] = [];
    for (let p = 0; p < parts; p += 1)
      starts.push(shp.readInt32LE(content + 44 + p * 4));
    starts.push(points);
    const first = content + 44 + parts * 4;
    const rings: Ring[] = [];
    for (let p = 0; p < parts; p += 1) {
      const ring = new Float64Array((starts[p + 1]! - starts[p]!) * 2);
      for (let q = starts[p]!; q < starts[p + 1]!; q += 1) {
        ring[(q - starts[p]!) * 2] = shp.readDoubleLE(first + q * 16);
        ring[(q - starts[p]!) * 2 + 1] = shp.readDoubleLE(first + q * 16 + 8);
      }
      rings.push(ring);
    }
    out.set(geoid, rings);
  }
  return out;
}

/** Even-odd test of a point against every ring, so holes count as outside. */
function inside(lon: number, lat: number, rings: readonly Ring[]): boolean {
  let hit = false;
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
      const xi = ring[i * 2]!;
      const yi = ring[i * 2 + 1]!;
      const xj = ring[j * 2]!;
      const yj = ring[j * 2 + 1]!;
      if (
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      )
        hit = !hit;
    }
  }
  return hit;
}

/** Blocks' counts summed by type. */
function sumOf(blocks: Iterable<CensusUnit>): Counts {
  const sum = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const block of blocks) block.counts.forEach((n, i) => (sum[i]! += n));
  return sum;
}

/** The 2020 group-quarters blocks whose internal points lie inside a boundary. */
function blocksInside(
  blocks: readonly CensusUnit[],
  rings: Ring[],
): CensusUnit[] {
  let [west, south, east, north] = [180, 90, -180, -90];
  for (const ring of rings)
    for (let i = 0; i < ring.length; i += 2) {
      west = Math.min(west, ring[i]!);
      east = Math.max(east, ring[i]!);
      south = Math.min(south, ring[i + 1]!);
      north = Math.max(north, ring[i + 1]!);
    }
  return blocks.filter(
    (block) =>
      block.lon >= west &&
      block.lon <= east &&
      block.lat >= south &&
      block.lat <= north &&
      inside(block.lon, block.lat, rings),
  );
}

/** Meters between two points (haversine). */
function meters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(a));
}

/** The Census unit each drawable locality key stands for. */
function localityUnits(): { key: string; unit: string }[] {
  const authored = new Map<string, string>();
  for (const row of authoredPlaces as readonly {
    key: string;
    scope: string;
    sourceGeoid?: string;
  }[])
    if (row.scope === "locality" && row.sourceGeoid)
      authored.set(row.key, row.sourceGeoid);
  const territory = new Map<string, string>();
  for (const row of territoryPlaces.rows as unknown as readonly [
    string,
    string,
    string,
    string | null,
    string,
  ][])
    territory.set(row[0], row[4]);
  const out: { key: string; unit: string }[] = [];
  for (const state of placeStateKeys())
    for (const { key } of placeLocalities(state)) {
      const geoid = /^\d{7}$/.test(key)
        ? key
        : (authored.get(key) ?? territory.get(key));
      if (!geoid || !/^(\d{7}|\d{10})$/.test(geoid))
        throw new Error(
          `Locality ${key} names no Census place or subdivision.`,
        );
      out.push({ key, unit: `${geoid.length === 7 ? "160" : "060"}:${geoid}` });
    }
  return out;
}

/** A rule-3 row before the blocks kept by checks are taken out of others. */
interface BlockRow {
  readonly key: string;
  readonly name: string;
  readonly insideBlocks: readonly CensusUnit[];
  readonly blockSum: Counts;
  readonly checked: AcsChecked | undefined;
  readonly measures: readonly { low: number; high: number; what: string }[];
  readonly why: string;
}

/** A row the ACS check replaced, with the crossing blocks it took or kept. */
interface AcsChecked {
  readonly counts: Counts;
  readonly method: string;
  /** Blocks that entered the place and that the row takes. */
  readonly taken: readonly CensusUnit[];
  /** Blocks that left the place and that the row keeps. */
  readonly kept: readonly CensusUnit[];
}

/**
 * Rule 3's ACS check (see the file comment): when the ACS on the same land
 * shows the block sum wrong, the 2020 row plus only the boundary-crossing
 * blocks that bring it toward the ACS, largest first; otherwise undefined.
 */
function acsCheck({
  geoid,
  land2024,
  land2025,
  older,
  acs: [estimate, margin],
  blockSum,
  insideBlocks,
  stateBlocks,
}: {
  readonly geoid: string;
  readonly land2024: number | undefined;
  readonly land2025: number;
  readonly older: CensusUnit;
  readonly acs: readonly [number, number];
  readonly blockSum: Counts;
  readonly insideBlocks: readonly CensusUnit[];
  readonly stateBlocks: readonly CensusUnit[];
}): AcsChecked | undefined {
  if (
    land2024 === undefined ||
    Math.abs(land2024 - land2025) > ACS_SAME_LAND_SHARE * land2025
  )
    return undefined;
  const off = (total: number) => Math.abs(total - estimate);
  const offBlocks = off(blockSum[0]!);
  if (
    offBlocks <= ACS_CHECK_MARGINS * Math.max(0, margin) ||
    offBlocks <= ACS_CHECK_PEOPLE ||
    offBlocks < off(older.counts[0]!)
  )
    return undefined;
  const olderKey = `${older.sumlev}:${older.geoid}`;
  const olderBlocks = stateBlocks.filter((block) =>
    block.parents.includes(olderKey),
  );
  if (!same(sumOf(olderBlocks), older.counts))
    throw new Error(`${olderKey}: its 2020 blocks do not sum to its row.`);
  const insideSet = new Set(insideBlocks);
  const moves = [
    ...insideBlocks
      .filter((block) => !block.parents.includes(olderKey))
      .map((block) => ({ block, sign: 1, what: "entered" })),
    ...olderBlocks
      .filter((block) => !insideSet.has(block))
      .map((block) => ({ block, sign: -1, what: "left" })),
  ].sort(
    (a, b) =>
      b.block.counts[0]! - a.block.counts[0]! ||
      a.block.geoid.localeCompare(b.block.geoid),
  );
  const total = [...older.counts];
  const taken: CensusUnit[] = [];
  const kept: CensusUnit[] = [];
  const applied: string[] = [];
  const leftOut: string[] = [];
  for (const { block, sign, what } of moves) {
    const named = `block ${block.geoid} (${what}, ${block.counts[0]})`;
    if (off(total[0]! + sign * block.counts[0]!) < off(total[0]!)) {
      block.counts.forEach((n, i) => (total[i]! += sign * n));
      if (sign > 0) taken.push(block);
      applied.push(named);
    } else {
      if (sign < 0) kept.push(block);
      leftOut.push(named);
    }
  }
  checkSums(total, `${geoid} after the ACS check`);
  return {
    counts: total,
    taken,
    kept,
    method: `The 2020 P5 row of ${older.geoid} (${older.name}), ${older.counts[0]}, ${applied.length ? `plus the boundary-crossing blocks that bring it toward the ACS: ${applied.join(", ")}` : "with no boundary-crossing block, since none brings it toward the ACS"}. The 2020 P5 blocks whose internal points lie inside the 2025 TIGER/Line boundary sum to ${blockSum[0]}, which is more than ${ACS_CHECK_MARGINS} margins of error and ${ACS_CHECK_PEOPLE} people from the 2020-2024 ACS 5-year B26001 estimate of ${estimate} plus or minus ${margin} on the same land (land area ${land2024} m2 in 2024, ${land2025} m2 in 2025) and no nearer to it than the 2020 row: an internal point puts a split block's facility wholly inside or outside the place. Left out: ${leftOut.join(", ") || "none"}.`,
  };
}

function same(a: Counts, b: Counts): boolean {
  return a.every((n, i) => n === b[i]);
}
const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function compileGroupQuarters(downloads: string) {
  const localities = localityUnits();
  const census = new Map<string, CensusUnit>();
  const blocksByState = new Map<string, CensusUnit[]>();
  const plZips = readdirSync(join(downloads, "pl"))
    .filter((name) => /^[a-z]{2}2020\.pl\.zip$/.test(name))
    .sort();
  if (plZips.length !== 52)
    throw new Error(
      `Expected 52 PL zips (50 states, D.C., PR), found ${plZips.length}.`,
    );
  for (const name of plZips) {
    const zip = join(downloads, "pl", name);
    const usps = name.slice(0, 2).toUpperCase();
    const levels = new Set(["040", "060", "160", "750"]);
    const units = await readPl(zip, usps, levels);
    const state = units.find((unit) => unit.sumlev === "040")!.geoid;
    blocksByState.set(
      state,
      units.filter((unit) => unit.sumlev === "750"),
    );
    for (const unit of units)
      if (unit.sumlev !== "750")
        census.set(`${unit.sumlev}:${unit.geoid}`, unit);
  }
  for (const code of Object.keys(P28_OFFSET)) {
    const zip = join(downloads, "ia", `${code}2020.dhc.zip`);
    if (!existsSync(zip)) throw new Error(`Missing ${zip}.`);
    const levels = new Set(["040", "060", "160"]);
    for (const unit of await readIslandArea(zip, code, levels))
      census.set(`${unit.sumlev}:${unit.geoid}`, unit);
  }
  for (const unit of census.values())
    if (unit.counts.length !== 8)
      throw new Error(`${unit.sumlev}:${unit.geoid} has no data row.`);
  const acs = readAcs(join(downloads, "acs", "acsdt5y2024-b26001.dat"));
  const gazetteer = await readGazetteer(
    GAZETTEER,
    "2025_Gaz_place_national.txt",
  );
  const gazetteer2024 = await readGazetteer(
    join(downloads, "gazetteer", "2024_Gaz_place_national.zip"),
    "2024_Gaz_place_national.txt",
  );

  const unitsByState = new Map<string, CensusUnit[]>();
  for (const unit of census.values()) {
    if (unit.sumlev === "040") continue;
    const state = unit.geoid.slice(0, 2);
    unitsByState.set(state, [...(unitsByState.get(state) ?? []), unit]);
  }
  /** Rule 2: the 2020 unit for the same entity or land under an older code. */
  const predecessor = (geoid: string): CensusUnit | undefined => {
    const place = gazetteer.get(geoid);
    if (!place) return undefined;
    const candidates = (unitsByState.get(geoid.slice(0, 2)) ?? []).filter(
      (unit) => unit.geoid !== geoid,
    );
    const sameEntity = candidates.filter((unit) => unit.ns === place.ns);
    if (sameEntity.length === 1) return sameEntity[0];
    return candidates
      .filter(
        (unit) =>
          Math.abs(unit.aland - place.aland) <=
          SAME_LAND_AREA_SHARE * place.aland,
      )
      .map((unit) => ({
        unit,
        distance: meters(unit.lat, unit.lon, place.lat, place.lon),
      }))
      .filter(({ distance }) => distance <= SAME_LAND_DISTANCE_M)
      .sort((a, b) => a.distance - b.distance)[0]?.unit;
  };

  const boundaries = new Map<string, Map<string, Ring[]>>();
  const boundaryOf = (geoid: string): Ring[] => {
    const state = geoid.slice(0, 2);
    if (!boundaries.has(state)) {
      const zip = join(downloads, "tiger", `tl_2025_${state}_place.zip`);
      if (!existsSync(zip))
        throw new Error(
          `Missing ${zip} (https://www2.census.gov/geo/tiger/TIGER2025/PLACE/).`,
        );
      boundaries.clear(); // one state's boundaries at a time
      boundaries.set(state, readBoundaries(zip));
    }
    const rings = boundaries.get(state)!.get(geoid);
    if (!rings) throw new Error(`No 2025 boundary for ${geoid}.`);
    return rings;
  };

  const rows: (string | number)[][] = [];
  const renamed: {
    key: string;
    name: string;
    from: string;
    fromName: string;
    how: string;
  }[] = [];
  const estimated: {
    key: string;
    name: string;
    method: string;
    low: number;
    high: number;
  }[] = [];
  const ordered = [...localities].sort((a, b) =>
    a.unit.slice(4).localeCompare(b.unit.slice(4)),
  );
  const rowOf = new Map<string, (string | number)[]>();
  const blockRows: BlockRow[] = [];
  const sourcedInside = new Set<CensusUnit>();
  for (const { key, unit } of ordered) {
    const geoid = unit.slice(4);
    const direct = census.get(unit);
    if (ISLAND_AREAS.includes(geoid.slice(0, 2))) {
      if (!direct) throw new Error(`No 2020 P28 row for ${key} (${unit}).`);
      rowOf.set(key, [key, direct.table, ...direct.counts]);
      continue;
    }
    const place = gazetteer.get(geoid);
    if (!place) throw new Error(`${key} (${geoid}) is not in the Gazetteer.`);
    const stateBlocks = blocksByState.get(geoid.slice(0, 2)) ?? [];
    const insideBlocks = blocksInside(stateBlocks, boundaryOf(geoid));
    const counts = sumOf(insideBlocks);
    if (direct && same(direct.counts, counts)) {
      rowOf.set(key, [key, "P5", ...direct.counts]);
      for (const block of insideBlocks) sourcedInside.add(block);
      continue;
    }
    const before = direct ? undefined : predecessor(geoid);
    if (before && same(before.counts, counts)) {
      rowOf.set(key, [key, "P5", ...before.counts]);
      for (const block of insideBlocks) sourcedInside.add(block);
      renamed.push({
        key,
        name: place.name,
        from: before.geoid,
        fromName: before.name,
        how:
          before.ns === place.ns
            ? `same ANSI code ${place.ns}`
            : `land area ${before.aland} m2 in 2020, ${place.aland} m2 in 2025`,
      });
      continue;
    }
    const fromAcs = acs.get(`1600000US${geoid}`);
    const older = direct ?? before;
    const checked =
      older && fromAcs
        ? acsCheck({
            geoid,
            land2024: gazetteer2024.get(geoid)?.aland,
            land2025: place.aland,
            older,
            acs: fromAcs,
            blockSum: counts,
            insideBlocks,
            stateBlocks,
          })
        : undefined;
    const measures: { low: number; high: number; what: string }[] = [];
    if (older)
      measures.push({
        low: older.counts[0]!,
        high: older.counts[0]!,
        what: `the 2020 P5 row of ${older.geoid} (${older.name}), ${older.counts[0]}`,
      });
    if (fromAcs)
      measures.push({
        low: Math.max(0, fromAcs[0] - Math.max(0, fromAcs[1])),
        high: fromAcs[0] + Math.max(0, fromAcs[1]),
        what: `the 2020-2024 ACS 5-year B26001 estimate, ${fromAcs[0]} plus or minus ${fromAcs[1]}`,
      });
    if (measures.length === 0) {
      const radius = Math.sqrt(place.aland / Math.PI);
      const circle = stateBlocks
        .filter(
          (block) =>
            meters(block.lat, block.lon, place.lat, place.lon) <= radius,
        )
        .reduce((sum, block) => sum + block.counts[0]!, 0);
      measures.push({
        low: circle,
        high: circle,
        what: `the 2020 blocks within a circle of the place's land area around its internal point, ${circle}`,
      });
    }
    blockRows.push({
      key,
      name: place.name,
      insideBlocks,
      blockSum: counts,
      checked,
      measures,
      why: direct
        ? "the boundary moved across group quarters since 2020"
        : "no 2020 row holds the same residents",
    });
  }

  // A block that a checked row keeps although its internal point left the
  // place is counted there, so the block sum of the place its internal point
  // now lies in leaves it out: no block is counted twice.
  const keptBy = new Map<CensusUnit, BlockRow>();
  for (const row of blockRows)
    for (const block of row.checked?.kept ?? []) keptBy.set(block, row);
  for (const block of keptBy.keys())
    if (sourcedInside.has(block))
      throw new Error(
        `Block ${block.geoid} is kept by a check and in a P5 row.`,
      );
  for (const row of blockRows) {
    let value = row.checked?.counts ?? row.blockSum;
    const less: string[] = [];
    for (const block of row.checked?.taken ?? [])
      if (keptBy.has(block))
        throw new Error(`Block ${block.geoid} is taken and kept by checks.`);
    if (!row.checked)
      for (const block of row.insideBlocks) {
        const by = keptBy.get(block);
        if (!by || by === row) continue;
        value = value.map((n, i) => n - block.counts[i]!);
        less.push(
          `block ${block.geoid} (${block.counts[0]}), which ${by.key} (${by.name}) keeps on its ACS check`,
        );
      }
    rowOf.set(row.key, [row.key, "blocks", ...value]);
    const spread = `Spread: from this count to ${[
      ...(row.checked || less.length
        ? [`the block sum, ${row.blockSum[0]}`]
        : []),
      ...row.measures.map((m) => m.what),
    ].join(" and ")}.`;
    estimated.push({
      key: row.key,
      name: row.name,
      method: row.checked
        ? `${row.checked.method} ${spread}`
        : `The 2020 P5 blocks whose internal points lie inside the 2025 TIGER/Line boundary (${row.why})${less.length ? `, less ${less.join(", ")}` : ""}. ${spread}`,
      low: Math.min(
        value[0]!,
        row.blockSum[0]!,
        ...row.measures.map((m) => m.low),
      ),
      high: Math.max(
        value[0]!,
        row.blockSum[0]!,
        ...row.measures.map((m) => m.high),
      ),
    });
  }
  for (const { key } of localities) rows.push(rowOf.get(key)!);

  // National totals by type from the state rows (summary level 040).
  const sumStates = (fipsList: readonly string[]) => {
    const total = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const fips of fipsList)
      census.get(`040:${fips}`)!.counts.forEach((n, i) => (total[i]! += n));
    return total;
  };
  const fiftyAndDc = [...census.values()]
    .filter((unit) => unit.sumlev === "040")
    .map((unit) => unit.geoid)
    .filter((fips) => fips !== "72" && !ISLAND_AREAS.includes(fips));
  if (fiftyAndDc.length !== 51)
    throw new Error(`Expected 51 state rows, found ${fiftyAndDc.length}.`);
  const named = (counts: Counts) =>
    Object.fromEntries(
      ["total", ...GROUP_QUARTERS_TYPES].map((name, i) => [name, counts[i]]),
    );
  const drawn = (table: string) => {
    const sum = [0, 0, 0, 0, 0, 0, 0, 0];
    let localitiesCounted = 0;
    for (const row of rows)
      if (row[1] === table) {
        localitiesCounted += 1;
        row.slice(2).forEach((n, i) => (sum[i]! += Number(n)));
      }
    return { localities: localitiesCounted, ...named(sum) };
  };

  // Cross-check: ACS B26001 against the P5 total for every place with both.
  const pairs: { p5: number; acs: number }[] = [];
  for (const row of rows) {
    const fromAcs = acs.get(`1600000US${row[0]}`);
    if (row[1] === "P5" && fromAcs)
      pairs.push({ p5: Number(row[2]), acs: fromAcs[0] });
  }
  const band = (min: number) => {
    const sample = pairs.filter((p) => p.p5 >= min);
    const ratios = sample.map((p) => p.acs / p.p5);
    const share = (low: number, high: number) =>
      round3(
        ratios.filter((r) => r >= low && r <= high).length / sample.length,
      );
    return {
      placesWithP5AtLeast: min,
      places: sample.length,
      medianAcsOverP5: round3(median(ratios)),
      withinQuarter: share(0.75, 1.25),
      withinHalf: share(0.5, 1.5),
      p5Sum: sample.reduce((a, p) => a + p.p5, 0),
      acsSum: sample.reduce((a, p) => a + p.acs, 0),
    };
  };
  const zeroPairs = pairs.filter((p) => p.p5 === 0);
  const usAcs = acs.get("0100000US")![0];
  const usP5 = sumStates(fiftyAndDc)[0]!;
  const storrs = census.get("160:0973980")!;
  const storrsAcs = acs.get("1600000US0973980")!;

  const file = {
    id: "census-2020-group-quarters",
    publisher: "U.S. Census Bureau",
    vintage: "2020 Census (April 1, 2020)",
    table: "P5 (Redistricting Data, PL 94-171); P28 (2020 Island Areas DHC)",
    title: "Group quarters population by major group quarters type",
    universe: "Population in group quarters",
    geography:
      "Every locality key the game can draw (src/core2/places.ts placeLocalities over placeStateKeys): Census places on their 2025 boundaries in the 50 states, D.C. and Puerto Rico; places and county subdivisions in the four island areas.",
    sourceUrl:
      "https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/",
    islandAreasUrl:
      "https://www2.census.gov/programs-surveys/decennial/2020/data/island-areas/",
    boundariesUrl: "https://www2.census.gov/geo/tiger/TIGER2025/PLACE/",
    crossCheckUrl:
      "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b26001.dat",
    retrievedOn: "2026-11-01",
    compiledBy: "scripts/research/compile-group-quarters.ts",
    tag: "by row: P5 and P28 SOURCED, blocks ESTIMATED (see tables)",
    limits:
      "A count on Census Day, April 1, 2020, during the pandemic: college students were counted at their campus housing under the residence rule even where they had gone home, so college counts reflect campus housing, not who was physically there. The redistricting tables carry the 2020 disclosure-avoidance noise below the state level (group-quarters counts by type are not held invariant), so a small place can show a few residents in a type it has no facility of. Island-area counts are P28, whose group-quarters values the Census Bureau partially synthesized for disclosure avoidance. A row whose table is blocks is ESTIMATED: a place drawn or redrawn since 2020, counted from the 2020 blocks inside its 2025 boundary, and listed under estimated with its spread. A block counts as inside when its internal point is, so a facility on a block the boundary splits is counted all inside or all outside; where the ACS on the same land shows that sum wrong, the row is the 2020 row plus only the boundary-crossing blocks that bring it toward the ACS, and a block such a row keeps is taken out of the place its internal point now lies in, so none is counted twice; a split block on a place whose boundary moved since 2024 has no such check. A row listed under renamed is the 2020 row of the same place under its older code.",
    columns: ["key", "table", "total", ...GROUP_QUARTERS_TYPES],
    tables: {
      P5: {
        tag: "SOURCED",
        vintage: "2020 Census Redistricting Data (PL 94-171)",
        cells:
          "P0050001 total; P0050003 adultCorrectional, P0050004 juvenile, P0050005 nursing, P0050006 otherInstitutional; P0050008 college, P0050009 military, P0050010 otherNoninstitutional",
      },
      P28: {
        tag: "SOURCED",
        vintage:
          "2020 Island Areas Censuses Demographic and Housing Characteristics",
        cells:
          "P0280001 total; each type summed over the six sex-and-age groups (male and female; under 18, 18 to 64, 65 and over)",
      },
      blocks: {
        tag: "ESTIMATED",
        vintage:
          "2020 Census Redistricting Data (PL 94-171), block level, on 2025 TIGER/Line place boundaries",
        cells: `P5 summed over the 2020 blocks whose internal points lie inside the place's 2025 boundary; where the 2020-2024 ACS B26001 on the same land (2024 and 2025 land areas within ${ACS_SAME_LAND_SHARE * 100}%) is more than ${ACS_CHECK_MARGINS} margins of error and ${ACS_CHECK_PEOPLE} people from that sum and at least as near the 2020 row, the 2020 row plus only the boundary-crossing blocks that bring it toward the ACS`,
      },
    },
    nationalTotals: {
      note: "State rows (summary level 040) of P5 and P28: all of each state's territory, not only the drawable places.",
      fiftyStatesAndDc: named(sumStates(fiftyAndDc)),
      puertoRico: named(sumStates(["72"])),
      islandAreas: Object.fromEntries(
        [
          ["americanSamoa", "60"],
          ["guam", "66"],
          ["northernMarianaIslands", "69"],
          ["usVirginIslands", "78"],
        ].map(([name, fips]) => [name, named(sumStates([fips!]))]),
      ),
      inDrawableLocalities: Object.fromEntries(
        ["P5", "P28", "blocks"].map((table) => [table, drawn(table)]),
      ),
    },
    crossCheck: {
      note: "ACS 2020-2024 5-year B26001 total group-quarters population against the 2020 P5 total, for every drawable place whose row is P5 and that the ACS also publishes. The ACS is a five-year sample average on 2024 boundaries; P5 is a one-day count.",
      nation: { p5: usP5, acs: usAcs, acsOverP5: round3(usAcs / usP5) },
      bands: [band(100), band(1000), band(5000)],
      placesWithZeroP5: {
        places: zeroPairs.length,
        shareWithAcsAlsoZero: round3(
          zeroPairs.filter((p) => p.acs === 0).length / zeroPairs.length,
        ),
      },
      storrs: {
        key: "0973980",
        p5: storrs.counts[0],
        acs: storrsAcs[0],
        acsMargin: storrsAcs[1],
      },
    },
    sampleSourceRows: {
      "0973980": storrs.raw,
      "0804000": census.get("160:0804000")!.raw,
    },
    renamed,
    estimated,
    rows,
  };
  return {
    text: await format(JSON.stringify(file), { parser: "json" }),
    file,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const downloads = args.find((arg) => !arg.startsWith("--"));
  if (!downloads) {
    console.error(
      "Usage: node --import tsx scripts/research/compile-group-quarters.ts <downloads> [--check]",
    );
    process.exit(2);
  }
  const { text, file } = await compileGroupQuarters(resolve(downloads));
  if (args.includes("--check")) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : "";
    if (current !== text) {
      console.error(`${OUTPUT} is stale; rerun without --check.`);
      process.exit(1);
    }
    console.log(`${OUTPUT} is current.`);
    return;
  }
  writeFileSync(OUTPUT, text);
  const byTable = new Map<string, number>();
  for (const row of file.rows)
    byTable.set(String(row[1]), (byTable.get(String(row[1])) ?? 0) + 1);
  console.log(
    `Wrote ${file.rows.length} localities (${[...byTable].map(([k, n]) => `${k} ${n}`).join(", ")}) to ${OUTPUT}.`,
  );
  console.log(JSON.stringify(file.nationalTotals, null, 1));
  console.log(JSON.stringify(file.crossCheck, null, 1));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
)
  await main();
