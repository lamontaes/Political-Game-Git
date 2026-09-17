#!/usr/bin/env node
/* global Buffer, console, process */
/**
 * Electoral calibration compiler (WORLD46 W2 / R4).
 *
 * Re-derives the reference-observation electoral calibration artifact from the
 * publisher bytes pinned under data/source/electoral-calibration-2024/raw/.
 * No network access happens here; acquisition is documented in the domain
 * README and pinned by SHA-256 in artifact-lock.json.
 *
 *   node scripts/world/compile-electoral-calibration.mjs          compile + write
 *   node scripts/world/compile-electoral-calibration.mjs --check  compile, fail if outputs differ
 *
 * Sources:
 *   - Clerk of the U.S. House, "Statistics of the Presidential and Congressional
 *     Election" for 2024 (House, Senate class I, presidential electors), 2020
 *     (Senate class II) and 2022 (Senate class III, Oklahoma class II special).
 *   - National Governors Association governor pages (party and printed terms),
 *     read for the term in progress on the as-of date.
 *   - Census 119th Congress district identities already compiled in
 *     src/districts/identities.generated.json.
 *
 * Nothing here is inferred from outside those bytes. A number the source does
 * not print stays null with a note; it is never zeroed.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COMPILER = "scripts/world/compile-electoral-calibration.mjs";
const COMPILER_VERSION = "1.0.0";
const SCHEMA = "political-geography-v1";
const AS_OF = "2026-01-05";
const CONGRESS = 119;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOMAIN = join(ROOT, "data/source/electoral-calibration-2024");
const RAW = join(DOMAIN, "raw");
const RUNTIME_OUT = join(
  ROOT,
  "src/simulation/world-setup/electoral-calibration.generated.json",
);
const IDENTITIES = join(ROOT, "src/districts/identities.generated.json");
const PDFJS = join(ROOT, "node_modules/pdfjs-dist/legacy/build/pdf.mjs");

const CLERK_INDEX = "https://clerk.house.gov/Members/ViewElectionInformation";

/** Acquisition facts. retrievedAt is the server Date header of the capture. */
const CLERK_SOURCES = [
  {
    id: "clerk-2024",
    year: 2024,
    localPath: "raw/statistics2024.pdf",
    url: "https://clerk.house.gov/member_info/electionInfo/2024/statistics2024.pdf",
    retrievedAt: "2026-09-17T03:07:00Z",
    publishedNote:
      "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024 (title page: published March 10, 2025; HTTP Last-Modified Wed, 19 Mar 2025 15:53:11 GMT). Index: " +
      CLERK_INDEX,
  },
  {
    id: "clerk-2020",
    year: 2020,
    localPath: "raw/statistics2020.pdf",
    url: "https://clerk.house.gov/member_info/electionInfo/2020/statistics2020.pdf",
    retrievedAt: "2026-09-17T03:05:00Z",
    publishedNote:
      "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 3, 2020 (HTTP Last-Modified Tue, 09 Mar 2021 17:03:19 GMT). Used for Senate class II. Index: " +
      CLERK_INDEX,
  },
  {
    id: "clerk-2022",
    year: 2022,
    localPath: "raw/statistics2022.pdf",
    url: "https://clerk.house.gov/member_info/electionInfo/2022/statistics2022.pdf",
    retrievedAt: "2026-09-17T03:05:00Z",
    publishedNote:
      "Clerk of the U.S. House, Statistics of the Congressional Election of November 8, 2022 (HTTP Last-Modified Thu, 09 Mar 2023 23:26:00 GMT). Used for Senate class III and the Oklahoma class II special. Index: " +
      CLERK_INDEX,
  },
];

const NGA_RETRIEVED_AT = "2026-09-17T03:10:22Z";

const STATES = {
  AL: "ALABAMA",
  AK: "ALASKA",
  AZ: "ARIZONA",
  AR: "ARKANSAS",
  CA: "CALIFORNIA",
  CO: "COLORADO",
  CT: "CONNECTICUT",
  DE: "DELAWARE",
  FL: "FLORIDA",
  GA: "GEORGIA",
  HI: "HAWAII",
  ID: "IDAHO",
  IL: "ILLINOIS",
  IN: "INDIANA",
  IA: "IOWA",
  KS: "KANSAS",
  KY: "KENTUCKY",
  LA: "LOUISIANA",
  ME: "MAINE",
  MD: "MARYLAND",
  MA: "MASSACHUSETTS",
  MI: "MICHIGAN",
  MN: "MINNESOTA",
  MS: "MISSISSIPPI",
  MO: "MISSOURI",
  MT: "MONTANA",
  NE: "NEBRASKA",
  NV: "NEVADA",
  NH: "NEW HAMPSHIRE",
  NJ: "NEW JERSEY",
  NM: "NEW MEXICO",
  NY: "NEW YORK",
  NC: "NORTH CAROLINA",
  ND: "NORTH DAKOTA",
  OH: "OHIO",
  OK: "OKLAHOMA",
  OR: "OREGON",
  PA: "PENNSYLVANIA",
  RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA",
  TN: "TENNESSEE",
  TX: "TEXAS",
  UT: "UTAH",
  VT: "VERMONT",
  VA: "VIRGINIA",
  WA: "WASHINGTON",
  WV: "WEST VIRGINIA",
  WI: "WISCONSIN",
  WY: "WYOMING",
};
const DC = { DC: "DISTRICT OF COLUMBIA" };
const TERRITORIES = [
  "AMERICAN SAMOA",
  "GUAM",
  "NORTHERN MARIANA ISLANDS",
  "PUERTO RICO",
  "VIRGIN ISLANDS",
];
const HEADER_TO_USPS = new Map(
  Object.entries({ ...STATES, ...DC }).map(([k, v]) => [v, k]),
);
const STATE_USPS = Object.keys(STATES).sort();

/**
 * Senate classes as senate.gov publishes them. Mirrors SENATE_CLASSES_BY_STATE
 * in src/simulation/living-world/congress-seats.ts (the test asserts the seat
 * keys agree).
 */
const SENATE_CLASSES_BY_STATE = {
  AK: [2, 3],
  AL: [2, 3],
  AR: [2, 3],
  AZ: [1, 3],
  CA: [1, 3],
  CO: [2, 3],
  CT: [1, 3],
  DE: [1, 2],
  FL: [1, 3],
  GA: [2, 3],
  HI: [1, 3],
  IA: [2, 3],
  ID: [2, 3],
  IL: [2, 3],
  IN: [1, 3],
  KS: [2, 3],
  KY: [2, 3],
  LA: [2, 3],
  MA: [1, 2],
  MD: [1, 3],
  ME: [1, 2],
  MI: [1, 2],
  MN: [1, 2],
  MO: [1, 3],
  MS: [1, 2],
  MT: [1, 2],
  NC: [2, 3],
  ND: [1, 3],
  NE: [1, 2],
  NH: [2, 3],
  NJ: [1, 2],
  NM: [1, 2],
  NV: [1, 3],
  NY: [1, 3],
  OH: [1, 3],
  OK: [2, 3],
  OR: [2, 3],
  PA: [1, 3],
  RI: [1, 2],
  SC: [2, 3],
  SD: [2, 3],
  TN: [1, 2],
  TX: [1, 2],
  UT: [1, 3],
  VA: [1, 2],
  VT: [1, 3],
  WA: [1, 3],
  WI: [1, 3],
  WV: [1, 2],
  WY: [1, 2],
};

/** Jurisdictions whose printed November figures may not decide the seat. */
const MAJORITY_RUNOFF_STATES = new Set(["GA", "LA"]);
const RANKED_CHOICE_STATES = new Set(["AK", "ME"]);
const TOP_TWO_NOTES = {
  CA: "California top-two general election: both finalists may share a party.",
  WA: "Washington top-two general election: both finalists may share a party.",
  LA: "Louisiana open (nonpartisan-ballot) November election; a candidate without a majority would face a December runoff.",
  AK: "Alaska top-four primary with ranked-choice general; printed figures are first-choice tallies unless a footnote says otherwise.",
};

// ---------------------------------------------------------------------------
// Small utilities

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const NUM_RE = /^\d{1,3}(?:,\d{3})*$/;
const parseNum = (s) => Number(s.replace(/,/g, ""));

/**
 * Key-sorted JSON, then formatted by the repository's pinned Prettier so the
 * runtime artifact passes `prettier --check` without a hand edit.
 */
async function stableStringify(value) {
  const { format } = await import("prettier");
  return format(JSON.stringify(sortKeys(value)), { parser: "json" });
}
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys(value[k])]),
    );
  }
  return value;
}

function kebab(label) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lines that are not votes for any candidate. */
const NON_CANDIDATE = new Map([
  ["blank", "blank"],
  ["blanks", "blank"],
  ["blank votes", "blank"],
  ["void", "void"],
  ["invalid", "invalid"],
  ["over votes", "over-votes"],
  ["overvotes", "over-votes"],
  ["under votes", "under-votes"],
  ["undervotes", "under-votes"],
  ["exhausted ballots", "exhausted-ballots"],
  ["exhausted ballot", "exhausted-ballots"],
  ["continuing ballots", "continuing-ballots"],
  ["unadjudicated", "unadjudicated"],
  ["none of these candidates", "none-of-these-candidates"],
]);
/** Lines that are votes for unnamed or write-in candidates. */
const UNNAMED_CANDIDATE = new Map([
  ["write-in", "write-in"],
  ["write-ins", "write-in"],
  ["other write-ins", "write-in"],
  ["scattering", "scattering"],
  ["scatter", "scattering"],
  ["all others", "all-others"],
  ["others", "others"],
  ["miscellaneous", "miscellaneous"],
]);

function canonicalParty(label) {
  const l = label.trim();
  if (/^write-in\b/i.test(l)) return "write-in";
  if (/^democrat(ic)?$/i.test(l)) return "democratic";
  if (/^democratic-(farmer-labor|nonpartisan league|npl)$/i.test(l))
    return "democratic";
  if (/^republican$/i.test(l)) return "republican";
  return kebab(l);
}

// ---------------------------------------------------------------------------
// PDF text extraction (pdfjs-dist, positioned items)

async function extractPdf(bytes) {
  // Development-only cache of extracted items (never read by default).
  const cacheDir = process.env.ECAL_PDF_CACHE;
  const cachePath = cacheDir
    ? join(cacheDir, `${sha256(bytes)}.items.json`)
    : null;
  if (cachePath && existsSync(cachePath))
    return JSON.parse(readFileSync(cachePath, "utf8"));
  const { getDocument } = await import(PDFJS);
  const doc = await getDocument({
    data: new Uint8Array(bytes),
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((i) => typeof i.str === "string")
        .map((i) => ({
          x: i.transform[4],
          y: i.transform[5],
          rot: i.transform[1] !== 0,
          h: i.height,
          s: i.str,
        })),
    );
  }
  await doc.cleanup?.();
  if (cachePath) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, JSON.stringify(pages));
  }
  return pages;
}

/** Reassemble horizontal lines; superscript/"(n)" markers attach to a line. */
function buildLines(items) {
  const horizontal = items.filter((i) => !i.rot);
  const isMarker = (i) =>
    (i.h > 0 && i.h < 6 && /^\s*\d+\s*$/.test(i.s)) ||
    (i.x > 500 && /^\s*\(\d+\)\s*$/.test(i.s));
  const markers = horizontal.filter(isMarker);
  const body = horizontal
    .filter((i) => !isMarker(i))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of body) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= 1.5);
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it], markers: [] });
  }
  for (const m of markers) {
    const target = lines
      .filter(
        (l) => Math.abs(l.y - m.y) < 4.5 && l.items.some((i) => i.s.trim()),
      )
      .sort((a, b) => Math.abs(a.y - m.y) - Math.abs(b.y - m.y))[0];
    if (target) target.markers.push(m.s.replace(/[()\s]/g, ""));
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((l) => {
      const its = l.items.sort((a, b) => a.x - b.x);
      const labelItems = its.filter((i) => i.x < 500);
      const valueItems = its.filter((i) => i.x >= 500);
      const clean = (arr) =>
        arr
          .map((i) => i.s)
          .join("")
          .replace(/\.{3,}/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      return {
        y: l.y,
        x: its.find((i) => i.s.trim())?.x ?? its[0].x,
        text: clean(its),
        label: clean(labelItems),
        value: clean(valueItems),
        markers: [...new Set(l.markers)],
      };
    })
    .filter((l) => l.text);
}

// ---------------------------------------------------------------------------
// Statistics document parser

function parseStatistics(pages, sourceId) {
  const states = new Map();
  const footnotes = []; // { usps, text }
  let usps = null; // null while outside a state/DC (territories, front matter)
  let section = null; // "president" | "senate" | "house" | "other"
  let senateTerm = null;
  let house = null;
  let inRecap = false;
  let footnote = null;
  let lastCandidate = null;
  let stopped = false;
  let divisions = null;

  const stateRecord = (code) => {
    if (!states.has(code))
      states.set(code, { president: [], senate: [], house: [], totals: [] });
    return states.get(code);
  };

  pages.forEach((items, pageIndex) => {
    if (stopped) return;
    const lines = buildLines(items);
    const page = pageIndex + 1;
    readRotatedRecap(items, page, stateRecord);
    if (
      lines.some((l) =>
        /^Political Divisions of the U\.S\. Senate/.test(l.text),
      )
    ) {
      divisions = readPoliticalDivisions(items);
      stopped = true;
      return;
    }
    for (const line of lines) {
      const t = line.text;
      if (/^\d+$/.test(t) && line.y > 725) continue; // running page number
      if (/^\(?\d+\)?$/.test(t) && line.y < 50) continue; // folio on the first page of a signature
      const header = t.replace(/—Continued$/, "");
      if (HEADER_TO_USPS.has(header) && line.x > 150) {
        const code = HEADER_TO_USPS.get(header);
        if (code !== usps || !t.endsWith("—Continued")) {
          section = null;
          house = null;
          senateTerm = null;
          lastCandidate = null;
          inRecap = false;
        }
        usps = code;
        footnote = null;
        stateRecord(usps);
        continue;
      }
      if (TERRITORIES.includes(header) && line.x > 150) {
        usps = null;
        section = null;
        inRecap = false;
        continue;
      }
      if (!usps) continue;
      const rec = stateRecord(usps);

      if (/^Recapitulation of Votes Cast in /.test(t)) {
        inRecap = true;
        section = null;
        continue;
      }
      // Footnote bodies sit at the left margin without dot leaders.
      if (
        line.x < 50 &&
        !/^\d+\./.test(t) &&
        line.x > 30 &&
        !/district|^Total|^Senator|^Presidential|^Representative|^Title|^At large|^electors|^candidate/.test(
          t,
        )
      ) {
        if (line.markers.length || line.x > 44 || !footnote) {
          footnote = { usps, page, number: line.markers[0] ?? null, text: t };
          footnotes.push(footnote);
        } else {
          footnote.text = `${footnote.text} ${t}`.trim();
        }
        continue;
      }
      if (inRecap) {
        const m = t.match(
          /^(At large|\d+(?:st|d|th) district|Senator|Presidential(?: electors)?|Total)(?=[\s\d…]|$)(.*)$/,
        );
        if (m) {
          const nums = m[2].match(/\d{1,3}(?:,\d{3})*/g) ?? [];
          const endsWithNumber = /\d\s*$/.test(m[2]);
          rec.recapRows ??= [];
          rec.recapRows.push({
            label: m[1],
            total: endsWithNumber && nums.length ? parseNum(nums.at(-1)) : null,
            page,
          });
        }
        if (!/^FOR /.test(t)) continue;
        inRecap = false;
      }
      if (/^FOR PRESIDENTIAL ELECTORS/.test(t)) {
        section = "president";
        continue;
      }
      if (/^FOR UNITED STATES SENATOR/.test(t)) {
        section = "senate";
        if (!t.endsWith("—Continued")) {
          senateTerm = { term: null, lines: [], markersSeen: [] };
          rec.senate.push(senateTerm);
        }
        continue;
      }
      if (/^FOR UNITED STATES REPRESENTATIVE/.test(t)) {
        section = "house";
        continue;
      }
      if (/^FOR (DELEGATE|RESIDENT COMMISSIONER)/.test(t)) {
        section = "other";
        continue;
      }
      if (/^\(For (unexpired|full) term/.test(t) && section === "senate") {
        if (senateTerm.lines.length) {
          senateTerm = { term: null, lines: [], markersSeen: [] };
          rec.senate.push(senateTerm);
        }
        senateTerm.term = t.replace(/^\(|\)$/g, "");
        continue;
      }
      if (/^AT LARGE$/.test(t) && section === "house") {
        house = { district: "00", lines: [], atLarge: true, page };
        rec.house.push(house);
        continue;
      }
      if (!section || section === "other") continue;

      // Candidate or tally line.
      const distMatch = line.label.match(/^(\d+)\.\s+(.*)$/);
      let label = distMatch ? distMatch[2] : line.label;
      if (section === "house" && distMatch) {
        house = {
          district: distMatch[1].padStart(2, "0"),
          lines: [],
          atLarge: false,
          page,
        };
        rec.house.push(house);
      }
      const votes = NUM_RE.test(line.value) ? parseNum(line.value) : null;
      if (line.value && votes === null)
        throw new Error(
          `${sourceId} p${page}: unparsed vote value "${line.value}" in "${t}"`,
        );
      const entry = {
        raw: label,
        votes,
        markers: line.markers,
        indented: line.x > 68 && !distMatch,
        page,
      };
      if (/^Total$/i.test(label)) {
        rec.totals.push({
          section,
          votes,
          term: senateTerm?.term ?? null,
          district: house?.district ?? null,
        });
        continue;
      }
      if (section === "president") {
        rec.president.push({ ...entry, party: label });
        continue;
      }
      const target = section === "senate" ? senateTerm : house;
      if (!target)
        throw new Error(
          `${sourceId} p${page}: ${section} line before a contest header: "${t}"`,
        );
      const lower = label.toLowerCase();
      if (entry.indented) {
        if (!lastCandidate)
          throw new Error(
            `${sourceId} p${page}: fusion line without candidate: "${t}"`,
          );
        target.lines.push({
          ...entry,
          kind: "candidate",
          candidate: lastCandidate,
          party: label,
        });
        continue;
      }
      if (NON_CANDIDATE.has(lower)) {
        target.lines.push({
          ...entry,
          kind: "non-candidate",
          key: NON_CANDIDATE.get(lower),
        });
        lastCandidate = null;
        continue;
      }
      if (UNNAMED_CANDIDATE.has(lower) || /^write-in\s*\(/i.test(label)) {
        target.lines.push({
          ...entry,
          kind: "unnamed",
          key: UNNAMED_CANDIDATE.get(lower) ?? "write-in",
        });
        lastCandidate = null;
        continue;
      }
      const comma = label.lastIndexOf(", ");
      // A few lines print only a party label with no candidate name (e.g. 2020 VA-2
      // "Independent"); keep them as an unnamed candidate of that party.
      const name = comma < 0 ? null : label.slice(0, comma).trim();
      const party = comma < 0 ? label.trim() : label.slice(comma + 2).trim();
      if (!party)
        throw new Error(
          `${sourceId} p${page}: cannot split candidate/party: "${t}"`,
        );
      lastCandidate = `${name}#${target.lines.length}`;
      target.lines.push({
        ...entry,
        kind: "candidate",
        candidate: lastCandidate,
        name,
        party,
      });
    }
  });
  return { states, footnotes, divisions };
}

/**
 * Some state recapitulation tables are printed sideways. Rotated text runs
 * along y, so a table row shares one x and its cells are ordered by y; the
 * right-most (Total) cell is the numeric cell with the greatest y. A table that
 * wraps into a second block repeats its row labels, so the last occurrence of
 * a label carries the Total.
 */
function readRotatedRecap(items, page, stateRecord) {
  const rot = items.filter((i) => i.rot && i.s.trim());
  const title = rot.find((i) =>
    /^Recapitulation of Votes Cast in /.test(i.s.trim()),
  );
  if (!title) return;
  const name = title.s
    .trim()
    .replace(/^Recapitulation of Votes Cast in /, "")
    .replace(/—Continued$/, "")
    .toUpperCase();
  const code = HEADER_TO_USPS.get(name);
  if (!code) return;
  const rec = stateRecord(code);
  const labels = rot
    .filter((i) =>
      /^(At large|\d+(?:st|d|th) district|Senator|Presidential)\b/.test(
        i.s.trim(),
      ),
    )
    .sort((a, b) => a.x - b.x);
  for (const label of labels) {
    const cells = rot
      .filter(
        (i) => i !== label && Math.abs(i.x - label.x) <= 1.5 && i.y > label.y,
      )
      .map((i) => ({
        y: i.y,
        m: i.s.trim().match(/^(\d{1,3}(?:,\d{3})*)(?:\s|$)/),
      }))
      .filter((c) => c.m);
    if (!cells.length) continue;
    const last = cells.sort((a, b) => b.y - a.y)[0];
    rec.recapRows ??= [];
    rec.recapRows.push({
      label: label.s
        .trim()
        .match(/^(At large|\d+(?:st|d|th) district|Senator|Presidential)/)[1],
      total: parseNum(last.m[1]),
      page,
      rotated: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Contest normalization

function summarizeContest(lines, ctx) {
  const notes = [];
  const candidateTotalsByParty = {};
  const rawLabels = [];
  const nonCandidateLines = {};
  const candidates = new Map(); // id -> { name, party (name-line), votes|null, parties: [] }
  let unopposedNoTally = false;
  let rcvRoundLines = false;

  for (const l of lines) {
    if (l.kind === "non-candidate") {
      if (l.key === "continuing-ballots" || l.key === "exhausted-ballots")
        rcvRoundLines = true;
      if (l.votes !== null)
        nonCandidateLines[l.key] = (nonCandidateLines[l.key] ?? 0) + l.votes;
      if (!rawLabels.includes(l.raw)) rawLabels.push(l.raw);
      continue;
    }
    const partyLabel = l.kind === "unnamed" ? l.raw : l.party;
    if (!rawLabels.includes(partyLabel)) rawLabels.push(partyLabel);
    const key = l.kind === "unnamed" ? l.key : canonicalParty(partyLabel);
    if (l.votes === null) {
      if (l.kind === "candidate" && !l.indented) unopposedNoTally = true;
      else notes.push(`Line "${l.raw}" printed without a vote figure.`);
    } else {
      candidateTotalsByParty[key] =
        (candidateTotalsByParty[key] ?? 0) + l.votes;
    }
    if (l.kind === "candidate") {
      const c = candidates.get(l.candidate) ?? {
        name: l.name,
        party: canonicalParty(l.party),
        votes: null,
        markers: [],
      };
      if (l.votes !== null) c.votes = (c.votes ?? 0) + l.votes;
      c.markers.push(...l.markers);
      candidates.set(l.candidate, c);
    }
  }

  const named = [...candidates.values()];
  const tallied = named.filter((c) => c.votes !== null);
  let totalVotes = Object.values(candidateTotalsByParty).reduce(
    (a, b) => a + b,
    0,
  );
  if (!tallied.length && !Object.keys(candidateTotalsByParty).length)
    totalVotes = null;

  let certifiedWinnerParty = null;
  let winnerBasis = null;
  let ambiguous = false;
  let uncontested = false;
  let decidingCount = null;

  if (unopposedNoTally) {
    if (named.length !== 1) {
      ambiguous = true;
      notes.push(
        "A candidate is printed without a tally alongside other candidates; winner not derived.",
      );
    } else {
      certifiedWinnerParty = named[0].party;
      winnerBasis = "unopposed-no-tally";
      uncontested = true;
      totalVotes = null;
      for (const k of Object.keys(candidateTotalsByParty))
        delete candidateTotalsByParty[k];
      notes.push(
        `Printed without a vote tally; the Clerk footnote states that under ${ctx.stateName} law the names of candidates with no opposition are not printed on the ballot. Vote totals are missing (null), not zero.`,
      );
    }
  } else if (tallied.length) {
    const sorted = [...tallied].sort((a, b) => b.votes - a.votes);
    const [first, second] = sorted;
    if (second && first.votes === second.votes) {
      ambiguous = true;
      notes.push("Printed tallies tie for first place; winner not derived.");
    } else {
      certifiedWinnerParty = first.party;
      winnerBasis = "plurality-of-printed-totals";
    }
    // Uncontested: no other candidate with a ballot line (write-ins are not on the ballot).
    uncontested = named.length === 1;
    if (uncontested)
      notes.push(
        "No other named ballot candidate; any remaining votes are write-in, scattering or non-candidate lines.",
      );

    const runoffFootnote = ctx.footnoteFor(first.markers);
    const denominator = totalVotes ?? 0;
    const hasMajority = first.votes * 2 > denominator;
    if (runoffFootnote) {
      const text = runoffFootnote.text;
      notes.push(`Clerk footnote: ${text}`);
      if (/runoff election/i.test(text) || /ranked-choice/i.test(text)) {
        decidingCount = {
          kind: /runoff/i.test(text) ? "runoff" : "ranked-choice-round",
          totalsByParty: Object.fromEntries(
            tallied
              .filter((c) => c.markers.length)
              .map((c) => [c.party, c.votes]),
          ),
        };
        winnerBasis = /runoff/i.test(text)
          ? "printed-runoff-count"
          : "printed-rcv-final-round";
        const deciding = tallied
          .filter((c) => c.markers.length)
          .sort((a, b) => b.votes - a.votes);
        if (deciding.length >= 2 && deciding[0].votes > deciding[1].votes) {
          certifiedWinnerParty = deciding[0].party;
        } else {
          certifiedWinnerParty = null;
          winnerBasis = null;
          ambiguous = true;
          notes.push(
            "Footnoted deciding-count lines do not identify a single leader.",
          );
        }
        // Replace the footnoted figures with the November figures the footnote states.
        const general = [
          ...text.matchAll(/([A-Z][^,]*?) received ([\d,]+) votes/g),
        ].map((m) => ({
          name: m[1]
            .replace(/^.*?\b(?:election|round 1 of the election),\s*/i, "")
            .trim(),
          votes: parseNum(m[2]),
        }));
        for (const c of tallied.filter((c) => c.markers.length)) {
          const hit = general.find((g) => g.name === c.name);
          if (!hit) {
            ambiguous = true;
            notes.push(
              `Footnote gives no November figure for ${c.name}; November totals incomplete.`,
            );
            continue;
          }
          const key = c.party;
          candidateTotalsByParty[key] =
            candidateTotalsByParty[key] - c.votes + hit.votes;
        }
        totalVotes = Object.values(candidateTotalsByParty).reduce(
          (a, b) => a + b,
          0,
        );
        notes.push(
          "candidateTotalsByParty and totalVotes carry the November general-election figures stated in the footnote plus the other printed November lines; decidingCount carries the printed runoff/round figures that decided the seat.",
        );
      }
    } else if (rcvRoundLines) {
      winnerBasis = "printed-rcv-final-round";
      decidingCount = {
        kind: "ranked-choice-round",
        totalsByParty: { ...candidateTotalsByParty },
      };
      const continuing = nonCandidateLines["continuing-ballots"];
      notes.push(
        `Printed with "Continuing Ballots"/"Exhausted Ballots" lines, i.e. a ranked-choice tabulation round (the page carries no footnote naming the round). Candidate figures are that round's figures, not first-choice November figures.${continuing !== undefined ? ` Continuing ballots printed: ${continuing}.` : ""}`,
      );
    } else if (
      (MAJORITY_RUNOFF_STATES.has(ctx.usps) ||
        RANKED_CHOICE_STATES.has(ctx.usps)) &&
      !hasMajority &&
      !uncontested
    ) {
      // Printed November figures without a majority do not decide these seats.
      const rest = denominator - first.votes - second.votes;
      if (
        RANKED_CHOICE_STATES.has(ctx.usps) &&
        second &&
        rest < second.votes &&
        first.party === second.party
      ) {
        notes.push(
          `No first-choice majority in a ranked-choice contest; the two leading candidates (${first.party}) share a party and all other lines together (${rest}) are below the second-place tally, so the winning party is fixed even though the document does not state the tabulation.`,
        );
        winnerBasis = "rcv-finalists-share-party";
      } else {
        ambiguous = true;
        notes.push(
          `Leader has no majority of printed votes (${first.votes} of ${denominator}) in a ${RANKED_CHOICE_STATES.has(ctx.usps) ? "ranked-choice" : "majority-runoff"} jurisdiction and the document prints no deciding round; the printed plurality does not establish the winner.`,
        );
        certifiedWinnerParty = null;
        winnerBasis = null;
      }
    }
  } else {
    ambiguous = true;
    notes.push("No tallied candidate lines parsed.");
  }

  const d = candidateTotalsByParty.democratic;
  const r = candidateTotalsByParty.republican;
  const democraticTwoPartyShare = d > 0 && r > 0 ? round6(d / (d + r)) : null;
  if (TOP_TWO_NOTES[ctx.usps] && ctx.chamber !== "president")
    notes.push(TOP_TWO_NOTES[ctx.usps]);
  if (democraticTwoPartyShare === null && !unopposedNoTally)
    notes.push(
      "democraticTwoPartyShare is null: the printed contest lacks a Democratic or a Republican candidate with votes.",
    );
  if (Object.keys(nonCandidateLines).length)
    notes.push(
      "nonCandidateLines (blank, void, over/under votes, ballot-round lines) are printed by the state and excluded from totalVotes.",
    );

  return {
    candidateTotalsByParty,
    rawLabels,
    nonCandidateLines,
    totalVotes,
    certifiedWinnerParty,
    winnerBasis,
    democraticTwoPartyShare,
    uncontested,
    ambiguous,
    decidingCount,
    notes,
    candidateCount: named.length,
  };
}

function footnoteLookup(parsed, usps) {
  const mine = parsed.footnotes.filter((f) => f.usps === usps);
  return (markers) => {
    for (const m of markers) {
      const hit = mine.find((f) => f.number === m && f.text);
      if (hit) return hit;
    }
    return null;
  };
}

function termToClass(term) {
  if (!term) return { cls: null, kind: "regular" };
  const m = term.match(
    /^For (unexpired|full) term (?:ending|beginning) January 3, (\d{4})$/,
  );
  if (!m) throw new Error(`Unrecognized Senate term note: ${term}`);
  const year = Number(m[2]);
  // Class I terms began 2019/2025, class II 2021, class III 2023 (six-year rotation).
  const startYear = m[1] === "full" ? year : year - 6;
  const cls = { 2019: 1, 2025: 1, 2021: 2, 2027: 2, 2017: 3, 2023: 3 }[
    startYear
  ];
  if (!cls) throw new Error(`Cannot map Senate term note to a class: ${term}`);
  return { cls, kind: m[1] === "full" ? "regular" : "special" };
}

// ---------------------------------------------------------------------------
// Governors (NGA)

const NGA_SLUGS = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  FL: "florida",
  GA: "georgia",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new-hampshire",
  NJ: "new-jersey",
  NM: "new-mexico",
  NY: "new-york",
  NC: "north-carolina",
  ND: "north-dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  RI: "rhode-island",
  SC: "south-carolina",
  SD: "south-dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west-virginia",
  WI: "wisconsin",
  WY: "wyoming",
};
/**
 * Governor pages read when the current NGA state page shows a term that began
 * after the as-of date. Each named page must itself identify the state and
 * print a term covering the as-of date, or the row stays ambiguous.
 */
const NGA_PREDECESSOR_PAGES = {
  NJ: {
    file: "nga/governor_phil-murphy.html",
    url: "https://www.nga.org/governor/phil-murphy/",
  },
  VA: {
    file: "nga/governor_glenn-youngkin.html",
    url: "https://www.nga.org/governor/glenn-youngkin/",
  },
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
function parseLongDate(s) {
  const m = s.trim().match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!m) return null;
  const mo = MONTHS.indexOf(m[1].toLowerCase());
  if (mo < 0) return null;
  return `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}
function decodeEntities(s) {
  return s
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}
function readNgaPage(html) {
  const text = decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]*>/g, "\n")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const termsAt = text.indexOf("Terms");
  const partyAt = text.indexOf("Party", termsAt);
  if (termsAt < 0 || partyAt < 0) return null;
  const terms = text.slice(termsAt + 1, partyAt).map((t) => {
    const [a, b] = t.split(/\s+-\s+/);
    return {
      start: parseLongDate(a ?? ""),
      end: /^current$/i.test((b ?? "").trim())
        ? "current"
        : parseLongDate(b ?? ""),
      printed: t,
    };
  });
  const name = text[termsAt - 1];
  const stateName = text[termsAt - 2];
  return { name, stateName, terms, party: text[partyAt + 1] };
}

function compileGovernor(usps, readRaw) {
  const notes = [];
  const primary = readNgaPage(
    readRaw(`nga/${NGA_SLUGS[usps]}.html`).toString("utf8"),
  );
  const pick = (page) =>
    page?.terms.find(
      (t) =>
        t.start &&
        t.start <= AS_OF &&
        (t.end === "current" || (t.end && t.end >= AS_OF)),
    );
  if (!primary)
    return {
      stateUsps: usps,
      party: null,
      termStart: null,
      status: "missing",
      notes: ["NGA state page did not expose a Terms/Party block."],
      sourceIds: [`nga-${usps.toLowerCase()}`],
    };
  let page = primary;
  let term = pick(primary);
  const sourceIds = [`nga-${usps.toLowerCase()}`];
  if (!term) {
    const pred = NGA_PREDECESSOR_PAGES[usps];
    notes.push(
      `Current NGA page (${primary.name}) prints terms [${primary.terms.map((t) => t.printed).join("; ")}], none in progress on ${AS_OF}; the September 2026 officeholder is not copied backwards.`,
    );
    if (!pred)
      return {
        stateUsps: usps,
        party: null,
        termStart: null,
        status: "missing",
        notes,
        sourceIds,
      };
    const predPage = readNgaPage(readRaw(pred.file).toString("utf8"));
    sourceIds.push(`nga-${usps.toLowerCase()}-predecessor`);
    const predTerm = pick(predPage);
    const stateOk =
      predPage && predPage.stateName.toUpperCase() === STATES[usps];
    if (!predTerm || !stateOk) {
      notes.push(
        `Predecessor page ${pred.url} does not establish a ${STATES[usps]} term covering ${AS_OF}.`,
      );
      return {
        stateUsps: usps,
        party: null,
        termStart: null,
        status: "ambiguous",
        notes,
        sourceIds,
      };
    }
    notes.push(
      `Officeholder on ${AS_OF} read from the NGA former-governor page ${pred.url} (${predPage.stateName}), whose printed term ${predTerm.printed} covers the as-of date.`,
    );
    page = predPage;
    term = predTerm;
  }
  const party = canonicalParty(page.party);
  if (page.party !== "Democratic" && page.party !== "Republican")
    notes.push(
      `NGA prints party as "${page.party}"; normalized to "${party}".`,
    );
  notes.push(
    `NGA-printed term in progress on ${AS_OF}: ${term.printed}. termStart is that printed term's first day as NGA prints it (not independently verified against state records).`,
  );
  const termYears = usps === "NH" || usps === "VT" ? 2 : 4;
  const spanEnd = term.end === "current" ? AS_OF : term.end;
  if (
    Number(spanEnd.slice(0, 4)) - Number(term.start.slice(0, 4)) >
    termYears
  ) {
    notes.push(
      `The printed term (${term.printed}) spans more than one ${termYears}-year gubernatorial term, so NGA appears to print consecutive terms as one span; termStart is the start of that printed span and may not be the start of the term in progress on ${AS_OF}.`,
    );
  }
  const continuous = page.terms
    .filter((t) => t.start && t.start <= term.start)
    .map((t) => t.start)
    .sort()[0];
  return {
    stateUsps: usps,
    party,
    termStart: term.start,
    firstPrintedTermStart: continuous ?? term.start,
    officeholderName: page.name.replace(/^Gov\.\s*/, ""),
    status: "compiled",
    notes,
    sourceIds,
  };
}

// ---------------------------------------------------------------------------
// Main

async function main() {
  const check = process.argv.includes("--check");
  const readRaw = (rel) => readFileSync(join(RAW, rel));

  // Sources and lock.
  const artifacts = [];
  const sources = [];
  for (const s of CLERK_SOURCES) {
    const bytes = readRaw(s.localPath.replace(/^raw\//, ""));
    const entry = {
      id: s.id,
      url: s.url,
      retrievedAt: s.retrievedAt,
      sha256: sha256(bytes),
      byteLength: bytes.length,
    };
    artifacts.push({
      ...entry,
      localPath: `data/source/electoral-calibration-2024/${s.localPath}`,
      mediaType: "application/pdf",
    });
    sources.push({ ...entry, publishedNote: s.publishedNote });
  }
  const ngaFiles = [
    {
      id: "nga-governors-index",
      file: "nga/governors-index.html",
      url: "https://www.nga.org/governors/",
    },
    ...STATE_USPS.map((u) => ({
      id: `nga-${u.toLowerCase()}`,
      file: `nga/${NGA_SLUGS[u]}.html`,
      url: `https://www.nga.org/governors/${NGA_SLUGS[u]}/`,
    })),
    ...Object.entries(NGA_PREDECESSOR_PAGES).map(([u, p]) => ({
      id: `nga-${u.toLowerCase()}-predecessor`,
      file: p.file,
      url: p.url,
    })),
  ];
  for (const f of ngaFiles) {
    const bytes = readRaw(f.file);
    const entry = {
      id: f.id,
      url: f.url,
      retrievedAt: NGA_RETRIEVED_AT,
      sha256: sha256(bytes),
      byteLength: bytes.length,
    };
    artifacts.push({
      ...entry,
      localPath: `data/source/electoral-calibration-2024/raw/${f.file}`,
      mediaType: "text/html",
    });
    sources.push({
      ...entry,
      publishedNote:
        f.id === "nga-governors-index"
          ? "National Governors Association current-governors index as served on the retrieval date (September 2026 roster; used only to locate state pages, never as the January 2026 roster)."
          : "National Governors Association governor page (printed Terms and Party) as served on the retrieval date.",
    });
  }
  const identityBytes = readFileSync(IDENTITIES);
  sources.push({
    id: "census-119-identities",
    url: "repo:src/districts/identities.generated.json",
    retrievedAt: null,
    sha256: sha256(identityBytes),
    byteLength: identityBytes.length,
    publishedNote:
      "Repository-compiled Census Gazetteer 119th Congress district identities (vintage census-gazetteer-2025); see data/source/political-districts/artifact-lock.json for the pinned Census bytes.",
  });

  // District identities.
  const identities = JSON.parse(identityBytes.toString("utf8")).records.filter(
    (r) =>
      r.chamber === "congressional" &&
      !r.isUnassignedResidual &&
      STATES[r.stateUsps],
  );
  const identityByKey = new Map(
    identities.map((r) => [`${r.stateUsps}-${r.districtCode}`, r]),
  );

  // Parse the three Clerk documents concurrently.
  const parsedEntries = await Promise.all(
    CLERK_SOURCES.map(async (s) => {
      const pages = await extractPdf(
        readRaw(s.localPath.replace(/^raw\//, "")),
      );
      return [s.id, parseStatistics(pages, s.id)];
    }),
  );
  const parsed = Object.fromEntries(parsedEntries);
  const checks = [];

  // House (2024).
  const house = [];
  const p24 = parsed["clerk-2024"];
  for (const usps of STATE_USPS) {
    const st = p24.states.get(usps);
    if (!st) throw new Error(`clerk-2024: no section for ${usps}`);
    const byDistrict = new Map();
    for (const h of st.house) {
      if (byDistrict.has(h.district))
        throw new Error(`clerk-2024: duplicate district ${usps}-${h.district}`);
      byDistrict.set(h.district, h);
    }
    const expected = identities
      .filter((r) => r.stateUsps === usps)
      .map((r) => r.districtCode)
      .sort();
    const printed = [...byDistrict.keys()].sort();
    if (expected.join() !== printed.join())
      throw new Error(
        `clerk-2024 ${usps}: printed districts [${printed}] != Census identities [${expected}]`,
      );
    for (const code of expected) {
      const h = byDistrict.get(code);
      const identity = identityByKey.get(`${usps}-${code}`);
      const s = summarizeContest(h.lines, {
        usps,
        stateName: titleCase(STATES[usps]),
        chamber: "house",
        footnoteFor: footnoteLookup(p24, usps),
      });
      house.push({
        seatKey: `us-house:${usps}-${code}`,
        stateUsps: usps,
        districtCode: code,
        districtGeoid: identity.geoid,
        districtIdentityVintage: identity.vintage,
        electionDate: "2024-11-05",
        ...pick(s),
        sourceId: "clerk-2024",
        sourcePage: h.page,
      });
    }
  }

  // Senate.
  const senate = [];
  const senateContests = {
    "clerk-2024": new Map(),
    "clerk-2020": new Map(),
    "clerk-2022": new Map(),
  };
  const docYear = {
    "clerk-2024": 2024,
    "clerk-2020": 2020,
    "clerk-2022": 2022,
  };
  const skipped = [];
  for (const [sourceId, p] of Object.entries(parsed)) {
    for (const [usps, st] of p.states) {
      if (usps === "DC") continue;
      for (const contest of st.senate) {
        const { cls, kind } = termToClass(contest.term);
        const docClass = { 2024: 1, 2020: 2, 2022: 3 }[docYear[sourceId]];
        const senateClass = cls ?? docClass;
        const key = `${usps}:${senateClass}:${kind}`;
        const entry = {
          usps,
          senateClass,
          kind,
          term: contest.term,
          lines: contest.lines,
          sourceId,
          year: docYear[sourceId],
        };
        const bucket = senateContests[sourceId];
        if (bucket.has(key))
          throw new Error(`${sourceId}: duplicate Senate contest ${key}`);
        bucket.set(key, entry);
      }
    }
  }
  for (const usps of STATE_USPS) {
    for (const senateClass of SENATE_CLASSES_BY_STATE[usps]) {
      const key = `${usps}:${senateClass}`;
      // Every printed contest for this seat, newest first; within one ballot the
      // full-term (regular) contest supersedes the unexpired-remainder special.
      const options = Object.values(senateContests)
        .flatMap((bucket) => [
          bucket.get(`${key}:regular`),
          bucket.get(`${key}:special`),
        ])
        .filter(Boolean)
        .sort(
          (a, b) =>
            b.year - a.year ||
            (a.kind === "regular" ? -1 : 1) - (b.kind === "regular" ? -1 : 1),
        );
      const chosen = options[0];
      if (!chosen) {
        senate.push({
          seatKey: `us-senate:${usps}:class-${senateClass}`,
          stateUsps: usps,
          senateClass,
          lastElectionYear: null,
          electionKind: null,
          candidateTotalsByParty: {},
          rawLabels: [],
          nonCandidateLines: {},
          totalVotes: null,
          certifiedWinnerParty: null,
          winnerBasis: null,
          democraticTwoPartyShare: null,
          uncontested: false,
          ambiguous: true,
          decidingCount: null,
          notes: [
            "No applicable Senate contest found in the pinned Clerk documents.",
          ],
          sourceId: null,
        });
        continue;
      }
      const s = summarizeContest(chosen.lines, {
        usps,
        stateName: titleCase(STATES[usps]),
        chamber: "senate",
        footnoteFor: footnoteLookup(parsed[chosen.sourceId], usps),
      });
      const extra = [];
      if (chosen.term) extra.push(`Clerk term note: "${chosen.term}".`);
      for (const other of options.slice(1))
        extra.push(
          other.year === chosen.year
            ? `The same ${other.year} ballot also carried a ${other.kind} contest for this seat (${other.term ?? "no term note"}); the full-term contest is used.`
            : `Superseded earlier ${other.year} ${other.kind} contest for this seat (${other.term ?? "no term note"}) is not used.`,
        );
      senate.push({
        seatKey: `us-senate:${usps}:class-${senateClass}`,
        stateUsps: usps,
        senateClass,
        lastElectionYear: chosen.year,
        electionKind: chosen.kind,
        ...pick(s),
        notes: [...extra, ...s.notes],
        sourceId: chosen.sourceId,
      });
    }
  }
  // Record Senate contests present in the documents that no seat uses.
  for (const [sourceId, bucket] of Object.entries(senateContests)) {
    for (const [key, c] of bucket) {
      const used = senate.some(
        (r) =>
          r.sourceId === sourceId &&
          `${r.stateUsps}:${r.senateClass}:${r.electionKind}` === key,
      );
      if (!used)
        skipped.push(
          `${sourceId} ${c.usps} class ${c.senateClass} ${c.kind}${c.term ? ` (${c.term})` : ""}`,
        );
    }
  }
  checks.push(
    `Senate contests printed but not used as a seat's last applicable election: ${skipped.sort().join("; ") || "none"}.`,
  );

  // Presidential electors (2024, 50 states + DC).
  const presidentialByState = [];
  for (const usps of [...STATE_USPS, "DC"].sort()) {
    const st = p24.states.get(usps);
    const totalsByParty = {};
    const rawLabels = [];
    const nonCandidateLines = {};
    for (const l of st.president) {
      const lower = l.party.toLowerCase();
      if (l.votes === null) continue;
      if (NON_CANDIDATE.has(lower)) {
        nonCandidateLines[NON_CANDIDATE.get(lower)] =
          (nonCandidateLines[NON_CANDIDATE.get(lower)] ?? 0) + l.votes;
      } else {
        const key = UNNAMED_CANDIDATE.get(lower) ?? canonicalParty(l.party);
        totalsByParty[key] = (totalsByParty[key] ?? 0) + l.votes;
      }
      rawLabels.push(l.party);
    }
    const d = totalsByParty.democratic;
    const r = totalsByParty.republican;
    const printedTotal =
      st.totals.find((t) => t.section === "president")?.votes ?? null;
    presidentialByState.push({
      stateUsps: usps,
      totalsByParty,
      rawLabels,
      nonCandidateLines,
      totalVotes: Object.values(totalsByParty).reduce((a, b) => a + b, 0),
      printedSectionTotal: printedTotal,
      democraticTwoPartyShare: d > 0 && r > 0 ? round6(d / (d + r)) : null,
      notes: [
        "Party labels are the elector slates as printed (the Clerk prints the most common party name for fusion slates in parentheses).",
        ...(Object.keys(nonCandidateLines).length
          ? ["nonCandidateLines are excluded from totalVotes."]
          : []),
      ],
      sourceId: "clerk-2024",
    });
  }

  // Governors.
  const governors = STATE_USPS.map((u) => compileGovernor(u, readRaw));

  // Reconciliation.
  const count = (rows, field = "certifiedWinnerParty") =>
    rows.reduce((acc, r) => {
      const k = r[field] ?? "undetermined";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const houseWinnersBefore = count(house);
  const control = p24.divisions;
  // Residual resolution: if every undetermined seat must belong to one party to
  // match the Clerk's own Political Divisions row for the 119th Congress.
  const undetermined = house.filter((r) => r.certifiedWinnerParty === null);
  if (control && undetermined.length) {
    const needD = control.houseDemocrats - (houseWinnersBefore.democratic ?? 0);
    const needR =
      control.houseRepublicans - (houseWinnersBefore.republican ?? 0);
    const needOther =
      control.houseOther -
      Object.entries(houseWinnersBefore)
        .filter(
          ([k]) => !["democratic", "republican", "undetermined"].includes(k),
        )
        .reduce((a, [, v]) => a + v, 0);
    const residual = [
      ["democratic", needD],
      ["republican", needR],
    ].filter(([, n]) => n > 0);
    if (
      needOther === 0 &&
      residual.length === 1 &&
      residual[0][1] === undetermined.length
    ) {
      for (const r of undetermined) {
        r.certifiedWinnerParty = residual[0][0];
        r.winnerBasis = "residual-of-clerk-political-divisions";
        r.notes.push(
          `Winner party resolved by reconciliation, not by this row's figures: every other House seat is determined, and the same Clerk document's "Political Divisions" table (119th Congress, immediate results) prints ${control.houseDemocrats} Democrats and ${control.houseRepublicans} Republicans, leaving ${undetermined.length} ${residual[0][0]} seat(s). The row stays flagged ambiguous because its printed figures alone do not decide it.`,
        );
      }
      checks.push(
        `House: ${undetermined.length} seat(s) undetermined by printed figures (${undetermined.map((r) => r.seatKey).join(", ")}) resolved as ${residual[0][0]} by residual against the Clerk Political Divisions row.`,
      );
    } else {
      checks.push(
        `House: ${undetermined.length} undetermined seat(s) could not be resolved by residual (needD=${needD}, needR=${needR}, needOther=${needOther}).`,
      );
    }
  }
  const houseWinners = count(house);
  if (control) {
    const ok =
      houseWinners.democratic === control.houseDemocrats &&
      houseWinners.republican === control.houseRepublicans;
    checks.push(
      `House winners by seat (${houseWinners.democratic ?? 0} D / ${houseWinners.republican ?? 0} R) ${ok ? "match" : "DO NOT match"} the Clerk 2024 Political Divisions row for the 119th Congress (${control.houseDemocrats} D / ${control.houseRepublicans} R, "immediate results of elections"); this is a control, not stored as a total.`,
    );
    if (!ok) throw new Error(checks.at(-1));
    const senateWinners = count(senate);
    const other = Object.entries(senateWinners)
      .filter(
        ([k]) => !["democratic", "republican", "undetermined"].includes(k),
      )
      .reduce((a, [, v]) => a + v, 0);
    const senateOk =
      senateWinners.democratic === control.senateDemocrats &&
      senateWinners.republican === control.senateRepublicans &&
      other === control.senateOther &&
      !senateWinners.undetermined;
    checks.push(
      `Senate last-election winners by seat (${senateWinners.democratic ?? 0} D / ${senateWinners.republican ?? 0} R / ${other} other / ${senateWinners.undetermined ?? 0} undetermined) ${senateOk ? "match" : "differ from"} the Clerk 2024 Political Divisions row for the 119th Senate (${control.senateDemocrats} D / ${control.senateRepublicans} R / ${control.senateOther} other, immediate results). The two independents are ME class 1 and VT class 1. Later vacancies/appointments are not election results and are not represented.`,
    );
  }

  // Per-district reconciliation against the state recapitulation tables.
  let recapMatched = 0;
  const recapMismatch = [];
  let recapUnavailable = 0;
  for (const usps of STATE_USPS) {
    const st = p24.states.get(usps);
    const rows = (st.recapRows ?? []).filter((r) =>
      /district|At large/.test(r.label),
    );
    for (const h of house.filter((r) => r.stateUsps === usps)) {
      const label =
        h.districtCode === "00"
          ? "At large"
          : `${ordinal(Number(h.districtCode))} district`;
      const row = rows.findLast((r) => r.label === label);
      if (!row) {
        recapUnavailable++;
        h.notes.push(
          "No readable recapitulation Total for this district (unopposed rows print leaders only).",
        );
        continue;
      }
      const withNonCandidate =
        h.totalVotes === null
          ? null
          : h.totalVotes +
            Object.values(h.nonCandidateLines).reduce((a, b) => a + b, 0);
      if (
        row.total === h.totalVotes ||
        (h.totalVotes === null && row.total === null)
      )
        recapMatched++;
      else if (row.total !== null && row.total === withNonCandidate) {
        recapMatched++;
        h.recapTotalIncludesNonCandidateLines = true;
        if (h.nonCandidateLines["continuing-ballots"] !== undefined)
          h.notes.push(
            `The recapitulation Total (${row.total}) equals the round's candidate figures plus the printed "Continuing Ballots" and "Exhausted Ballots" lines, so it counts the continuing ballots twice; totalVotes (${h.totalVotes}) is the candidates' round figures only.`,
          );
      } else
        recapMismatch.push(
          `${h.seatKey}: summed ${h.totalVotes} (+non-candidate ${withNonCandidate}) vs recap ${row.total}`,
        );
      h.recapTotal = row.total;
    }
  }
  checks.push(
    `House per-district totalVotes vs the state recapitulation Total column (clerk-2024; horizontal and rotated tables): ${recapMatched} matched (${house.filter((h) => h.recapTotalIncludesNonCandidateLines).length} of them only when the state-printed nonCandidateLines are added, flagged recapTotalIncludesNonCandidateLines), ${recapMismatch.length} mismatched (listed below), ${recapUnavailable} without a readable recapitulation row.`,
  );
  for (const m of recapMismatch) checks.push(`Recap mismatch: ${m}`);

  // Senate reconciliation against recap "Senator" rows (single-contest documents only).
  const senRecap = [];
  for (const r of senate) {
    if (!r.sourceId) continue;
    const st = parsed[r.sourceId].states.get(r.stateUsps);
    const contests = st.senate.length;
    const rows = (st.recapRows ?? []).filter((x) => x.label === "Senator");
    const row = rows.at(-1); // a wrapped table repeats the label; the last block carries Total
    if (!row || row.total === null) continue;
    // With two contests on one ballot the recapitulation row sums both.
    const printedSum = st.senate.reduce(
      (a, c) => a + sumPrinted(c.lines, false),
      0,
    );
    const printedAll = st.senate.reduce(
      (a, c) => a + sumPrinted(c.lines, true),
      0,
    );
    if (contests > 1)
      r.notes.push(
        `The state recapitulation "Senator" Total (${row.total}) combines the ${contests} Senate contests printed for this state in ${r.sourceId}.`,
      );
    const ok = row.total === printedSum || row.total === printedAll;
    senRecap.push(
      ok
        ? null
        : `${r.seatKey} printed ${printedSum}/${printedAll} vs recap ${row.total}`,
    );
  }
  checks.push(
    `Senate printed-line sums (as printed, before any footnote substitution) vs the state recapitulation "Senator" Total: ${senRecap.filter((x) => x === null).length} matched, ${senRecap.filter(Boolean).length} mismatched${senRecap.filter(Boolean).length ? `: ${senRecap.filter(Boolean).join("; ")}` : ""}; where a document prints two Senate contests for a state the row is compared with the sum of both; ${senate.length - senRecap.length} seats had no readable Senator row.`,
  );

  // Presidential totals vs recapitulation "Presidential electors" rows.
  let presRecapOk = 0;
  const presRecapBad = [];
  for (const p of presidentialByState) {
    const st = p24.states.get(p.stateUsps);
    const row = (st.recapRows ?? []).findLast((r) =>
      r.label.startsWith("Presidential"),
    );
    if (!row || row.total === null) continue;
    const all =
      p.totalVotes +
      Object.values(p.nonCandidateLines).reduce((a, b) => a + b, 0);
    p.recapTotal = row.total;
    if (row.total === p.totalVotes) presRecapOk++;
    else if (row.total === all) {
      presRecapOk++;
      p.recapTotalIncludesNonCandidateLines = true;
    } else
      presRecapBad.push(
        `${p.stateUsps} ${p.totalVotes}/${all} vs recap ${row.total}`,
      );
  }
  checks.push(
    `Presidential elector lines vs state recapitulation "Presidential electors" Total: ${presRecapOk} matched, ${presRecapBad.length} mismatched${presRecapBad.length ? `: ${presRecapBad.join("; ")}` : ""}, ${presidentialByState.length - presRecapOk - presRecapBad.length} without a readable row.`,
  );

  // Presidential section totals.
  let presOk = 0;
  const presBad = [];
  for (const p of presidentialByState) {
    if (p.printedSectionTotal === null) continue;
    const all =
      p.totalVotes +
      Object.values(p.nonCandidateLines).reduce((a, b) => a + b, 0);
    if (p.printedSectionTotal === p.totalVotes || p.printedSectionTotal === all)
      presOk++;
    else
      presBad.push(
        `${p.stateUsps} ${p.totalVotes}/${all} vs ${p.printedSectionTotal}`,
      );
  }
  checks.push(
    `Presidential elector lines vs printed section "Total" lines (where a state prints one): ${presOk} matched${presBad.length ? `, mismatched: ${presBad.join("; ")}` : ""}.`,
  );

  const failures = [
    ...recapMismatch,
    ...senRecap.filter(Boolean),
    ...presRecapBad,
    ...presBad,
    ...checks.filter((c) => /differ from|could not be resolved/.test(c)),
  ];
  if (failures.length)
    throw new Error(`Reconciliation failed:\n${failures.join("\n")}`);

  const governorsCompiled = governors.filter(
    (g) => g.status === "compiled",
  ).length;
  checks.push(
    `Governors: ${governorsCompiled} compiled from NGA printed terms covering ${AS_OF}; ${governors.length - governorsCompiled} missing/ambiguous.`,
  );

  const corpus = {
    schema: SCHEMA,
    asOfDate: AS_OF,
    congress: CONGRESS,
    provenanceClass: "reference-observation",
    compiler: COMPILER,
    compilerVersion: COMPILER_VERSION,
    fieldNotes: {
      candidateTotalsByParty:
        "Sum of printed vote lines per party label. democratic/republican are canonical keys (Democrat, Democratic, Democratic-Farmer-Labor, Democratic-Nonpartisan League -> democratic). Other labels are lower-kebab of the printed label. Write-in lines (including 'Write-in (Party)') -> write-in; Scattering/All Others/Others/Miscellaneous keep their own keys. Fusion lines (NY) are summed under their own party line.",
      nonCandidateLines:
        "Blank, void, invalid, over/under votes, none-of-these-candidates and ranked-choice round lines; excluded from totalVotes.",
      totalVotes:
        "Sum of candidateTotalsByParty; null when the source prints no tally.",
      certifiedWinnerParty:
        "Party of the candidate the certified figures elect, taken from the candidate's name line (fusion candidates keep their major-party line). See winnerBasis for how it was derived.",
      winnerBasis:
        "plurality-of-printed-totals | unopposed-no-tally | printed-runoff-count | printed-rcv-final-round | rcv-finalists-share-party | residual-of-clerk-political-divisions | null",
      democraticTwoPartyShare:
        "democratic/(democratic+republican) rounded to 1e-6, only when both keys are present with votes > 0.",
      uncontested:
        "True when the winner had no other named ballot candidate (write-in/scattering lines do not count as opposition) or the source prints the candidate without a tally because the candidate was unopposed.",
      ambiguous:
        "True when the printed figures alone do not determine the seat's outcome.",
      decidingCount:
        "Printed runoff / ranked-choice round figures when they differ from the November first-choice figures.",
      governors:
        "Party and printed term in progress on asOfDate, from NGA pages captured in September 2026; termStart is the NGA-printed start of that term.",
    },
    sources,
    house,
    senate,
    presidentialByState,
    governors,
    reconciliation: {
      houseWinners,
      senateLastElectionWinners: count(senate),
      clerkPoliticalDivisions119: control,
      checks,
    },
  };

  const coverage = {
    house: {
      rows: house.length,
      contested: house.filter((r) => !r.uncontested).length,
      uncontested: house.filter((r) => r.uncontested).length,
      ambiguous: house.filter((r) => r.ambiguous).length,
      withShare: house.filter((r) => r.democraticTwoPartyShare !== null).length,
    },
    senate: {
      rows: senate.length,
      contested: senate.filter((r) => !r.uncontested).length,
      uncontested: senate.filter((r) => r.uncontested).length,
      ambiguous: senate.filter((r) => r.ambiguous).length,
      withShare: senate.filter((r) => r.democraticTwoPartyShare !== null)
        .length,
    },
    presidentialByState: presidentialByState.length,
    governors: {
      rows: governors.length,
      compiled: governorsCompiled,
      missing: governors.filter((g) => g.status === "missing").length,
      ambiguous: governors.filter((g) => g.status === "ambiguous").length,
    },
  };

  const corpusText = await stableStringify(corpus);
  const lockText = await stableStringify({
    schema: "electoral-calibration-artifact-lock/v1",
    artifacts: artifacts.sort((a, b) => a.id.localeCompare(b.id)),
  });
  const manifestText = await stableStringify({
    schema: "electoral-calibration-corpus-manifest/v1",
    asOf: AS_OF,
    canonicalSha256: sha256(Buffer.from(corpusText)),
    corpusPath: "data/source/electoral-calibration-2024/corpus.json",
    runtimeArtifactPath: relative(ROOT, RUNTIME_OUT),
    runtimeArtifactIsByteIdenticalToCorpus: true,
    compiler: COMPILER,
    compilerVersion: COMPILER_VERSION,
    pdfTextTool: `pdfjs-dist ${packageVersion("pdfjs-dist")}`,
    jsonFormatter: `prettier ${packageVersion("prettier")}`,
    coverage,
  });

  const outputs = [
    [join(DOMAIN, "corpus.json"), corpusText],
    [RUNTIME_OUT, corpusText],
    [join(DOMAIN, "artifact-lock.json"), lockText],
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
      { coverage, houseWinners, senateWinners: count(senate), checks },
      null,
      2,
    ),
  );
  if (drift) process.exit(1);
}

function packageVersion(name) {
  return JSON.parse(
    readFileSync(join(ROOT, "node_modules", name, "package.json"), "utf8"),
  ).version;
}

function pick(s) {
  return {
    candidateTotalsByParty: s.candidateTotalsByParty,
    rawLabels: s.rawLabels,
    nonCandidateLines: s.nonCandidateLines,
    totalVotes: s.totalVotes,
    certifiedWinnerParty: s.certifiedWinnerParty,
    winnerBasis: s.winnerBasis,
    democraticTwoPartyShare: s.democraticTwoPartyShare,
    uncontested: s.uncontested,
    ambiguous: s.ambiguous,
    decidingCount: s.decidingCount,
    notes: s.notes,
  };
}

function sumPrinted(lines, includeNonCandidate) {
  return lines
    .filter(
      (l) =>
        l.votes !== null && (includeNonCandidate || l.kind !== "non-candidate"),
    )
    .reduce((a, l) => a + l.votes, 0);
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ordinal(n) {
  // The Clerk prints "2d" and "3d" (GPO style), "1st", "4th", "11th", "22d", ...
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "d", 3: "d" }[n % 10] ?? "th"}`;
}

/** The 119th Congress row of the Clerk's "Political Divisions" table. */
function readPoliticalDivisions(items) {
  const lines = buildLines(items);
  const row = lines.find((l) => /^119th\b/.test(l.text));
  if (!row) return null;
  // Columns: Senate total, D, R, Other, Vacant, House total, D, R, Other, Vacant.
  // Empty cells print as dot leaders, so cells are read by x position.
  const cells = readDivisionCells(items, row.y);
  return {
    congress: 119,
    years: "2025-2027",
    senateTotal: cells[0],
    senateDemocrats: cells[1],
    senateRepublicans: cells[2],
    senateOther: cells[3] ?? 0,
    senateVacant: cells[4] ?? 0,
    houseTotal: cells[5],
    houseDemocrats: cells[6],
    houseRepublicans: cells[7],
    houseOther: cells[8] ?? 0,
    houseVacant: cells[9] ?? 0,
    printedRow: row.text,
    note: "Printed under the heading [ALL FIGURES REFLECT IMMEDIATE RESULTS OF ELECTIONS]; leader (empty) cells read as 0.",
  };
}

/** Column x-ranges of the Political Divisions table (2024 document layout). */
function readDivisionCells(items, y) {
  const cols = [
    [160, 190],
    [200, 230],
    [245, 270],
    [290, 312],
    [330, 355],
    [385, 410],
    [425, 450],
    [465, 492],
    [510, 535],
    [555, 580],
  ];
  const row = items.filter(
    (i) => !i.rot && Math.abs(i.y - y) <= 1.5 && /^\d+$/.test(i.s.trim()),
  );
  return cols.map(([a, b]) => {
    const hit = row.find((i) => i.x >= a && i.x < b);
    return hit ? Number(hit.s.trim()) : null;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
