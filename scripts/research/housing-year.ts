/**
 * One played year in a drawn place for the housing research of Oct 23, 2026:
 * for each table this research read or corrected, where the town landed
 * against the source's figure or band, by record id.
 *
 * - eviction: the place's notice, cure, hearing and stay (read from statute
 *   text or still secondary) and whether each case followed them;
 * - foreclosure: the days to sale the place's cases were given, against
 *   ATTOM's national average and its spread across the quarters read;
 * - home prices: the price ratio an opening mortgage used for its purchase
 *   year (FHFA's index for the place, consumer prices where FHFA has none);
 * - shelter: the beds the eviction path reads against the HIC beds listed
 *   in the town's own city;
 * - mortgages: the town's share of owned homes with a mortgage against its
 *   county's ACS share.
 *
 * Run: node --import tsx scripts/research/housing-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { foreclosureSteps } from "../../src/core2/housing-foreclosure";
import {
  housingStatusCounts,
  shelterBeds,
} from "../../src/core2/housing-homeless";
import { publishedHomePriceRatio } from "../../src/core2/housing-prices";
import { HOUSING_MODULE_ID, ownedHomes } from "../../src/core2/modules/housing";
import housing from "../../src/core2/data/housing/housing.json" with { type: "json" };
import evictionReads from "../../data/research/world/eviction-statute-reads-2026.json" with { type: "json" };
import foreclosureReads from "../../data/research/world/foreclosure-reads-2026.json" with { type: "json" };
import hic from "../../data/research/world/hud-hic-2025-beds-by-city.json" with { type: "json" };
import acs from "../../data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json" with { type: "json" };

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const usps = core.placeMetadata?.housingState ?? "";
const county = core.placeMetadata?.housingCounty ?? "";
const startedAt = core.date;
console.log(
  `${world.place.displayName}, seed ${seed}, ${core.people.size} people, state ${usps}, county ${county}, from ${startedAt}`,
);

const table = (name: string) => api.moduleState(HOUSING_MODULE_ID).table(name);
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
// The housing engine opens its tables on the first day; read them then.
dev.advance(addDays(makeIsoDate(core.date), 1));
const openingMortgages = (
  table("mortgages").rows() as unknown as {
    id: string;
    householdId: string;
  }[]
).length;
const openingOwned = ownedHomes(api).length;
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(`ran to ${core.date}`);

const days = (a?: string, b?: string) =>
  a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) : null;

// Eviction steps.
{
  const law = (
    housing.eviction as unknown as Record<
      string,
      {
        noticeDays: number;
        cureAllowed: boolean;
        hearingDays: number;
        stayDays: number;
        confidence: string;
      }
    >
  )[usps]!;
  const place = (
    evictionReads.places as unknown as Record<
      string,
      {
        readOct12: string[];
        readOct23: { field: string }[];
        secondary: Record<string, string>;
      }
    >
  )[usps]!;
  const read = new Set([
    ...place.readOct12,
    ...place.readOct23.map((r) => r.field),
  ]);
  const mark = (field: string) => (read.has(field) ? "statute" : "secondary");
  console.log(
    `\neviction law (${law.confidence}): notice ${law.noticeDays} d [${mark("noticeDays")}], cure ${law.cureAllowed} [${mark("cureAllowed")}], hearing ${law.hearingDays} d [${mark("hearingDays")}], stay ${law.stayDays} d [${mark("stayDays")}]`,
  );
  const cases = table("cases").rows() as unknown as {
    id: string;
    stage: string;
    noticeAt?: string;
    cureBy?: string;
    filedAt?: string;
    hearingAt?: string;
    judgmentAt?: string;
    removedAt?: string;
  }[];
  const stages: Record<string, number> = {};
  let followed = 0,
    checked = 0;
  for (const row of cases) {
    stages[row.stage] = (stages[row.stage] ?? 0) + 1;
    const steps: [number | null, number][] = [
      [days(row.noticeAt, row.cureBy), Math.max(1, law.noticeDays)],
      [days(row.filedAt, row.hearingAt), Math.max(1, law.hearingDays)],
      [days(row.judgmentAt, row.removedAt), Math.max(1, law.stayDays)],
    ];
    const seen = steps.filter(([d]) => d !== null);
    if (!seen.length) continue;
    checked += 1;
    if (seen.every(([d, want]) => d === want)) followed += 1;
  }
  console.log(
    `eviction cases: ${cases.length} (${JSON.stringify(stages)}); ${followed} of ${checked} with a dated step followed the place's days`,
  );
  for (const row of cases.slice(0, 3))
    console.log(
      `  ${row.id}: ${row.stage}; notice ${row.noticeAt} cure by ${row.cureBy}; filed ${row.filedAt ?? "-"} hearing ${row.hearingAt ?? "-"}; judgment ${row.judgmentAt ?? "-"} removed ${row.removedAt ?? "-"}`,
    );
}

// Foreclosure timeline.
{
  const steps = foreclosureSteps(usps);
  const own = (
    foreclosureReads.stateDays as Record<
      string,
      { days: number; quarter: string }
    >
  )[usps];
  const band = foreclosureReads.nationalDays.spread;
  console.log(
    `\nforeclosure: ${steps.process}, ${steps.confidence}; days to sale ${steps.daysToSale} (${own ? `ATTOM ${own.quarter} for the state: ${own.days}` : `national ATTOM ${foreclosureReads.nationalDays.value}; band ${band.low} to ${band.high}`}); redemption ${steps.redemptionDays} d`,
  );
  const cases = table("foreclosures").rows() as unknown as {
    id: string;
    stage: string;
    filedAt: string;
    saleAt: string;
  }[];
  console.log(
    `foreclosure cases: ${cases.length}; ${cases.filter((row) => days(row.filedAt, row.saleAt) === steps.daysToSale).length} set ${steps.daysToSale} days from filing to sale; sales inside the year: ${cases.filter((row) => row.saleAt <= core.date).length}`,
  );
  for (const row of cases.slice(0, 3))
    console.log(
      `  ${row.id}: ${row.stage}; filed ${row.filedAt}, sale ${row.saleAt}`,
    );
  if (!cases.length)
    console.log(
      "  no mortgage passed the federal 120 days behind this year, so no timeline was used",
    );
}

// Home prices behind the opening mortgages.
{
  const fhfa = usps in housing.housePriceIndex.states;
  const terms = JSON.parse(
    (core.placeMetadata?.housingMortgages as string | undefined) ?? "[]",
  ) as {
    householdId: string;
    boughtYear: number;
    originalMinor: number;
    balanceMinor: number;
  }[];
  console.log(
    `\nhome prices: ${fhfa ? "FHFA index for the place" : "no FHFA index; consumer prices stand in"}; 10-year ratio ${publishedHomePriceRatio(usps, "2016-07-01", startedAt).toFixed(3)}`,
  );
  for (const row of terms.slice(0, 2))
    console.log(
      `  mortgage:${row.householdId}: bought ${row.boughtYear}, price then ${(publishedHomePriceRatio(usps, startedAt, `${row.boughtYear}-07-01`) * 100).toFixed(1)}% of today's value; original ${(row.originalMinor / 100).toFixed(0)} dollars, balance ${(row.balanceMinor / 100).toFixed(0)}`,
    );
  if (!terms.length) console.log("  no opening mortgage terms recorded");
}

// Shelter beds.
{
  const beds = shelterBeds(api, world.placeId, usps);
  const counts = housingStatusCounts(api, world.placeId);
  const name = (world.place.displayName.split(",")[0] ?? "").toLowerCase();
  const state = (
    hic.states as unknown as Record<
      string,
      { cities?: [string, string[], number][]; yearRoundBeds: number | null }
    >
  )[usps];
  const city = state?.cities?.find(([c]) => c.toLowerCase() === name);
  console.log(
    `\nshelter: ${beds} beds read by the eviction path (state rate times people); HIC lists ${city ? `${city[2]} year-round beds in ${city[0]}` : `no project in ${name || "the town"}`} (state total ${state?.yearRoundBeds ?? "none"})`,
  );
  console.log(
    `  statuses at year end: ${JSON.stringify({ doubledUp: counts["doubled-up"], sheltered: counts.sheltered, unsheltered: counts.unsheltered })}`,
  );
  for (const row of (
    table("statuses").rows() as unknown as {
      id: string;
      status: string;
      since: string;
    }[]
  ).slice(0, 3))
    console.log(`  ${row.id}: ${row.status} since ${row.since}`);
}

// Mortgages at the opening against the county's ACS share.
{
  const parse = (row: string) => row.split("|").map(Number);
  const share = (row: number[]) =>
    row.slice(7, 14).reduce((n, v) => n + v, 0) / row[0]!;
  const countyRow = (acs.counties as Record<string, string>)[county];
  const stateRow = (acs.states as Record<string, { row: string }>)[usps]?.row;
  const nation = share(parse(acs.nation));
  const town = openingOwned ? openingMortgages / openingOwned : 0;
  console.log(
    `\nmortgages at the opening: ${openingMortgages} loans among ${openingOwned} owned homes (${(town * 100).toFixed(1)}%); ACS 2020-2024 share with a mortgage: county ${countyRow ? `${(share(parse(countyRow)) * 100).toFixed(1)}%` : "none (no ACS)"}, state ${stateRow ? `${(share(parse(stateRow)) * 100).toFixed(1)}%` : "none"}, nation ${(nation * 100).toFixed(1)}% (the engine reads the nation's shares by age until world-housing-mortgages-county-shares)`,
  );
}
