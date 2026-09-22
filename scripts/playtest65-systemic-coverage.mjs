/** Read-only receiving evidence. Run with node --import tsx; stdout is JSON.
 * This checks registry/projections, never claims browser or saved-life acceptance.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import console from "node:console";
import process from "node:process";
import { districtIdentityCatalog } from "../src/districts/catalog.ts";
import { stateExecutiveOffice } from "../src/simulation/nationwide-world/state-executives.ts";
import { queryMapPlaceDemography } from "../src/presentation/map-place-demography.ts";
import { proseDate } from "../src/presentation/prose-dates.ts";
import {
  lifePlaceStateIdentities,
  lifePlaceByKey,
  searchLifePlaces,
} from "../src/simulation/life-places.ts";
import {
  creatorLocationIsReady,
  emptyCreatorLocation,
  selectCreatorPlace,
  selectCreatorState,
} from "../src/presentation/creator-location.ts";
import { openingRegionTypesForPlace } from "../src/presentation/opening-region-context.ts";
import {
  CPS_STATE_NAMES,
  queryStateVotingContext,
} from "../src/presentation/state-voting-context.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
const before = {
  head: git("rev-parse", "HEAD").trim(),
  diffSha256: sha(
    git(
      "diff",
      "HEAD",
      "--",
      "src",
      "public/data",
      "scripts/playtest65-systemic-coverage.mjs",
    ),
  ),
};
const inputs = {};
const jsonCache = new Map();
const fetchJson = async (url) => {
  if (
    !/^\/data\/(state-voting|economic-context)\/v1\/[A-Za-z0-9_./-]+\.json$/.test(
      url,
    ) ||
    url.includes("..")
  )
    throw new Error(`Unexpected local input: ${url}`);
  if (jsonCache.has(url)) return jsonCache.get(url);
  const bytes = readFileSync(resolve(root, `public${url}`));
  inputs[`public${url}`] = sha(bytes);
  const parsed = JSON.parse(bytes.toString("utf8"));
  jsonCache.set(url, parsed);
  return parsed;
};
const failures = [];
const check = (condition, state, behavior, observed) => {
  if (!condition) failures.push({ state, behavior, observed });
};
const registry = lifePlaceStateIdentities();
const states = registry.filter((s) => Object.hasOwn(CPS_STATE_NAMES, s.usps));
check(
  states.length === 51 &&
    new Set(states.map((s) => s.usps)).size === 51 &&
    states.some((s) => s.usps === "DC"),
  "ALL",
  "50 states and District of Columbia, unique",
  states.length,
);
check(
  !creatorLocationIsReady(emptyCreatorLocation()),
  "ALL",
  "fresh creator requires a deliberate place",
  emptyCreatorLocation(),
);
const rows = [];
const fipsByState = new Map(
  districtIdentityCatalog().map((row) => [row.stateUsps, row.stateFips]),
);
fipsByState.set("DC", "11");
for (const state of states) {
  const counties = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "county",
  });
  check(
    counties.every(
      (place) =>
        place.scope === "county" &&
        place.stateJurisdictionKey === state.jurisdictionKey,
    ),
    state.usps,
    "county choices retain county level and selected state",
    counties.length,
  );
  check(
    new Set(counties.map((place) => place.key)).size === counties.length,
    state.usps,
    "county keys are unique",
    counties.length,
  );
  const office = stateExecutiveOffice(state.usps);
  check(
    state.usps === "DC"
      ? office === null
      : office?.stateUsps === state.usps &&
          office.jurisdictionKey === state.jurisdictionKey,
    state.usps,
    "governor identity belongs to actual state; District has no state governor",
    office,
  );
  const fips = fipsByState.get(state.usps);
  check(Boolean(fips), state.usps, "state demographic FIPS exists", fips);
  const population = await queryMapPlaceDemography(
    {
      layer: "state",
      geoid: fips ?? "",
      stateUsps: state.usps,
      asOf: "2026-01-05",
    },
    { fetchJson },
  );
  check(
    population.population === null
      ? population.omissions.some(
          (item) => item.field === "Population" && item.reason.length > 0,
        )
      : population.population.geography.level === "state" &&
          population.population.geography.geoid === `${fips}000` &&
          population.population.unit === "Number of persons" &&
          population.population.period <= "2025" &&
          Number.isFinite(population.population.value),
    state.usps,
    "dated population has exact state geography and headcount unit, or explicit missing reason",
    population.population,
  );
  const foreignPopulation = await queryMapPlaceDemography(
    {
      layer: "state",
      geoid: state.usps === "CA" ? "23" : "06",
      stateUsps: state.usps,
      asOf: "2026-01-05",
    },
    { fetchJson },
  );
  check(
    foreignPopulation.population === null,
    state.usps,
    "wrong-state demographic key is refused",
    foreignPopulation.population,
  );
  const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  check(
    places.length > 0,
    state.usps,
    "supported locality choices exist",
    places.length,
  );
  check(
    new Set(places.map((p) => p.key)).size === places.length,
    state.usps,
    "unique locality keys",
    places.length,
  );
  check(
    places.every(
      (p) =>
        p.stateJurisdictionKey === state.jurisdictionKey &&
        p.scope === "locality",
    ),
    state.usps,
    "localities belong to selected jurisdiction",
    places
      .filter(
        (p) =>
          p.stateJurisdictionKey !== state.jurisdictionKey ||
          p.scope !== "locality",
      )
      .map((p) => p.key),
  );
  check(
    places.every(
      (p, i) =>
        !i ||
        places[i - 1].displayName.localeCompare(p.displayName, "en", {
          sensitivity: "base",
        }) <= 0,
    ),
    state.usps,
    "complete locality corpus is alphabetical",
    places.length,
  );
  const samples = [
    ...new Set([0, Math.floor(places.length / 2), places.length - 1]),
  ]
    .map((i) => places[i])
    .filter(Boolean);
  const sampleRows = samples.map((place) => {
    const original = JSON.stringify(place);
    const draft = selectCreatorPlace(
      selectCreatorState(emptyCreatorLocation(), state.jurisdictionKey),
      place,
    );
    const types = openingRegionTypesForPlace(place);
    const dateLabel = proseDate(place.context.initialMoment.date);
    check(
      !/^\d{4}-\d{2}-\d{2}$/.test(dateLabel) &&
        /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(dateLabel),
      state.usps,
      "sample opening date renders American month-day-year prose",
      { key: place.key, dateLabel },
    );
    check(
      creatorLocationIsReady(draft) &&
        draft.placeKey === place.key &&
        lifePlaceByKey(place.key)?.stateJurisdictionKey ===
          state.jurisdictionKey,
      state.usps,
      "first/middle/last choice resolves and commits",
      place.key,
    );
    check(
      JSON.stringify(place) === original,
      state.usps,
      "projection leaves canonical place unchanged",
      place.key,
    );
    return {
      key: place.key,
      name: place.displayName,
      jurisdictionId: place.context.jurisdiction.id,
      dateLabel,
      regionalEligibility: types,
      missingRegionalEligibility: types.length === 0,
    };
  });
  const voting = await queryStateVotingContext(
    { stateUsps: state.usps, asOf: "2026-01-05" },
    { fetchJson },
  );
  const early = await queryStateVotingContext(
    { stateUsps: state.usps, asOf: "2025-04-29" },
    { fetchJson },
  );
  check(
    early.totals === null && !!early.unavailableReason,
    state.usps,
    "survey unavailable before publication",
    early.unavailableReason,
  );
  const surveyRows = [
    voting.totals,
    ...Object.values(voting.breakdowns).flat(),
  ].filter(Boolean);
  check(
    surveyRows.every(
      (r) =>
        r.geographyName === state.name.toUpperCase() &&
        r.geographyLevel === "state-or-district" &&
        r.period === "2024-11" &&
        r.universe === "civilian-noninstitutionalized-age-18-and-over",
    ),
    state.usps,
    "survey stays in selected geography/period/universe",
    surveyRows.map((r) => r.recordId),
  );
  check(
    voting.totals !== null || !!voting.unavailableReason,
    state.usps,
    "missing survey is explained rather than zero-filled",
    voting.unavailableReason,
  );
  for (const record of surveyRows) {
    for (const [metric, denominator] of [
      ["votedCitizenPercent", "citizen-adults"],
      ["registeredCitizenPercent", "citizen-adults"],
      ["votedTotalPercent", "total-adults"],
      ["registeredTotalPercent", "total-adults"],
    ]) {
      check(
        record.metrics[metric]?.denominator === denominator,
        state.usps,
        `${metric} denominator`,
        record.metrics[metric]?.denominator,
      );
    }
  }
  rows.push({
    state: state.usps,
    name: state.name,
    localityCount: places.length,
    countyCount: counties.length,
    governorIdentity: office
      ? {
          officeKey: office.officeKey,
          jurisdictionKey: office.jurisdictionKey,
          jurisdictionId: office.jurisdictionId,
          authorityPackId: office.authorityPackId,
        }
      : null,
    population: {
      observation: population.population,
      omissions: population.omissions,
    },
    projectionSamples: sampleRows,
    voting: {
      status: voting.totals ? "available" : "unavailable",
      unavailableReason: voting.unavailableReason,
      period: voting.period,
      recordCount: surveyRows.length,
      omissions: voting.omissions,
    },
  });
}
const after = {
  head: git("rev-parse", "HEAD").trim(),
  diffSha256: sha(
    git(
      "diff",
      "HEAD",
      "--",
      "src",
      "public/data",
      "scripts/playtest65-systemic-coverage.mjs",
    ),
  ),
};
check(
  JSON.stringify(before) === JSON.stringify(after),
  "ALL",
  "source remained unchanged during this read",
  { before, after },
);
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      coverageKind: "read-only-registry-and-projection",
      createdAt: new Date().toISOString(),
      source: before,
      scriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
      inputHashes: inputs,
      result: failures.length ? "FAIL" : "PASS",
      statesChecked: rows.length,
      additionalRegistryJurisdictions: registry.filter(
        (s) => !Object.hasOwn(CPS_STATE_NAMES, s.usps),
      ),
      rows,
      failures,
      notCovered: [
        "Rendered continuous scrolling or pointer/keyboard interaction",
        "Officeholder rendering, actual recorded tenure dates, and municipal qualifications",
        "Ordinary played journeys, consequences, and authority",
        "Old-save continuity",
        "Six-body visual acceptance",
        "Installed asset usage or owner pixel approval",
      ],
    },
    null,
    2,
  ),
);
process.exitCode = failures.length ? 1 : 0;
