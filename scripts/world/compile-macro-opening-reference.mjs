#!/usr/bin/env node
/* global console, process */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import { extractPdf } from "./compile-electoral-calibration.mjs";
const root = resolve(import.meta.dirname, "../..");
const domain = resolve(root, "data/source/macro-start-2026");
const lock = JSON.parse(readFileSync(resolve(domain, "artifact-lock.json")));
const bytes = new Map();
for (const artifact of lock.artifacts) {
  if (bytes.has(artifact.id))
    throw new Error("Duplicate macro source artifact.");
  const raw = readFileSync(resolve(root, artifact.localPath));
  if (
    raw.length !== artifact.byteLength ||
    createHash("sha256").update(raw).digest("hex") !== artifact.sha256
  )
    throw new Error(`Macro source lock mismatch: ${artifact.id}`);
  bytes.set(artifact.id, raw);
}
const text = (id) =>
  bytes
    .get(id)
    .toString("utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ");
const required = (input, pattern, name) => {
  const found = input.match(pattern);
  if (!found) throw new Error(`Primary observation not found: ${name}`);
  return found;
};
const unemployment = Number(
  required(
    text("bls-employment"),
    /the unemployment rate \(([\d.]+) percent\)/,
    "unemployment",
  )[1],
);
required(
  text("bls-employment"),
  /THE EMPLOYMENT SITUATION - SEPTEMBER 2026/,
  "employment period",
);
required(
  text("bls-employment"),
  /Friday, October 2, 2026/,
  "employment release",
);
const inflation = Number(
  required(
    text("bls-cpi"),
    /Over the last 12 months, the all items index increased ([\d.]+) percent/,
    "CPI-U twelve-month change",
  )[1],
);
required(text("bls-cpi"), /CONSUMER PRICE INDEX - AUGUST 2026/, "CPI period");
required(text("bls-cpi"), /Friday, September 11, 2026/, "CPI release");
const growth = Number(
  required(
    text("bea-gdp-q2"),
    /Real gross domestic product \(GDP\) increased at an annual rate of ([\d.]+) percent/,
    "real GDP",
  )[1],
);
required(text("bea-gdp-q2"), /September 30, 2026/, "GDP release");
required(text("bea-gdp-q2"), /second quarter of 2026/, "GDP period");
const pages = await extractPdf(bytes.get("census-hvs"));
const inventoryPage = pages.find((page) =>
  page.some((item) => item.s.includes("All housing units")),
);
if (!inventoryPage) throw new Error("Census inventory table missing.");
const inventoryCell = (label) => {
  const row = inventoryPage.find((item) => label.test(item.s));
  if (!row) throw new Error("Census inventory row missing.");
  const figures = inventoryPage
    .filter((item) => Math.abs(item.y - row.y) < 2 && /^\d[\d,]*$/.test(item.s))
    .sort((a, b) => a.x - b.x);
  if (figures.length < 3) throw new Error("Census inventory columns missing.");
  return Number(figures[1].s.replaceAll(",", "")) * 1000;
};
required(
  pages
    .flat()
    .map((item) => item.s)
    .join(" "),
  /July 28, 2026/,
  "Census release",
);
const supplyUnits = inventoryCell(/All housing units/);
const occupiedHouseholds = inventoryCell(/\.\.Occupied/);
const nfciRows = bytes
  .get("fred-nfci-csv")
  .toString("utf8")
  .trim()
  .split(/\r?\n/);
if (nfciRows.shift() !== "observation_date,NFCI")
  throw new Error("NFCI series identity mismatch.");
const nfci = nfciRows
  .map((row) => {
    const [date, value] = row.split(",");
    return { date, value: Number(value) };
  })
  .at(-1);
if (!nfci || nfci.date !== "2026-09-25")
  throw new Error("NFCI observation frontier changed.");
required(text("fred-nfci"), /Sep 30, 2026/, "NFCI update");
const rates = required(
  text("fed-rates"),
  /2026 Date Increase Decrease Level \(%\) September 17 \d+ \d+ ([\d.]+)-([\d.]+)/,
  "Fed target range",
);
const observations = [
  {
    field: "realGrowthAnnualPct",
    value: growth,
    unit: "percent-change-annualized",
    period: "2026-Q2",
    releasedAt: "2026-09-30",
    sourceId: "bea-gdp-q2",
    locator: "Real GDP, third estimate, opening paragraph",
  },
  {
    field: "unemploymentPct",
    value: unemployment,
    unit: "percent-of-civilian-labor-force",
    period: "2026-09",
    releasedAt: "2026-10-02",
    sourceId: "bls-employment",
    locator:
      "Employment Situation, household survey summary, seasonally adjusted",
  },
  {
    field: "inflation12mPct",
    value: inflation,
    unit: "percent-change-12-months-not-seasonally-adjusted",
    period: "2026-08",
    releasedAt: "2026-09-11",
    sourceId: "bls-cpi",
    locator: "CPI-U all items, twelve-month change, opening paragraph",
  },
  {
    field: "supplyUnits",
    value: supplyUnits,
    unit: "housing-units",
    period: "2026-Q2",
    releasedAt: "2026-07-28",
    sourceId: "census-hvs",
    locator:
      "Table 3, all housing units, Q2 2026; published thousands converted to units",
  },
  {
    field: "occupiedHouseholds",
    value: occupiedHouseholds,
    unit: "occupied-housing-units",
    period: "2026-Q2",
    releasedAt: "2026-07-28",
    sourceId: "census-hvs",
    locator:
      "Table 3, occupied housing units, Q2 2026; published thousands converted to units",
  },
  {
    field: "creditConditionsIndex",
    value: nfci.value,
    unit: "NFCI-standardized-index-not-seasonally-adjusted",
    period: nfci.date,
    releasedAt: "2026-09-30",
    sourceId: "fred-nfci-csv",
    locator: `NFCI ${nfci.date}; Chicago Fed series redistributed by Federal Reserve Bank of St. Louis`,
  },
  {
    field: "policyRateLowerPct",
    value: Number(rates[1]),
    unit: "percent",
    period: "2026-09-17",
    releasedAt: "2026-09-17",
    sourceId: "fed-rates",
    locator: "2026 target federal funds rate range, September 17 row",
  },
  {
    field: "policyRateUpperPct",
    value: Number(rates[2]),
    unit: "percent",
    period: "2026-09-17",
    releasedAt: "2026-09-17",
    sourceId: "fed-rates",
    locator: "2026 target federal funds rate range, September 17 row",
  },
];
if (
  new Set(observations.map((row) => row.field)).size !== observations.length ||
  observations.some((row) => !Number.isFinite(row.value))
)
  throw new Error("Duplicate or nonnumeric macro observation.");
const corpus = {
  schema: "macro-opening-reference/v1",
  asOfDate: "2026-10-02",
  basis: "dated-reference-for-estimated-starting-condition",
  observations,
  artifacts: lock.artifacts,
};
const output = await format(JSON.stringify(corpus), { parser: "json" });
const path = resolve(
  root,
  "src/simulation/world-setup/macro-opening-reference.generated.json",
);
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error("Macro opening reference is stale.");
} else writeFileSync(path, output);
console.log(
  `Macro primary reference: ${observations.length} unique finite observations, pinned bytes verified; ${process.argv.includes("--check") ? "replay PASS" : "written"}.`,
);
