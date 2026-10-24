/**
 * M1-08 golden-path check, businesses grow and shrink, in a played world.
 * Uses GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The drawn
 * place is built as the player gets it (`buildBenchWorld`, every module
 * installed) and plays three game years, the cash journal watched
 * (setJournalTrace) for the owners' draws. Passes when, for each of the three
 * years:
 * (1) the town's business openings (every founding on record in the town, new
 *     firms and added locations) per hundred businesses it opened the year
 *     with are inside the range of annual establishment entry rates its state
 *     recorded, and its closings (businesses whose books closed in the year)
 *     inside the range of exit rates (Census Business Dynamics Statistics 2023
 *     release, 2010-2019 and 2022-2023, data/research/business/bds-2023.json;
 *     Puerto Rico from data/research/business/roadmap-r8-PR.json, 2019-2023;
 *     places BDS does not cover are reported unchecked). A count is inside
 *     when it is a whole number of businesses the range allows, the counts
 *     being whole: from the floor of the range's low end to the ceiling of its
 *     high end;
 * and over the run:
 * (2) owners' income comes from profit: every owner draw on record that moved
 *     money was one journal entry out of the business's own account into the
 *     owner's, was no more than the profit the business had kept
 *     (retained before the draw), came after the business's sales (it had
 *     received sales, and all its draws in the run are no more than the sales
 *     it received in the run), and was never made from a business with no
 *     profit kept;
 * (3) some business added a location with nothing scripting it: at least one
 *     founding on record names a parent business, the market room it chose
 *     on, and the parent's strength, with the parent's own cash funding it
 *     (a founding row the monthly founding decision wrote, not the opening's).
 * Exits nonzero naming each failed clause.
 */
import bdsData from "../../../data/research/business/bds-2023.json" with { type: "json" };
import bdsPuertoRico from "../../../data/research/business/roadmap-r8-PR.json" with { type: "json" };
import regionsData from "../data/regional/regions.json" with { type: "json" };
import { setJournalTrace } from "../journal-state";
import { advanceCore } from "../life";
import { businessesIn } from "../modules/business";
import { buildPlayedWorld, monthsAfter } from "./m1-played-year";

const YEARS = 3;
const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const fail = (text: string) => {
  if (failures.length < 40) failures.push(text);
};
const townId = world.placeId;
const usps = String(core.placeMetadata?.housingState ?? "");
const fips = (
  regionsData.regions as { stateFips: string; stateUsps: string }[]
).find((row) => row.stateUsps === usps)?.stateFips;

// The real annual rate ranges for the town's state.
type Range = readonly [number, number];
let entryRange: Range | undefined, exitRange: Range | undefined;
let rateSource = "";
const states = bdsData.states as unknown as Record<
  string,
  { entry: number[]; exit: number[]; years: number }
>;
if (fips && states[fips]) {
  entryRange = [states[fips].entry[0]!, states[fips].entry[2]!];
  exitRange = [states[fips].exit[0]!, states[fips].exit[2]!];
  rateSource = `Census BDS 2023 release, state ${fips}, ${bdsData.window}: lowest and highest of ${states[fips].years} annual rates`;
} else if (
  fips &&
  bdsPuertoRico.rows.some(
    (row) => (row.value as unknown as { st: string }).st === fips,
  )
) {
  const rows = bdsPuertoRico.rows.map(
    (row) =>
      row.value as unknown as {
        estabs_entry_rate: number;
        estabs_exit_rate: number;
      },
  );
  entryRange = [
    Math.min(...rows.map((r) => r.estabs_entry_rate)),
    Math.max(...rows.map((r) => r.estabs_entry_rate)),
  ];
  exitRange = [
    Math.min(...rows.map((r) => r.estabs_exit_rate)),
    Math.max(...rows.map((r) => r.estabs_exit_rate)),
  ];
  rateSource = `Census BDS 2023 release, Puerto Rico, ${rows.length} annual rates, 2019-2023`;
}

// The journal's owner draws.
interface Posting {
  owner: string;
  deltaMinor: number;
}
const draws = new Map<string, { id: string; postings: Posting[] }[]>();
setJournalTrace((entry) => {
  if (!entry.sourceRef.id.includes("owner-draw:")) return;
  const key = entry.sourceRef.id.slice(
    entry.sourceRef.id.indexOf("owner-draw:"),
  );
  const list = draws.get(key) ?? [];
  list.push({
    id: entry.id,
    postings: entry.postings.map((p) => ({
      owner: core.cashJournal.accounts.get(p.accountId)?.ownerId ?? "?",
      deltaMinor: p.deltaMinor,
    })),
  });
  draws.set(key, list);
});

// Play the years; the first day is when the town's businesses and owners are filed.
advanceCore(core, monthsAfter(world.start, 0));
const salesAtStart = new Map<string, number>();
for (const [id, book] of core.finance.businesses)
  salesAtStart.set(id, book.salesReceivedMinor);
interface YearFigures {
  year: number;
  from: string;
  to: string;
  businessesAtStart: number;
  openings: string[];
  closings: string[];
}
const years: YearFigures[] = [];
try {
  for (let year = 1; year <= YEARS; year += 1) {
    const from = monthsAfter(world.start, 12 * (year - 1));
    const to = monthsAfter(world.start, 12 * year);
    const businessesAtStart = businessesIn(api, townId).length;
    for (let month = 1; month <= 12; month += 1)
      advanceCore(core, monthsAfter(world.start, 12 * (year - 1) + month));
    years.push({
      year,
      from,
      to,
      businessesAtStart,
      openings: [],
      closings: [],
    });
    process.stderr.write(`year ${year} played to ${to}\n`);
  }
} finally {
  setJournalTrace(null);
}

const business = api.moduleState("business");
interface Founding {
  id: string;
  organizationId: string;
  founderId: string;
  kindId: string;
  placeId: string;
  date: string;
  room: number;
  loanMinor: number;
  equityMinor?: number;
  parentFundsMinor: number;
  parentId?: string;
  parentStrength?: number;
}
const foundings = business.table("foundings").rows() as unknown as Founding[];
for (const row of foundings) {
  if (row.placeId !== townId) continue;
  const year = years.find((y) => row.date > y.from && row.date <= y.to);
  year?.openings.push(row.id);
}
for (const [id, book] of core.finance.businesses) {
  if (!book.closedAt || core.organizations.get(id)?.placeId !== townId)
    continue;
  const year = years.find(
    (y) => book.closedAt! > y.from && book.closedAt! <= y.to,
  );
  year?.closings.push(id);
}

// (1) Openings and closings against the real rates.
const yearsOut: Record<string, unknown>[] = [];
const allowed = (count: number, base: number, [low, high]: Range) =>
  count >= Math.floor((base * low) / 100) &&
  count <= Math.ceil((base * high) / 100);
for (const y of years) {
  const entryRate =
    (100 * y.openings.length) / Math.max(1, y.businessesAtStart);
  const exitRate = (100 * y.closings.length) / Math.max(1, y.businessesAtStart);
  yearsOut.push({
    year: y.year,
    from: y.from,
    to: y.to,
    businessesAtStart: y.businessesAtStart,
    openings: y.openings.length,
    openingRatePct: Number(entryRate.toFixed(2)),
    closings: y.closings.length,
    closingRatePct: Number(exitRate.toFixed(2)),
    sampleOpeningIds: y.openings.slice(0, 3),
    closingDetails: y.closings.map((id) => {
      const book = core.finance.businesses.get(id)!;
      return `${id} ${book.kindId} closed ${book.closedAt} because ${book.closingReasonKey ?? "no reason on record"}`;
    }),
  });
  if (!entryRange || !exitRange) continue;
  if (!allowed(y.openings.length, y.businessesAtStart, entryRange))
    fail(
      `year ${y.year}: ${y.openings.length} openings of ${y.businessesAtStart} businesses (${entryRate.toFixed(2)}%) is outside the recorded entry range [${entryRange[0]}, ${entryRange[1]}]% (${rateSource})`,
    );
  if (!allowed(y.closings.length, y.businessesAtStart, exitRange))
    fail(
      `year ${y.year}: ${y.closings.length} closings of ${y.businessesAtStart} businesses (${exitRate.toFixed(2)}%) is outside the recorded exit range [${exitRange[0]}, ${exitRange[1]}]% (${rateSource})`,
    );
}
if (!entryRange || !exitRange)
  console.error(
    `openings and closings: unchecked, BDS has no rows for ${usps} (state code ${fips})`,
  );

// (2) Owners' income comes from profit.
interface Draw {
  id: string;
  organizationId: string;
  ownerId: string;
  date: string;
  profitMinor: number;
  retainedBeforeMinor: number;
  share: number;
  drawnMinor: number;
}
const drawRows = business.table("draws").rows() as unknown as Draw[];
let paidDraws = 0,
  unmatched = 0,
  mismatched = 0,
  overRetained = 0,
  noSales = 0;
const drawnBy = new Map<string, number>();
const sampleDraws: string[] = [];
for (const row of drawRows) {
  if (row.drawnMinor <= 0) continue;
  paidDraws += 1;
  drawnBy.set(
    row.organizationId,
    (drawnBy.get(row.organizationId) ?? 0) + row.drawnMinor,
  );
  if (sampleDraws.length < 3) sampleDraws.push(row.id);
  if (
    row.retainedBeforeMinor <= 0 ||
    row.drawnMinor > row.retainedBeforeMinor
  ) {
    overRetained += 1;
    if (overRetained <= 3)
      fail(
        `${row.id}: drew ${row.drawnMinor} with ${row.retainedBeforeMinor} of profit kept`,
      );
  }
  const entries =
    draws.get(`owner-draw:${row.organizationId}:${row.date}`) ?? [];
  if (!entries.length) {
    unmatched += 1;
    if (unmatched <= 3) fail(`${row.id}: no journal entry for the draw`);
    continue;
  }
  const out = entries
    .flatMap((e) => e.postings)
    .filter((p) => p.deltaMinor < 0);
  const into = entries
    .flatMap((e) => e.postings)
    .filter((p) => p.deltaMinor > 0);
  const outTotal = out.reduce((n, p) => n - p.deltaMinor, 0);
  if (
    out.some((p) => p.owner !== row.organizationId) ||
    !out.length ||
    outTotal !== row.drawnMinor ||
    !into.length ||
    into.some((p) => p.owner === row.organizationId)
  ) {
    mismatched += 1;
    if (mismatched <= 3)
      fail(
        `${row.id}: journal ${entries.map((e) => e.id).join(", ")} moved ${outTotal} out of ${[...new Set(out.map((p) => p.owner))].join(", ")}, the record says ${row.drawnMinor} out of ${row.organizationId}`,
      );
  }
}
for (const [id, drawn] of drawnBy) {
  const book = core.finance.businesses.get(id);
  const received =
    (book?.salesReceivedMinor ?? 0) - (salesAtStart.get(id) ?? 0);
  if (!(received > 0) || drawn > received) {
    noSales += 1;
    if (noSales <= 3)
      fail(
        `${id}: drew ${drawn} over the run on ${received} of sales received in it`,
      );
  }
}

// (3) Some business added a location, unscripted.
const locations = foundings.filter((row) => row.parentId);
const owners = business.table("owners");
const grounded = locations.filter((row) => {
  const parent = row.parentId
    ? core.finance.businesses.get(row.parentId)
    : undefined;
  const owner = owners.get(row.organizationId) as
    { basis?: string; parentId?: string } | undefined;
  return (
    parent !== undefined &&
    (row.parentStrength ?? 0) > 0 &&
    row.room > 0 &&
    row.parentFundsMinor > 0 &&
    owner?.basis === "location" &&
    owner.parentId === row.parentId
  );
});
if (!locations.length) fail(`no business added a location in ${YEARS} years`);
else if (!grounded.length)
  fail(
    `${locations.length} locations opened, none with a parent, a market room, a strength and the parent's cash behind it`,
  );

console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: townId,
    seed: world.seed,
    start: world.start,
    state: usps,
    rateSource: rateSource || null,
    entryRangePct: entryRange ?? null,
    exitRangePct: exitRange ?? null,
    years: yearsOut,
    ownerDraws: {
      onRecord: drawRows.length,
      paid: paidDraws,
      noJournalEntry: unmatched,
      journalMismatch: mismatched,
      beyondProfitKept: overRetained,
      beyondSales: noSales,
      sampleIds: sampleDraws,
    },
    locations: {
      foundingsOnRecord: foundings.length,
      locationsOnRecord: locations.length,
      inTown: locations.filter((row) => row.placeId === townId).length,
      grounded: grounded.length,
      sample: grounded.slice(0, 3).map((row) => ({
        id: row.id,
        date: row.date,
        parent: row.parentId,
        parentStrength: row.parentStrength,
        room: row.room,
        parentFundsMinor: row.parentFundsMinor,
      })),
    },
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
