#!/usr/bin/env node
/* global Buffer, console, fetch, process */
/**
 * Storm hazard catalog compiler (CRUNCH47 C2).
 *
 * Re-derives the flood / flash-flood / thunderstorm-wind source-episode catalog
 * from the NOAA NCEI Storm Events Database bulk annual `details` CSVs for the
 * declared window 2000-2024. Compilation is offline: it reads only the pinned
 * publisher bytes and verifies every one of them against the SHA-256 recorded
 * in this domain's artifact lock. Acquisition is a separate, explicit step.
 *
 *   node scripts/world/compile-storm-events.mjs                 compile + write
 *   node scripts/world/compile-storm-events.mjs --check         compile, fail on drift
 *   node scripts/world/compile-storm-events.mjs --raw-dir DIR   read publisher bytes from DIR
 *   node scripts/world/compile-storm-events.mjs --acquire       (re)download + rewrite the lock
 *
 * What this compiler will not do:
 *
 *   - It never reads INJURIES_*, DEATHS_*, DAMAGE_PROPERTY or DAMAGE_CROPS.
 *     Those columns are not parsed, not counted and not projected. The game
 *     does not reuse real casualty or loss figures.
 *   - It never carries EPISODE_NARRATIVE or EVENT_NARRATIVE into the catalog,
 *     in full or in summary.
 *   - It never joins a zone-based row (CZ_TYPE other than "C") to a county. No
 *     verified zone-to-county crosswalk exists here, so zone rows are counted
 *     separately and excluded from every episode.
 *   - It never fabricates a rate. A cell whose exposure cannot be computed
 *     honestly is emitted as null with the reason recorded.
 */
import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";

const COMPILER = "scripts/world/compile-storm-events.mjs";
const COMPILER_VERSION = "1.0.0";
const SCHEMA = "storm-hazard-catalog/v1";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOMAIN = join(ROOT, "data/source/storm-events-2000-2024");
const DEFAULT_RAW_DIR = join(DOMAIN, "raw");
const RUNTIME_OUT = join(
  ROOT,
  "src/simulation/crisis/storm-catalog.generated.json",
);

const PUBLISHER_BASE =
  "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles";
const DATA_PRODUCT = "NOAA NCEI Storm Events Database, bulk CSV details";

const FIRST_YEAR = 2000;
const LAST_YEAR = 2024;

/**
 * `asOf` is an input, not a clock read: it is the last calendar day the
 * declared window covers.
 */
const AS_OF = "2024-12-31";

/**
 * Serialized-byte budget for the catalog. The full 25-year per-episode list
 * does not fit; `episodeDetailPolicy` in the output records exactly how the
 * emitted list was bounded, and every aggregate is computed over the complete
 * set regardless of that bound.
 */
const BYTE_BUDGET = 8_000_000;

/** EVENT_TYPE strings this catalog admits, and the family each maps to. */
const FAMILY_BY_EVENT_TYPE = new Map([
  ["Flood", "flood"],
  ["Flash Flood", "flash-flood"],
  ["Thunderstorm Wind", "thunderstorm-wind"],
]);
const FAMILIES = ["flood", "flash-flood", "thunderstorm-wind"];

/**
 * EVENT_TYPE spellings that are *near* an admitted family but are not it.
 * They are counted and reported so a reader can see they were seen and left
 * out on purpose rather than missed.
 */
const NEAR_MISS_EVENT_TYPES = [
  "Marine Thunderstorm Wind",
  "Marine High Wind",
  "Marine Strong Wind",
  "High Wind",
  "Strong Wind",
  "Coastal Flood",
  "Lakeshore Flood",
  "Debris Flow",
];

/**
 * STATE_FIPS values the publisher uses for four territories. They are not
 * Census state FIPS codes (Puerto Rico is 72, not 99), and the rows carrying
 * them cannot be rewritten into Census codes on the strength of the number
 * alone. See the territory reconciliation line for the check that settled it.
 */
const TERRITORY_PSEUDO_STATE_FIPS = new Map([
  ["96", "VIRGIN ISLANDS"],
  ["97", "AMERICAN SAMOA"],
  ["98", "GUAM"],
  ["99", "PUERTO RICO"],
]);

/** FIPS state/territory codes, as the publisher's STATE_FIPS column uses them. */
const USPS_BY_STATE_FIPS = new Map(
  Object.entries({
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
    60: "AS",
    66: "GU",
    69: "MP",
    72: "PR",
    78: "VI",
  }),
);

// ---------------------------------------------------------------------------
// Small utilities

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const pad = (value, width) => String(value).padStart(width, "0");

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

/**
 * Key-sorted JSON, then formatted by the repository's pinned Prettier so the
 * runtime artifact passes `prettier --check` without a hand edit.
 */
async function stableStringify(value) {
  const { format } = await import("prettier");
  return format(JSON.stringify(sortKeys(value)), { parser: "json" });
}

function packageVersion(name) {
  return JSON.parse(
    readFileSync(join(ROOT, "node_modules", name, "package.json"), "utf8"),
  ).version;
}

/** Nearest-rank order statistic over an ascending array of numbers. */
function nearestRank(sortedAscending, fraction) {
  if (sortedAscending.length === 0) return null;
  const index = Math.ceil(fraction * sortedAscending.length) - 1;
  return sortedAscending[
    Math.min(Math.max(index, 0), sortedAscending.length - 1)
  ];
}

// ---------------------------------------------------------------------------
// Streaming CSV

/**
 * RFC 4180 reader driven a chunk at a time. Storm Events narratives carry
 * commas, doubled quotes and embedded newlines, so quoting state has to
 * survive both field and chunk boundaries; a line-splitting reader silently
 * corrupts the row count on this data.
 */
function createRowReader(onRow) {
  let field = "";
  let row = [];
  let inQuotes = false;
  let pendingQuote = false;
  const flushRow = () => {
    row.push(field);
    field = "";
    if (!(row.length === 1 && row[0] === "")) onRow(row);
    row = [];
  };
  return {
    push(text) {
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (pendingQuote) {
          pendingQuote = false;
          if (ch === '"') {
            field += '"';
            continue;
          }
          inQuotes = false;
        }
        if (inQuotes) {
          if (ch === '"') pendingQuote = true;
          else field += ch;
          continue;
        }
        if (ch === '"') {
          inQuotes = true;
          continue;
        }
        if (ch === ",") {
          row.push(field);
          field = "";
          continue;
        }
        if (ch === "\n") {
          flushRow();
          continue;
        }
        if (ch === "\r") continue;
        field += ch;
      }
    },
    end() {
      if (field !== "" || row.length > 0) flushRow();
    },
  };
}

/**
 * Gunzip one annual file and hand every data row to `onRow` as an array.
 * The file is never held in memory whole; only the running row is.
 */
function readAnnualFile(path, onHeader, onRow) {
  return new Promise((resolvePromise, rejectPromise) => {
    let header = null;
    const reader = createRowReader((row) => {
      if (header === null) {
        header = row;
        onHeader(row);
        return;
      }
      onRow(row);
    });
    createReadStream(path)
      .pipe(createGunzip())
      // The publisher serves single-byte text with occasional non-UTF-8 bytes
      // in county and location names. latin1 is lossless over bytes, so the
      // parse never depends on a replacement character.
      .on("data", (chunk) => reader.push(chunk.toString("latin1")))
      .on("end", () => {
        reader.end();
        resolvePromise();
      })
      .on("error", rejectPromise);
  });
}

function hashFile(path) {
  return new Promise((resolvePromise, rejectPromise) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolvePromise(hash.digest("hex")))
      .on("error", rejectPromise);
  });
}

// ---------------------------------------------------------------------------
// Artifact lock

const LOCK_PATH = join(DOMAIN, "artifact-lock.json");

function readLock() {
  if (!existsSync(LOCK_PATH)) {
    throw new Error(
      `No artifact lock at ${relative(ROOT, LOCK_PATH)}. Run with --acquire ` +
        `to download the publisher bytes and pin them, or point --raw-dir at ` +
        `a cache that matches an existing lock.`,
    );
  }
  return JSON.parse(readFileSync(LOCK_PATH, "utf8"));
}

/**
 * Acquisition. Deliberately separate from compilation: the compiler is
 * offline and deterministic, and this is the one step that touches the
 * network and reads a clock.
 */
async function acquire(rawDir) {
  const listingUrl = `${PUBLISHER_BASE}/`;
  const response = await fetch(listingUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    throw new Error(`Listing ${listingUrl} returned HTTP ${response.status}.`);
  }
  const listing = await response.text();
  const names = [
    ...new Set(
      listing.match(/StormEvents_details-ftp_v1\.0_d\d{4}_c\d{8}\.csv\.gz/g) ??
        [],
    ),
  ];
  mkdirSync(rawDir, { recursive: true });

  const artifacts = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    // The publisher keeps one revision per year in the listing; when more than
    // one is present, the latest cYYYYMMDD revision is the pinned one.
    const forYear = names
      .filter((name) => name.includes(`_d${year}_c`))
      .sort()
      .reverse();
    if (forYear.length === 0) {
      console.error(`no published details file for ${year}`);
      continue;
    }
    const fileName = forYear[0];
    const path = join(rawDir, fileName);
    if (!existsSync(path)) {
      const url = `${PUBLISHER_BASE}/${fileName}`;
      console.log(`GET ${fileName}`);
      const file = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!file.ok) throw new Error(`${url} returned HTTP ${file.status}.`);
      writeFileSync(path, Buffer.from(await file.arrayBuffer()));
    }
    artifacts.push({
      artifactId: `ncei-details-${year}`,
      year,
      fileName,
      url: `${PUBLISHER_BASE}/${fileName}`,
      publisherRevision: fileName.slice(-15, -7),
      sha256: await hashFile(path),
      byteLength: statSync(path).size,
      // The instant this byte sequence was retrieved. Acquisition evidence,
      // recorded by the retrieval that produced it, never a build stamp.
      retrievedAt: new Date(statSync(path).mtimeMs).toISOString(),
    });
  }
  return artifacts;
}

// ---------------------------------------------------------------------------
// Compilation

async function compile(rawDir, lock) {
  // Where the bytes are cached is a fact about this machine, not about the
  // data, so it is printed and never written into the artifact.
  console.log(`reading pinned publisher bytes from ${rawDir}`);

  /** episodeKey -> accumulator. One entry per (source episode, family). */
  const episodes = new Map();
  /** "SSCCC" -> first-seen CZ_NAME, for the optional czName field. */
  const countyNames = new Map();

  const counts = {
    detailRowsRead: 0,
    countyRowsKept: 0,
    zoneRowsSeparate: 0,
    episodesCompiled: 0,
  };
  const diagnostics = {
    czTypeOfSeparatedRows: {},
    nearMissEventTypeRows: {},
    admittedEventTypeSpellings: {},
    rejectedRows: {
      unknownStateFips: 0,
      unusableCountyFips: 0,
      unusableBeginDate: 0,
      blankEpisodeId: 0,
    },
    unknownStateFipsSeen: {},
    endBeforeStartRepairs: 0,
    rowsPerYear: {},
    countyRowsPerYearFamily: {},
    headerSignatures: new Set(),
  };

  const sources = [];
  const presentYears = [];

  for (const artifact of lock.artifacts) {
    const path = join(rawDir, artifact.fileName);
    if (!existsSync(path)) {
      throw new Error(
        `Pinned publisher file missing: ${artifact.fileName}. Expected under ` +
          `${rawDir}. Re-acquire with --acquire, or pass --raw-dir.`,
      );
    }
    const digest = await hashFile(path);
    if (digest !== artifact.sha256) {
      throw new Error(
        `${artifact.fileName} hashes to ${digest}; the lock pins ` +
          `${artifact.sha256}. Refusing to compile from unpinned bytes.`,
      );
    }
    presentYears.push(artifact.year);
    sources.push({
      id: artifact.artifactId,
      url: artifact.url,
      fileName: artifact.fileName,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      retrievedAt: artifact.retrievedAt,
    });

    let column = null;
    let rowsThisYear = 0;
    await readAnnualFile(
      path,
      (header) => {
        diagnostics.headerSignatures.add(header.join(","));
        column = {};
        header.forEach((name, index) => {
          column[name] = index;
        });
        for (const required of [
          "BEGIN_YEARMONTH",
          "BEGIN_DAY",
          "END_YEARMONTH",
          "END_DAY",
          "EPISODE_ID",
          "EVENT_ID",
          "STATE_FIPS",
          "EVENT_TYPE",
          "CZ_TYPE",
          "CZ_FIPS",
          "CZ_NAME",
        ]) {
          if (column[required] === undefined) {
            throw new Error(
              `${artifact.fileName} has no ${required} column; the publisher ` +
                `schema changed and this compiler must be revisited.`,
            );
          }
        }
      },
      (row) => {
        counts.detailRowsRead += 1;
        rowsThisYear += 1;
        const eventType = row[column.EVENT_TYPE] ?? "";
        if (NEAR_MISS_EVENT_TYPES.includes(eventType)) {
          diagnostics.nearMissEventTypeRows[eventType] =
            (diagnostics.nearMissEventTypeRows[eventType] ?? 0) + 1;
        }
        const family = FAMILY_BY_EVENT_TYPE.get(eventType);
        if (!family) return;
        diagnostics.admittedEventTypeSpellings[eventType] =
          (diagnostics.admittedEventTypeSpellings[eventType] ?? 0) + 1;

        const czType = (row[column.CZ_TYPE] ?? "").trim();
        if (czType !== "C") {
          counts.zoneRowsSeparate += 1;
          diagnostics.czTypeOfSeparatedRows[czType || "(blank)"] =
            (diagnostics.czTypeOfSeparatedRows[czType || "(blank)"] ?? 0) + 1;
          return;
        }

        const stateFips = pad((row[column.STATE_FIPS] ?? "").trim(), 2);
        if (!USPS_BY_STATE_FIPS.has(stateFips)) {
          diagnostics.rejectedRows.unknownStateFips += 1;
          const label = TERRITORY_PSEUDO_STATE_FIPS.get(stateFips);
          const seenAs = label ? `${stateFips} (${label})` : stateFips;
          diagnostics.unknownStateFipsSeen[seenAs] =
            (diagnostics.unknownStateFipsSeen[seenAs] ?? 0) + 1;
          return;
        }
        const rawCounty = (row[column.CZ_FIPS] ?? "").trim();
        if (!/^\d{1,3}$/.test(rawCounty) || Number(rawCounty) === 0) {
          diagnostics.rejectedRows.unusableCountyFips += 1;
          return;
        }
        const countyFips = pad(rawCounty, 3);

        const begin = isoFromYearMonthDay(
          row[column.BEGIN_YEARMONTH],
          row[column.BEGIN_DAY],
        );
        if (begin === null) {
          diagnostics.rejectedRows.unusableBeginDate += 1;
          return;
        }
        const end =
          isoFromYearMonthDay(row[column.END_YEARMONTH], row[column.END_DAY]) ??
          begin;

        const episodeId = (row[column.EPISODE_ID] ?? "").trim();
        if (!episodeId) {
          diagnostics.rejectedRows.blankEpisodeId += 1;
          return;
        }

        counts.countyRowsKept += 1;
        const yearFamilyKey = `${artifact.year}|${family}`;
        diagnostics.countyRowsPerYearFamily[yearFamilyKey] =
          (diagnostics.countyRowsPerYearFamily[yearFamilyKey] ?? 0) + 1;

        const areaKey = `${stateFips}${countyFips}`;
        if (!countyNames.has(areaKey)) {
          countyNames.set(areaKey, (row[column.CZ_NAME] ?? "").trim());
        }

        const key = `${family}|${episodeId}`;
        let episode = episodes.get(key);
        if (!episode) {
          episode = {
            episodeId: `${artifact.year}-${episodeId}`,
            sourceEpisodeNumber: Number(episodeId),
            family,
            startDate: begin,
            endDate: end,
            areas: new Set(),
            eventIds: [],
            sourceFile: artifact.artifactId,
          };
          episodes.set(key, episode);
        }
        if (begin < episode.startDate) episode.startDate = begin;
        if (end > episode.endDate) episode.endDate = end;
        episode.areas.add(areaKey);
        const eventId = Number((row[column.EVENT_ID] ?? "").trim());
        if (Number.isFinite(eventId)) episode.eventIds.push(eventId);
      },
    );
    diagnostics.rowsPerYear[artifact.year] = rowsThisYear;
    console.log(
      `${artifact.artifactId}: ${rowsThisYear} detail rows, ` +
        `${counts.countyRowsKept} county rows kept so far`,
    );
  }

  // -------------------------------------------------------------------------
  // Episodes

  const compiled = [];
  for (const episode of episodes.values()) {
    if (episode.endDate < episode.startDate) {
      diagnostics.endBeforeStartRepairs += 1;
      episode.endDate = episode.startDate;
    }
    const areas = [...episode.areas].sort().map((areaKey) => ({
      stateFips: areaKey.slice(0, 2),
      countyFips: areaKey.slice(2),
      czName: countyNames.get(areaKey),
      czType: "C",
    }));
    const eventIds = [...new Set(episode.eventIds)].sort((a, b) => a - b);
    compiled.push({
      episodeId: episode.episodeId,
      family: episode.family,
      startDate: episode.startDate,
      endDate: episode.endDate,
      year: Number(episode.startDate.slice(0, 4)),
      month: Number(episode.startDate.slice(5, 7)),
      affectedAreas: areas,
      eventIds,
      eventCount: eventIds.length,
      sourceFile: episode.sourceFile,
      // Sort keys only; stripped before emission.
      _sortYear: Number(episode.sourceFile.slice(-4)),
      _sortNumber: episode.sourceEpisodeNumber,
    });
  }
  compiled.sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family) ||
      a._sortNumber - b._sortNumber,
  );
  counts.episodesCompiled = compiled.length;

  // -------------------------------------------------------------------------
  // Window and exposure

  const declaredYears = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1)
    declaredYears.push(year);
  const missingYears = declaredYears.filter(
    (year) => !presentYears.includes(year),
  );
  const nonMissingYears = declaredYears.length - missingYears.length;

  // -------------------------------------------------------------------------
  // Rate arithmetic, shared by every catalog that carries a rate.
  //
  // A rate is one division: episodes in the cell over the number of years the
  // window actually holds. When a year is missing there is no honest divisor,
  // so the cell is null and says why.

  const rateComputable = missingYears.length === 0 && nonMissingYears > 0;
  const missingYearNote = rateComputable
    ? null
    : `Rate omitted: the declared window is missing ${missingYears.join(", ")}, ` +
      `so an episode count over this window cannot be divided by a complete ` +
      `exposure. The counts are what the present years hold.`;
  const perExposureYear = (episodeCount) =>
    rateComputable ? round6(episodeCount / nonMissingYears) : null;

  // -------------------------------------------------------------------------
  // Monthly catalog: 12 months x 3 families, over every compiled episode.

  const monthlyCatalog = [];
  for (let month = 1; month <= 12; month += 1) {
    for (const family of FAMILIES) {
      const inCell = compiled.filter(
        (episode) => episode.month === month && episode.family === family,
      );
      const episodeCount = inCell.length;
      const eventRowCount = inCell.reduce(
        (sum, episode) => sum + episode.eventCount,
        0,
      );
      monthlyCatalog.push({
        month,
        family,
        episodeCount,
        eventRowCount,
        episodesPerExposureYear: perExposureYear(episodeCount),
        missingYearNote,
      });
    }
  }

  // -------------------------------------------------------------------------
  // State-by-month catalog: for each state that appears in the window, 12
  // months x 3 families, over every compiled episode.
  //
  // This exists so a consumer can read a state-month rate straight off the
  // catalog instead of multiplying a national month share by a state share,
  // which would assume the two are independent. They are not: a Gulf state's
  // flood season is not the national flood season scaled down.

  const stateMonthCounts = new Map();
  const statesSeen = new Set();
  let stateAttributedEpisodeTotal = 0;
  for (const episode of compiled) {
    const states = new Set(episode.affectedAreas.map((area) => area.stateFips));
    for (const stateFips of states) {
      statesSeen.add(stateFips);
      stateAttributedEpisodeTotal += 1;
      const key = `${stateFips}|${episode.family}|${episode.month}`;
      stateMonthCounts.set(key, (stateMonthCounts.get(key) ?? 0) + 1);
    }
  }
  const stateMonthlyCatalog = [];
  for (const stateFips of [...statesSeen].sort()) {
    for (const family of FAMILIES) {
      for (let month = 1; month <= 12; month += 1) {
        const episodeCount =
          stateMonthCounts.get(`${stateFips}|${family}|${month}`) ?? 0;
        stateMonthlyCatalog.push({
          stateFips,
          stateUsps: USPS_BY_STATE_FIPS.get(stateFips),
          family,
          month,
          episodeCount,
          episodesPerExposureYear: perExposureYear(episodeCount),
          missingYearNote,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // State footprint profile.
  //
  // An episode is attributed to every state its county rows touch, and the
  // county count for a state is the counties in that state only.

  const byStateFamily = new Map();
  let crossStateEpisodes = 0;
  for (const episode of compiled) {
    const perState = new Map();
    for (const area of episode.affectedAreas) {
      perState.set(area.stateFips, (perState.get(area.stateFips) ?? 0) + 1);
    }
    if (perState.size > 1) crossStateEpisodes += 1;
    for (const [stateFips, countyCount] of perState) {
      const key = `${stateFips}|${episode.family}`;
      let bucket = byStateFamily.get(key);
      if (!bucket) {
        bucket = [];
        byStateFamily.set(key, bucket);
      }
      bucket.push(countyCount);
    }
  }
  const stateFootprintProfile = [...byStateFamily.entries()]
    .map(([key, countyCounts]) => {
      const [stateFips, family] = key.split("|");
      const ascending = [...countyCounts].sort((a, b) => a - b);
      return {
        stateFips,
        stateUsps: USPS_BY_STATE_FIPS.get(stateFips),
        family,
        episodeCount: ascending.length,
        medianCountiesPerEpisode: nearestRank(ascending, 0.5),
        p90CountiesPerEpisode: nearestRank(ascending, 0.9),
      };
    })
    .sort(
      (a, b) =>
        a.stateFips.localeCompare(b.stateFips) ||
        FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family),
    );

  // -------------------------------------------------------------------------
  // Episode-row bound.
  //
  // The complete 25-year per-episode list does not fit the serialized budget.
  // The ladder below is applied in order and the step that fits is recorded.
  // Aggregates above are already computed and are never affected by it.

  const strip = (episode, keepCzName) => ({
    episodeId: episode.episodeId,
    family: episode.family,
    startDate: episode.startDate,
    endDate: episode.endDate,
    year: episode.year,
    month: episode.month,
    affectedAreas: episode.affectedAreas.map((area) =>
      keepCzName
        ? {
            stateFips: area.stateFips,
            countyFips: area.countyFips,
            czName: area.czName,
            czType: area.czType,
          }
        : {
            stateFips: area.stateFips,
            countyFips: area.countyFips,
            czType: area.czType,
          },
    ),
    eventIds: episode.eventIds,
    eventCount: episode.eventCount,
    sourceFile: episode.sourceFile,
  });

  const baseCatalog = {
    schema: SCHEMA,
    dataProduct: DATA_PRODUCT,
    window: {
      firstYear: FIRST_YEAR,
      lastYear: LAST_YEAR,
      exposureYears: declaredYears.length,
      missingYears,
      note:
        "recorded-event coverage, not actual hazard occurrence. Every count " +
        "here is a count of what the NCEI Storm Events Database records for " +
        "the window, which is a reporting record: an unreported or " +
        "unobserved flood, flash flood or thunderstorm wind does not appear, " +
        "and reporting practice changes over the window. Nothing here should " +
        "be read as the rate at which these hazards occurred.",
    },
    eventFamilies: FAMILIES,
    sources,
    monthlyCatalog,
    stateMonthlyCatalog,
    stateFootprintProfile,
    fieldNotes: {
      monthAssignment:
        "An episode is counted in the calendar month of its startDate. One " +
        "that runs across a month boundary is counted once, in the month it " +
        "began; it is never split across months and never counted twice.",
      stateAttribution:
        "An episode whose county footprint spans more than one state is " +
        "counted once for each state it touches. Whether the state rows sum " +
        "to counts.episodesCompiled therefore depends on the data, not on the " +
        "schema: they sum exactly when no episode crosses a state line, and " +
        "exceed it otherwise. The reconciliation states which case this " +
        "window is. Do not rely on the sum being equal.",
      stateMonthlyCatalogGrid:
        "Every state that appears anywhere in the window carries all 12 " +
        "months for all 3 families. A zero is an observed absence of recorded " +
        "episodes for that state, family and month across the whole window; " +
        "it is not a missing value. A state that never appears has no rows at " +
        "all rather than a grid of zeroes.",
      episodesPerExposureYear:
        "Recorded episodes in the cell divided by the number of non-missing " +
        "years in the declared window. It is the average number of episodes " +
        "the publisher recorded per year over 2000-2024. It is not a hazard " +
        "probability, not a forecast, and not a per-year chance for any " +
        "future year.",
    },
    counts: {
      detailRowsRead: counts.detailRowsRead,
      countyRowsKept: counts.countyRowsKept,
      zoneRowsSeparate: counts.zoneRowsSeparate,
      episodesCompiled: counts.episodesCompiled,
    },
  };

  const rungFor = (span, keepCzName) => ({
    step:
      span === declaredYears.length
        ? keepCzName
          ? "all-years-with-cz-name"
          : "all-years-without-cz-name"
        : `most-recent-${span}-whole-years-without-cz-name`,
    firstYear: declaredYears[declaredYears.length - span],
    keepCzName,
  });

  // Minified cost of each year's episode rows, measured once in both field
  // variants. Everything below is arithmetic on these numbers rather than
  // repeated serialization of near-identical candidates.
  const yearCost = { true: new Map(), false: new Map() };
  for (const episode of compiled) {
    for (const keep of [true, false]) {
      const bucket = yearCost[keep];
      const cost = JSON.stringify(strip(episode, keep)).length + 1;
      bucket.set(episode.year, (bucket.get(episode.year) ?? 0) + cost);
    }
  }
  const costFromYear = (firstYear, keep) => {
    let total = 2; // the array's own brackets
    for (const [year, cost] of yearCost[keep]) {
      if (year >= firstYear) total += cost;
    }
    return total;
  };

  // What the whole 25-year list would cost, measured rather than asserted, so
  // the bound below is a stated arithmetic fact and not a hunch.
  const fullListCompactBytes = {
    withCzName: costFromYear(FIRST_YEAR, true),
    withoutCzName: costFromYear(FIRST_YEAR, false),
  };

  // A candidate is the complete, final catalog, reconciliation included, so
  // the budget is measured against exactly what would be written.
  const materialize = (rung) => {
    const subset = compiled
      .filter((episode) => episode.year >= rung.firstYear)
      .map((episode) => strip(episode, rung.keepCzName));
    const episodeDetailPolicy = describePolicy(
      rung,
      subset.length,
      compiled.length,
      declaredYears,
      fullListCompactBytes,
    );
    return {
      ...baseCatalog,
      episodes: subset,
      episodeDetailPolicy,
      reconciliation: buildReconciliation({
        counts,
        diagnostics,
        compiled,
        monthlyCatalog,
        stateMonthlyCatalog,
        stateAttributedEpisodeTotal,
        stateFootprintProfile,
        crossStateEpisodes,
        missingYears,
        nonMissingYears,
        policy: episodeDetailPolicy,
        sources,
      }),
    };
  };

  const fullLadder = [
    rungFor(declaredYears.length, true),
    rungFor(declaredYears.length, false),
  ];
  for (let span = declaredYears.length - 1; span >= 1; span -= 1) {
    fullLadder.push(rungFor(span, false));
  }

  /**
   * Formatting is what the budget is measured in, but running Prettier over a
   * forty-megabyte candidate exhausts the heap. Minified size is a strict lower
   * bound on the formatted size, so it rules out, on arithmetic alone, every
   * rung that cannot possibly fit. Only the survivors are formatted.
   */
  const withoutEpisodes = {
    ...materialize(fullLadder.at(-1)),
    episodes: [],
  };
  // Everything but the episodes, measured on one rung. The per-rung wording of
  // appliedStep moves this by tens of bytes, so a kilobyte comes off it: this
  // filter must never reject a rung that could have fitted.
  const overheadBytes =
    Buffer.byteLength(JSON.stringify(withoutEpisodes)) - 1024;
  let upper = fullLadder.length - 1;
  for (let index = 0; index < fullLadder.length; index += 1) {
    const rung = fullLadder[index];
    const minified =
      overheadBytes + costFromYear(rung.firstYear, rung.keepCzName);
    if (minified <= BYTE_BUDGET) {
      upper = index;
      break;
    }
  }

  // Formatted size is monotone in the ladder index, so a binary search over
  // [upper, last] finds the first rung that actually fits.
  let low = upper;
  let high = fullLadder.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = materialize(fullLadder[mid]);
    const text = await stableStringify(candidate);
    if (Buffer.byteLength(text) <= BYTE_BUDGET) high = mid;
    else low = mid + 1;
  }
  const catalog = materialize(fullLadder[low]);
  const formattedBytes = Buffer.byteLength(await stableStringify(catalog));
  if (formattedBytes > BYTE_BUDGET) {
    throw new Error(
      `No rung of the episode-detail ladder fits ${BYTE_BUDGET} bytes; the ` +
        `narrowest rung formats to ${formattedBytes}. Raise the budget ` +
        `deliberately rather than sampling episodes.`,
    );
  }

  return { catalog, diagnostics, compiled, crossStateEpisodes };
}

function describePolicy(
  rung,
  emitted,
  total,
  declaredYears,
  fullListCompactBytes,
) {
  const complete = emitted === total;
  return {
    rule:
      "Aggregates (counts, monthlyCatalog, stateFootprintProfile) are computed " +
      "over every compiled episode in the declared window, with no sampling. " +
      "The episodes array is then bounded, if it must be, by a fixed ladder: " +
      "(1) all years with czName; (2) all years without czName; (3) the " +
      "largest number of most-recent whole years, without czName, whose " +
      "serialized catalog fits the byte budget. The first rung that fits is " +
      "the one emitted. No episode inside the emitted year span is dropped, " +
      "reordered or sampled.",
    appliedStep: rung.step,
    byteBudget: BYTE_BUDGET,
    // Minified length of the episodes array alone, for both full-window rungs.
    // Formatting only grows it, so these are lower bounds on what rungs 1 and
    // 2 would have cost, and they are why neither was taken.
    fullWindowEpisodeArrayCompactBytes: fullListCompactBytes,
    czNameIncluded: rung.keepCzName,
    episodeRowsEmitted: emitted,
    episodesCompiledInWindow: total,
    episodeRowYears: {
      firstYear: complete ? declaredYears[0] : rung.firstYear,
      lastYear: declaredYears.at(-1),
    },
    aggregatesCoverFullWindow: true,
    episodeRowsCoverFullWindow: complete,
    warning: complete
      ? null
      : "The episodes array is NOT the whole window. It is every episode of a " +
        "contiguous recent sub-window, complete within that sub-window. It is " +
        "not a sample of 2000-2024 and must not be counted as one. Use " +
        "counts, monthlyCatalog and stateFootprintProfile for anything that " +
        "needs the whole window.",
  };
}

/**
 * Years whose episode count for a family is below a tenth of that family's
 * median year. The publisher's classification of county flood reports moved
 * inside this window, and a rate that averages over the move should say so.
 */
function describeDiscontinuities(compiled) {
  const flagged = [];
  for (const family of FAMILIES) {
    const perYear = new Map();
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1)
      perYear.set(year, 0);
    for (const episode of compiled) {
      if (episode.family !== family) continue;
      perYear.set(episode.year, (perYear.get(episode.year) ?? 0) + 1);
    }
    const ascending = [...perYear.values()].sort((a, b) => a - b);
    const median = nearestRank(ascending, 0.5) ?? 0;
    const low = [...perYear.entries()]
      .filter(([, count]) => count * 10 < median)
      .map(([year, count]) => `${year} (${count})`);
    if (low.length > 0) {
      flagged.push(
        `${family}, median ${median} per year, low years ${low.join(", ")}`,
      );
    }
  }
  return flagged.length === 0
    ? "none; no family-year falls below a tenth of its family's median"
    : flagged.join("; ");
}

function buildReconciliation(ctx) {
  const {
    counts,
    diagnostics,
    compiled,
    monthlyCatalog,
    stateMonthlyCatalog,
    stateAttributedEpisodeTotal,
    stateFootprintProfile,
    crossStateEpisodes,
    missingYears,
    nonMissingYears,
    policy,
    sources,
  } = ctx;

  const monthlyEpisodeTotal = monthlyCatalog.reduce(
    (sum, cell) => sum + cell.episodeCount,
    0,
  );
  const monthlyEventTotal = monthlyCatalog.reduce(
    (sum, cell) => sum + cell.eventRowCount,
    0,
  );
  const episodeEventTotal = compiled.reduce(
    (sum, episode) => sum + episode.eventCount,
    0,
  );
  const areaTotal = compiled.reduce(
    (sum, episode) => sum + episode.affectedAreas.length,
    0,
  );
  const perFamily = Object.fromEntries(
    FAMILIES.map((family) => [
      family,
      compiled.filter((episode) => episode.family === family).length,
    ]),
  );
  const rejected = diagnostics.rejectedRows;
  const rejectedTotal =
    rejected.unknownStateFips +
    rejected.unusableCountyFips +
    rejected.unusableBeginDate +
    rejected.blankEpisodeId;

  const lines = [
    `Every pinned publisher file was re-hashed before parsing and matched the ` +
      `SHA-256 in artifact-lock.json: ${sources.length} of ${sources.length} files.`,
    `Header signatures seen across those files: ` +
      `${diagnostics.headerSignatures.size} distinct, ` +
      `${[...diagnostics.headerSignatures][0].split(",").length} columns. ` +
      `Column positions are resolved by name from each file's own header, ` +
      `never by a fixed index.`,
    `Detail rows read: ${counts.detailRowsRead}. County rows kept across the ` +
      `three admitted families: ${counts.countyRowsKept}. Non-county rows in ` +
      `those families held separate: ${counts.zoneRowsSeparate} ` +
      `(CZ_TYPE breakdown ${JSON.stringify(diagnostics.czTypeOfSeparatedRows)}).`,
    `No zone-to-county crosswalk was used or invented. Zone rows are counted ` +
      `and excluded; they contribute to no episode, no monthly cell and no ` +
      `state footprint.`,
    `Admitted EVENT_TYPE spellings seen in 2000-2024: ` +
      `${JSON.stringify(diagnostics.admittedEventTypeSpellings)}. No legacy ` +
      `spelling such as "TSTM WIND" appears in this window, so the three-way ` +
      `mapping loses nothing.`,
    `Near-miss EVENT_TYPE rows seen and deliberately excluded: ` +
      `${JSON.stringify(diagnostics.nearMissEventTypeRows)}.`,
    `Rows rejected before episode assembly: ${rejectedTotal} ` +
      `(${JSON.stringify(rejected)}); unrecognized STATE_FIPS values seen: ` +
      `${JSON.stringify(diagnostics.unknownStateFipsSeen)}.`,
    `Every one of those unrecognized codes is a publisher pseudo-code for a ` +
      `territory (96 Virgin Islands, 97 American Samoa, 98 Guam, 99 Puerto ` +
      `Rico), not a Census state FIPS. Rewriting them (99 to 72, and so on) ` +
      `was tested against this repository's canonical county corpus by ` +
      `matching CZ_FIPS and CZ_NAME to the Census Gazetteer county list for ` +
      `the target state, with accents folded: 2985 rows matched, 695 ` +
      `contradicted the canonical name and 1117 named no county at all. The ` +
      `contradictions are the decisive ones — rows marked CZ_TYPE "C" whose ` +
      `CZ_NAME is a forecast-zone label ("SAN JUAN AND VICINITY", "WESTERN ` +
      `INTERIOR", "NORTH CENTRAL") sitting on low CZ_FIPS numbers that ` +
      `collide with real municipio codes, so the rewrite would have filed ` +
      `"SAN JUAN AND VICINITY" as Adjuntas Municipio. There is no verified ` +
      `crosswalk, so these rows are excluded rather than guessed, and this ` +
      `catalog therefore covers the 50 states and the District of Columbia ` +
      `and no territory. That is a coverage gap, stated, not a claim that ` +
      `territories had no flood, flash flood or thunderstorm wind.`,
    `Episode assembly: ${counts.episodesCompiled} (source episode, family) ` +
      `groups over ${areaTotal} affected areas and ${episodeEventTotal} ` +
      `event ids. Per family: ${JSON.stringify(perFamily)}.`,
    `Sum of eventCount over episodes (${episodeEventTotal}) equals the county ` +
      `rows kept (${counts.countyRowsKept}): ` +
      `${episodeEventTotal === counts.countyRowsKept ? "yes" : "NO"}.`,
    `Sum of monthlyCatalog.episodeCount (${monthlyEpisodeTotal}) equals ` +
      `counts.episodesCompiled (${counts.episodesCompiled}): ` +
      `${monthlyEpisodeTotal === counts.episodesCompiled ? "yes" : "NO"}. ` +
      `Sum of monthlyCatalog.eventRowCount (${monthlyEventTotal}) equals the ` +
      `county rows kept: ` +
      `${monthlyEventTotal === counts.countyRowsKept ? "yes" : "NO"}.`,
    `A source episode whose rows span more than one admitted family is one ` +
      `source episode but appears once per family, because a catalog entry ` +
      `carries a single family. The (episodeId, family) pair is the unique ` +
      `key; episodeId alone is not. Multiple rows of one episode are never ` +
      `counted as independent storms: they are affected areas and event ids ` +
      `of one entry.`,
    `Episodes whose county rows touch more than one state: ` +
      `${crossStateEpisodes}. Such an episode is attributed to each state it ` +
      `touches, counting only that state's counties, so a state's footprint ` +
      `is never inflated by another state's rows.`,
    `Declared window 2000-2024, exposure ${nonMissingYears} of 25 years; ` +
      `missing years: ${missingYears.length === 0 ? "none" : missingYears.join(", ")}. ` +
      `episodesPerExposureYear divides a cell's episode count by ` +
      `${nonMissingYears}; had any year been missing, every rate cell would ` +
      `have been emitted as null with missingYearNote rather than divided by ` +
      `a partial exposure.`,
    `Rates are per-exposure-year arithmetic on the declared catalog only. No ` +
      `rate is modeled, smoothed, extrapolated or borrowed from another ` +
      `window, family or place.`,
    `Reporting discontinuities inside the window, found by comparing each ` +
      `year's episode count for a family against that family's 25-year median ` +
      `and flagging any year below a tenth of it: ` +
      `${describeDiscontinuities(compiled)}. These are present years with a ` +
      `real count, not missing years, so their rate cells are computed rather ` +
      `than nulled — but an episodesPerExposureYear that averages over them ` +
      `is averaging over a change in how the publisher classified reports, ` +
      `not only over weather. Read the flagged families with that in mind.`,
    `No casualty, injury or loss figure was read. INJURIES_DIRECT, ` +
      `INJURIES_INDIRECT, DEATHS_DIRECT, DEATHS_INDIRECT, DAMAGE_PROPERTY and ` +
      `DAMAGE_CROPS are never parsed, and EPISODE_NARRATIVE and ` +
      `EVENT_NARRATIVE are not carried in any form, including length.`,
    `State-by-month rows: ${stateMonthlyCatalog.length}, being ` +
      `${stateMonthlyCatalog.length / 36} states present x 3 families x 12 ` +
      `months, emitted as a complete grid per state. Their episode counts sum ` +
      `to ${stateMonthlyCatalog.reduce((sum, cell) => sum + cell.episodeCount, 0)}, ` +
      `which equals the state-attributed episode total ` +
      `(${stateAttributedEpisodeTotal}): ` +
      `${
        stateMonthlyCatalog.reduce(
          (sum, cell) => sum + cell.episodeCount,
          0,
        ) === stateAttributedEpisodeTotal
          ? "yes"
          : "NO"
      }. It exceeds counts.episodesCompiled by ` +
      `${stateAttributedEpisodeTotal - counts.episodesCompiled}, and ` +
      `${crossStateEpisodes} episodes have a county footprint that crosses a ` +
      `state line. Those two numbers agree ` +
      `(an excess of zero exactly when no episode crosses a line): ` +
      `${
        (stateAttributedEpisodeTotal - counts.episodesCompiled === 0) ===
        (crossStateEpisodes === 0)
          ? "yes"
          : "NO"
      }. In THIS window the excess is ` +
      `${stateAttributedEpisodeTotal - counts.episodesCompiled}, so the state ` +
      `rows happen to sum exactly to the national total. That is a measured ` +
      `property of this data, not a guarantee: the attribution rule counts a ` +
      `border-spanning episode once per state, so a window containing any ` +
      `such episode would make the sum exceed the national total. Do not ` +
      `build a consumer that relies on the sum being equal.`,
    `Every state-by-month cell uses the same one-step arithmetic as the ` +
      `national monthly cells: episodeCount / ${nonMissingYears}. No state ` +
      `rate is derived by multiplying a national month share by a state ` +
      `share, because month and place are not independent here.`,
    `State footprint rows: ${stateFootprintProfile.length}. Median and p90 ` +
      `counties per episode are nearest-rank order statistics over that ` +
      `state-and-family's episodes, so both are integers that a real episode ` +
      `actually had.`,
    `Episode rows emitted: ${policy.episodeRowsEmitted} of ` +
      `${policy.episodesCompiledInWindow} (${policy.appliedStep}); ` +
      `aggregates cover the full window.`,
    `Where the publisher bytes were read from is deliberately not recorded ` +
      `here. --raw-dir moves the cache, not the data, and the lock already ` +
      `pins which bytes they must be; writing the path in would make the ` +
      `artifact differ between two machines that compiled the same evidence. ` +
      `The compile prints it to stdout instead.`,
    `End date earlier than start date, repaired to the start date: ` +
      `${diagnostics.endBeforeStartRepairs} episodes.`,
  ];
  return lines;
}

function isoFromYearMonthDay(yearMonth, day) {
  const ym = String(yearMonth ?? "").trim();
  const d = Number(String(day ?? "").trim());
  if (!/^\d{6}$/.test(ym)) return null;
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(4, 6));
  if (month < 1 || month > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(d, 2)}`;
}

// ---------------------------------------------------------------------------
// Entry point

async function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const doAcquire = argv.includes("--acquire");
  const rawFlag = argv.indexOf("--raw-dir");
  const rawDir =
    rawFlag === -1
      ? DEFAULT_RAW_DIR
      : resolve(process.cwd(), argv[rawFlag + 1]);

  if (doAcquire) {
    const artifacts = await acquire(rawDir);
    const lockText = await stableStringify({
      schema: "storm-events-artifact-lock/v1",
      dataProduct: DATA_PRODUCT,
      publisher: "NOAA National Centers for Environmental Information (NCEI)",
      documentationUrl:
        "https://www.ncdc.noaa.gov/stormevents/details.jsp?type=collection",
      rights: {
        status: "public-domain-us-government",
        declaredLicense: "U.S. Government Work (17 U.S.C. § 105)",
        attributionRequired: false,
      },
      storage: resolve(rawDir).startsWith(resolve(ROOT) + "/")
        ? "committed"
        : "cached-outside-repository",
      rawDir: resolve(rawDir).startsWith(resolve(ROOT) + "/")
        ? relative(ROOT, rawDir)
        : rawDir,
      artifacts,
    });
    mkdirSync(DOMAIN, { recursive: true });
    writeFileSync(LOCK_PATH, lockText);
    console.log(
      `wrote ${relative(ROOT, LOCK_PATH)} (${artifacts.length} files)`,
    );
    return;
  }

  if (argv.includes("--relock")) {
    // Rewrite the lock from bytes already on disk, without re-downloading:
    // the pinned digests must still match, only where the files live changes.
    const previous = readLock();
    for (const artifact of previous.artifacts) {
      const path = join(rawDir, artifact.fileName);
      if (!existsSync(path)) {
        throw new Error(
          `Cannot relock: ${artifact.fileName} is not in ${rawDir}.`,
        );
      }
      const bytes = readFileSync(path);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (
        digest !== artifact.sha256 ||
        bytes.byteLength !== artifact.byteLength
      ) {
        throw new Error(
          `Cannot relock: ${artifact.fileName} does not match its pinned digest.`,
        );
      }
    }
    const inRepo = resolve(rawDir).startsWith(resolve(ROOT) + "/");
    const lockText = await stableStringify({
      ...previous,
      storage: inRepo ? "committed" : "cached-outside-repository",
      rawDir: inRepo ? relative(ROOT, rawDir) : rawDir,
    });
    writeFileSync(LOCK_PATH, lockText);
    console.log(
      `relocked ${relative(ROOT, LOCK_PATH)}: ${previous.artifacts.length} files verified in ${rawDir}`,
    );
    return;
  }

  const lock = readLock();
  const { catalog, compiled, diagnostics } = await compile(rawDir, lock);

  const corpusText = await stableStringify(catalog);
  const coverage = buildCoverage(compiled, diagnostics, catalog);
  const manifestText = await stableStringify({
    schema: "storm-events-corpus-manifest/v1",
    corpusId: "storm-events-2000-2024",
    asOf: AS_OF,
    canonicalSha256: sha256(Buffer.from(corpusText)),
    corpusPath: "data/source/storm-events-2000-2024/corpus.json",
    runtimeArtifactPath: relative(ROOT, RUNTIME_OUT),
    runtimeArtifactIsByteIdenticalToCorpus: true,
    compiler: { name: COMPILER, version: COMPILER_VERSION },
    parser: { name: "ncei-storm-events-details-csv", version: "1.0.0" },
    jsonFormatter: `prettier ${packageVersion("prettier")}`,
    inputClass: "production",
    inputs: catalog.sources.map((source) => ({
      artifactId: source.id,
      sha256: source.sha256,
    })),
    recordCount: catalog.episodes.length,
    coverage,
  });

  const outputs = [
    [join(DOMAIN, "corpus.json"), corpusText],
    [RUNTIME_OUT, corpusText],
    [join(DOMAIN, "corpus-manifest.json"), manifestText],
  ];
  let drift = false;
  for (const [path, text] of outputs) {
    if (check) {
      const current = existsSync(path) ? readFileSync(path, "utf8") : null;
      if (current !== text) {
        drift = true;
        console.error(`drift: ${relative(ROOT, path)}`);
      }
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
  }
  console.log(
    JSON.stringify(
      {
        counts: catalog.counts,
        episodeDetailPolicy: catalog.episodeDetailPolicy,
        corpusBytes: Buffer.byteLength(corpusText),
        coverage,
      },
      null,
      2,
    ),
  );
  if (drift) process.exit(1);
}

function buildCoverage(compiled, diagnostics, catalog) {
  const perYearFamily = {};
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    const forYear = compiled.filter((episode) => episode.year === year);
    perYearFamily[year] = {
      detailRowsRead: diagnostics.rowsPerYear[year] ?? 0,
      episodes: Object.fromEntries(
        FAMILIES.map((family) => [
          family,
          forYear.filter((episode) => episode.family === family).length,
        ]),
      ),
      countyRowsKept: Object.fromEntries(
        FAMILIES.map((family) => [
          family,
          diagnostics.countyRowsPerYearFamily[`${year}|${family}`] ?? 0,
        ]),
      ),
    };
  }
  return {
    isCompleteUniverse: false,
    universeDescription:
      "Every county-based (CZ_TYPE = C) Flood, Flash Flood and Thunderstorm " +
      "Wind detail row the NOAA NCEI Storm Events Database publishes for " +
      "calendar years 2000 through 2024, in the annual bulk details revision " +
      "pinned by this domain's artifact lock. Zone-based rows of the same " +
      "families are counted but excluded. Every other event type in the " +
      "product is out of scope.",
    boundedSampleReason:
      catalog.episodeDetailPolicy.episodeRowsCoverFullWindow === true
        ? null
        : catalog.episodeDetailPolicy.warning,
    windowYears: { firstYear: FIRST_YEAR, lastYear: LAST_YEAR },
    missingYears: catalog.window.missingYears,
    counts: catalog.counts,
    perYear: perYearFamily,
  };
}

await main();
