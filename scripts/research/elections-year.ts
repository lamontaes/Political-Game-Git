/**
 * One played year in a drawn place, read against the elections research
 * (research-elections-sourced-parameters, Oct 23, 2026): who a campaign's
 * polls, mail and halls are bought from against County Business Patterns
 * 2023, the town's polling places against the 2024 EAVS, the ballot-order
 * law the town's contests use, and each contest's filing deadline and filing
 * rules against the place's rows. One run, one number; the seed is drawn
 * unless one is passed.
 * Run: node --import tsx scripts/research/elections-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ballotOrderRule } from "../../src/core2/ballot-order";
import { FILING_LEAD_SOURCE } from "../../src/core2/gov-rules/town-election-calendar";
import {
  ELECTIONS_MODULE_ID,
  filingRequirements,
  type ContestRow,
  type FilingRow,
} from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../../src/core2/modules/campaigns";
import type { CoreState } from "../../src/core2/types";

const root = process.cwd();
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;

interface KindCount {
  readonly establishments: number;
  readonly countiesWithAny: number;
}
const cbp = readJson<{
  places: Record<
    string,
    { counties: number; kinds: Record<string, KindCount> }
  >;
}>("data/research/elections/cbp-2023-campaign-sellers.json");
const eavs = readJson<{
  places: Record<
    string,
    {
      precincts: number;
      electionDayPollingPlaces: number;
      earlyVotingSites: number;
      facilityShares: { tag: string; percent: Record<string, number> };
    }
  >;
}>("data/research/elections/eavs-2024-polling-places.json");
const deadlineRows = readJson<{
  places: Record<string, { rule: { kind: string }; tag: string }>;
}>("src/core2/data/elections/filing-deadlines.json");

const SEVEN = [
  "SG-GOV-campaign-pollster-seller",
  "SG-GOV-campaign-mail-seller",
  "SG-GOV-campaign-venue-seller",
  "SG-GOV-filing-deadline-estimate",
  "SG-GOV-filing-fallbacks",
  "SG-GOV-polling-place-kind",
  "SG-GOV-ballot-order-estimates",
];

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core as CoreState;
const api = coreAPI(core);
const townRow = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("town")
  .get("town") as unknown as {
  stateKey: string;
  townPlaceId: string;
};
const stateKey = townRow.stateKey;
const townId = townRow.townPlaceId;
const start = core.date;
console.log(
  `${world.place.displayName} (${stateKey}), seed ${seed}, ${core.people.size} people, ${start} to ${addDays(makeIsoDate(start), 365)}`,
);

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(start), 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));

const pct = (n: number, d: number) =>
  d > 0 ? `${((100 * n) / d).toFixed(1)}%` : "n/a";
const hits = core.stopgapHits;

// A. Who sells a campaign its polls, mail and halls.
console.log("\nA. Campaign sellers (County Business Patterns 2023)");
const place = cbp.places[stateKey]!;
const campaigns = api
  .moduleState(CAMPAIGNS_MODULE_ID)
  .table("campaigns")
  .rows() as unknown as (CampaignRow & {
  spentByKind?: Record<string, number>;
})[];
const spent: Record<string, number> = {};
for (const c of campaigns)
  for (const [kind, minor] of Object.entries(c.spentByKind ?? {}))
    spent[kind] = (spent[kind] ?? 0) + minor;
const employers = [
  ...(core.organizationsByPlaceKind.get(`${townId}:employer`) ?? []),
];
const classes = new Map<string, number>();
for (const id of employers) {
  const c = (
    core.organizations.get(id) as { classification?: string } | undefined
  )?.classification;
  if (c) classes.set(c, (classes.get(c) ?? 0) + 1);
}
for (const [purchase, kinds] of [
  ["poll", ["pollingAndMarketResearch", "publicRelations"]],
  ["mail", ["directMailAdvertising", "commercialPrinting"]],
  [
    "event",
    ["foodServicesAndDrinking", "accommodation", "amusementRecreation"],
  ],
] as const) {
  const band = kinds
    .map((k) => {
      const row = place.kinds[k]!;
      return `${k} ${row.establishments} establishments, published in ${row.countiesWithAny} of ${place.counties} county equivalents (${pct(row.countiesWithAny, place.counties)})`;
    })
    .join("; ");
  const standIn = `organization:campaign-${purchase}:${townId}`;
  const paidStandIn = core.organizations.has(standIn);
  console.log(
    `  ${purchase}: band ${band}. Town: ${campaigns.length} campaigns spent ${((spent[purchase] ?? 0) / 100).toFixed(2)} USD on ${purchase}; stand-in ${standIn} ${paidStandIn ? "was created (no fitting seller in town)" : "was not created"}.`,
  );
}
console.log(
  `  Town employers by classification (${employers.length}): ${JSON.stringify([...classes].sort((a, b) => b[1] - a[1]).slice(0, 12))}`,
);

// B. Polling places.
console.log("\nB. Polling places (EAC 2024 EAVS)");
const ev = eavs.places[stateKey]!;
const ratio = ev.electionDayPollingPlaces
  ? (ev.precincts / ev.electionDayPollingPlaces).toFixed(2)
  : "n/a (no election-day polling places reported)";
console.log(
  `  band: ${ev.precincts} precincts, ${ev.electionDayPollingPlaces} election-day polling places (${ratio} precincts per polling place), ${ev.earlyVotingSites} early-voting sites; facility shares (${ev.facilityShares.tag}) ${JSON.stringify(ev.facilityShares.percent)}`,
);
const polling = api
  .moduleState(VOTING_MODULE_ID)
  .table("pollingPlaces")
  .rows() as unknown as {
  id: string;
  precinct: number;
  precincts: number;
  buildingId: string | null;
  kind: string;
}[];
if (!polling.length)
  console.log(
    "  town: no polling-place rows; no election was held in the town this year.",
  );
else {
  const buildings = new Set(polling.map((p) => p.buildingId ?? "none"));
  const kinds = new Map<string, number>();
  for (const p of polling) kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
  console.log(
    `  town: ${polling.length} precincts in ${buildings.size} building(s) (${(polling.length / buildings.size).toFixed(2)} precincts per polling place); kinds ${JSON.stringify([...kinds])}; first row ${polling[0]!.id} building ${polling[0]!.buildingId}`,
  );
}

// C. Ballot order.
console.log(
  "\nC. Ballot order (data/research/elections/ballot-order-2026.json)",
);
const primary = ballotOrderRule(stateKey, "primary");
const general = ballotOrderRule(stateKey, "general");
console.log(
  `  rule: primary ${primary?.kind} / general ${general?.kind}${general?.within ? ` within ${general.within}` : ""}; estimate ${primary?.estimate}; ${primary?.citation}`,
);

// D. Filing deadlines and E. filing rules.
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as unknown as ContestRow[];
const filings = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("filings")
  .rows() as unknown as FilingRow[];
const deadlineRow = deadlineRows.places[stateKey];
console.log("\nD. Filing deadlines");
console.log(
  `  the place's municipal rule: ${deadlineRow?.rule.kind} (${deadlineRow?.tag}); the stand-in is 85 days before the election (FEC 2026 median, range 63 to 149)`,
);
const leadDays = (c: ContestRow) =>
  Math.round(
    (Date.parse(`${c.electionDate}T00:00:00Z`) -
      Date.parse(`${c.filingDeadline}T00:00:00Z`)) /
      86_400_000,
  );
// The contests on the stand-in first, then the rest, soonest election first.
const standIn = (c: ContestRow) => c.sources.includes(FILING_LEAD_SOURCE);
const shown = [...contests].sort(
  (a, b) =>
    Number(standIn(b)) - Number(standIn(a)) ||
    a.electionDate.localeCompare(b.electionDate) ||
    a.id.localeCompare(b.id),
);
console.log(
  `  levels: ${JSON.stringify([...new Set(contests.map((c) => c.level))].sort())}`,
);
for (const c of shown.slice(0, 8))
  console.log(
    `  ${c.id}: ${c.family}, election ${c.electionDate}, deadline ${c.filingDeadline} (${leadDays(c)} days before), basis ${c.basis}${c.sources.includes(FILING_LEAD_SOURCE) ? ", on the 85-day stand-in" : ""}`,
  );
console.log(
  `  ${contests.length} contests; ${contests.filter((c) => c.sources.includes(FILING_LEAD_SOURCE)).length} on the 85-day stand-in; ${contests.filter((c) => c.basis === "read").length} read from law`,
);

console.log("\nE. Filing rules");
const families = [...new Set(contests.map((c) => c.family))].sort();
for (const family of families) {
  const rules = filingRequirements(stateKey, family);
  console.log(
    `  ${family}: filed with ${rules.filedWith}; age ${rules.minimumAge}; registered voter ${rules.registeredVoter}; fallbacks ${JSON.stringify(rules.fallbacks)}`,
  );
}
console.log(
  `  ${filings.length} filings this year${filings[0] ? `, first ${filings[0].id}` : ""}`,
);

console.log("\nF. Stopgap hits in the year");
for (const id of SEVEN)
  console.log(`  ${id}: ${hits.has(id) ? "hit" : "not hit"}`);
