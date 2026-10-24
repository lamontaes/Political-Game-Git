/**
 * M1-07 golden-path check, budgets and taxes at every level, in a played
 * world. Uses GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The
 * drawn place is built as the player gets it (`buildBenchWorld`, every module
 * installed) and plays one game year with the cash journal watched
 * (setJournalTrace), so every posting a treasury made or took is read as the
 * journal admitted it. Passes when:
 * (1) every government the world has (federal, state, county, city or
 *     township) adopted a budget in the year, on the day its fiscal year
 *     starts, with an adoption event on record and who adopted it: federal
 *     October 1 (the Treasury statement's fiscal year ends September 30,
 *     data/research/money/federal-budget-fy2025.json), a state on the start
 *     NASBO's Budget Processes in the States records
 *     (data/research/money/government-budgets-2026.json), a county or city on
 *     the fiscal year of the Census 2024 unit nearest it in population
 *     (src/core2/data/budgets/local-fiscal-years.json);
 * (2) federal money reached named residents and the town, and so did the
 *     state's: at least one journal entry from the federal treasury, and one
 *     from the state's, to a named person of the world, and one to the town
 *     (a town business, the town's resident group or the town's own
 *     government), by entry id;
 * (3) every dollar balances: every journal entry a treasury was part of nets
 *     to zero, and each treasury's balance at the end is its balance at the
 *     start plus what the journal moved through it;
 * (4) spending and taxes per resident: the budget in force at the end of the
 *     year for the state, and for the county and city together, has taxes and
 *     spending per resident inside the range the 50 states and D.C. recorded
 *     (Census Annual Survey of State and Local Government Finances, fiscal
 *     2022, data/research/money/state-local-finances-2022.json, carried to the
 *     opening year by the same factor the budgets use,
 *     data/research/money/public-budget-bases.json calibration), and what the
 *     state's and the local treasuries really paid out in the year per
 *     resident (journal, to anyone but another government) is inside the
 *     spending range. Places the Census table does not cover (the territories)
 *     and the federal government (one budget, no cross-section in the repo)
 *     are reported unchecked, never passed.
 * Exits nonzero naming each failed clause.
 */
import { setJournalTrace } from "../journal-state";
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import nasbo from "../../../data/research/money/government-budgets-2026.json" with { type: "json" };
import federalBudget from "../../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import finances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import {
  budgetsOf,
  governments,
  localFiscalYearStart,
} from "../modules/budgets";
import { buildPlayedWorld, monthsAfter, playYear } from "./m1-played-year";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const fail = (text: string) => {
  if (failures.length < 40) failures.push(text);
};
const govs = [...governments(api)];
const treasuryOf = new Map(govs.map((g) => [g.organizationId, g]));
const townId = world.placeId;
const end = monthsAfter(world.start, 12);

// The journal as it admitted each entry a treasury took part in.
interface Posting {
  owner: string;
  accountId: string;
  deltaMinor: number;
}
interface Entry {
  id: string;
  ref: string;
  postings: Posting[];
}
const entries: Entry[] = [];
let allEntries = 0,
  unbalanced = 0;
const openingBalance = new Map<string, number>();
const treasuryAccountDelta = new Map<string, number>();
for (const gov of govs)
  openingBalance.set(
    gov.organizationId,
    core.organizations.get(gov.organizationId)?.liquidMinor ?? 0,
  );
setJournalTrace((entry) => {
  allEntries += 1;
  let net = 0,
    touches = false;
  const postings = entry.postings.map((p) => {
    net += p.deltaMinor;
    const owner = core.cashJournal.accounts.get(p.accountId)?.ownerId ?? "?";
    if (treasuryOf.has(owner)) touches = true;
    return { owner, accountId: p.accountId, deltaMinor: p.deltaMinor };
  });
  if (net !== 0) {
    unbalanced += 1;
    fail(`${entry.id} (${entry.sourceRef.id}) nets ${net}, not zero`);
  }
  if (!touches) return;
  for (const p of postings)
    if (treasuryOf.has(p.owner))
      treasuryAccountDelta.set(
        p.owner,
        (treasuryAccountDelta.get(p.owner) ?? 0) + p.deltaMinor,
      );
  entries.push({ id: entry.id, ref: entry.sourceRef.id, postings });
});
try {
  playYear(world);
} finally {
  setJournalTrace(null);
}

// (1) Every level adopts on its real calendar.
const stateKey = govs.find((g) => g.level === "state")?.id ?? "";
const federalEnd = /September 30/.test(
  JSON.stringify(federalBudget.source.receiptsAndOutlays.title),
)
  ? "09-30"
  : undefined;
const federalStart = federalEnd ? "10-01" : undefined;
const nasboStart = (
  nasbo.places as unknown as Record<
    string,
    { fiscalYear?: { startsOn?: string } }
  >
)[stateKey]?.fiscalYear?.startsOn;
const basesStart = (
  budgetBases.places as unknown as Record<string, { fiscalYearStart: string }>
)[stateKey]?.fiscalYearStart;
function expectedStart(gov: (typeof govs)[number]): string | undefined {
  if (gov.level === "federal") return federalStart;
  if (gov.level === "state") return nasboStart ?? basesStart;
  return localFiscalYearStart(
    stateKey,
    gov.level === "county" ? "county" : "municipal",
    gov.residents,
  );
}
const adopted: Record<string, unknown>[] = [];
for (const gov of govs) {
  const expected = expectedStart(gov);
  if (!expected) {
    fail(`${gov.id}: no recorded fiscal year start to hold its calendar to`);
    continue;
  }
  if (gov.fiscalYearStart !== expected)
    fail(
      `${gov.id}: runs a fiscal year from ${gov.fiscalYearStart}, the record says ${expected}`,
    );
  const inYear = budgetsOf(api, gov.id).filter(
    (row) => row.startsOn > world.start && row.startsOn <= end,
  );
  if (inYear.length !== 1) {
    fail(`${gov.id}: ${inYear.length} budgets start in the year, expected 1`);
    continue;
  }
  const budget = inYear[0]!;
  if (budget.startsOn.slice(5) !== expected)
    fail(
      `${budget.id}: starts ${budget.startsOn}, the calendar says ${expected}`,
    );
  if (budget.adoptedOn !== budget.startsOn)
    fail(
      `${budget.id}: adopted ${budget.adoptedOn}, not on its first day ${budget.startsOn}`,
    );
  if (!core.eventIds.has(`budget-adopted:${budget.id}`))
    fail(`${budget.id}: no budget-adopted event on record`);
  if (!budget.adoptedBy) fail(`${budget.id}: no record of who adopted it`);
  adopted.push({
    government: gov.id,
    level: gov.level,
    budget: budget.id,
    startsOn: budget.startsOn,
    adoptedOn: budget.adoptedOn,
    adoptedBy: budget.adoptedBy.slice(0, 60),
  });
}

// (2) Federal and state money reaches named residents and the town.
const townGovernmentTreasuries = new Set(
  govs
    .filter((g) => g.level === "county" || g.level === "city")
    .map((g) => g.organizationId),
);
type Reach = { person: string[]; town: string[]; counted: number };
const reach = new Map<string, Reach>();
for (const gov of govs)
  if (gov.level === "federal" || gov.level === "state")
    reach.set(gov.id, { person: [], town: [], counted: 0 });
for (const entry of entries) {
  for (const from of entry.postings) {
    const gov = treasuryOf.get(from.owner);
    const row = gov && reach.get(gov.id);
    if (!row || from.deltaMinor >= 0) continue;
    for (const to of entry.postings) {
      if (to.deltaMinor <= 0 || to.owner === from.owner) continue;
      const organization = core.organizations.get(to.owner);
      if (core.people.has(to.owner as never)) row.person.push(entry.id);
      else if (townGovernmentTreasuries.has(to.owner)) row.town.push(entry.id);
      else if (organization && organization.placeId === townId) {
        row.town.push(entry.id);
        if (to.owner.startsWith("residents:")) row.counted += 1;
      }
    }
  }
}
for (const [id, row] of reach) {
  if (!row.person.length)
    fail(`${id}: no journal entry from its treasury to a named person`);
  if (!row.town.length)
    fail(`${id}: no journal entry from its treasury to the town`);
}

// (3) Every dollar balances.
if (unbalanced)
  fail(`${unbalanced} of ${allEntries} journal entries did not net to zero`);
for (const gov of govs) {
  const start = openingBalance.get(gov.organizationId) ?? 0;
  const close = core.organizations.get(gov.organizationId)?.liquidMinor ?? 0;
  const moved = treasuryAccountDelta.get(gov.organizationId) ?? 0;
  if (close - start !== moved)
    fail(
      `${gov.id}: balance went from ${start} to ${close} (${close - start}) but the journal moved ${moved} through its accounts`,
    );
}

// (4) Spending and taxes per resident against the Census range.
const factor = budgetBases.calibration.factor;
type Level = "state" | "local";
const perResident: Record<Level, Record<"taxes" | "expenditure", number[]>> = {
  state: { taxes: [], expenditure: [] },
  local: { taxes: [], expenditure: [] },
};
for (const [key, row] of Object.entries(
  finances.places as unknown as Record<
    string,
    {
      population2023: number;
      dollars: Record<Level, Record<"taxes" | "expenditure", number>>;
    }
  >,
)) {
  if (key === "US") continue;
  for (const level of ["state", "local"] as const)
    for (const what of ["taxes", "expenditure"] as const)
      // D.C. is one government in the table: it has no state-alone or local-alone figure to put in a range.
      if (row.dollars[level][what] > 0)
        perResident[level][what].push(
          (row.dollars[level][what] * factor) / row.population2023,
        );
}
const bounds = (level: Level, what: "taxes" | "expenditure") =>
  [
    Math.min(...perResident[level][what]),
    Math.max(...perResident[level][what]),
  ] as const;
const TAX_LINES = [
  "individualIncomeTax",
  "corporateIncomeTax",
  "generalSalesTax",
  "selectiveSalesTaxes",
  "propertyTax",
  "vehicleAndOtherTaxes",
];
const sum = (record: Readonly<Record<string, number>>, keys?: string[]) =>
  Object.entries(record)
    .filter(([key]) => !keys || keys.includes(key))
    .reduce((n, [, v]) => n + v, 0);
const covered = Boolean((finances.places as Record<string, unknown>)[stateKey]);
const inForce = (id: string) =>
  budgetsOf(api, id)
    .filter((row) => row.startsOn <= end)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .at(-1);
// What each treasury really paid out in the year, to anyone but another government.
const paidOut = (gov: (typeof govs)[number]): number => {
  let total = 0;
  for (const entry of entries) {
    const own = entry.postings
      .filter((p) => p.owner === gov.organizationId && p.deltaMinor < 0)
      .reduce((n, p) => n - p.deltaMinor, 0);
    if (!own) continue;
    const toGovernments = entry.postings
      .filter((p) => treasuryOf.has(p.owner) && p.deltaMinor > 0)
      .reduce((n, p) => n + p.deltaMinor, 0);
    total += Math.max(0, own - toGovernments);
  }
  return total;
};
const perResidentFigures: Record<string, unknown> = {};
const within = (
  label: string,
  value: number,
  [low, high]: readonly [number, number],
  lowerToo = true,
) => {
  if (value > high || (lowerToo && value < low))
    fail(
      `${label}: ${value.toFixed(0)} dollars per resident is outside the recorded range [${lowerToo ? low.toFixed(0) : 0}, ${high.toFixed(0)}] (Census fiscal 2022 state and local finances, by state)`,
    );
};
const unchecked: string[] = [
  "federal: one budget, no cross-section of governments in the repo to hold its per-resident figures to",
];
if (!covered)
  unchecked.push(
    `${stateKey}: not in the Census state and local finances table (territories use separately labeled estimates)`,
  );
else {
  const state = govs.find((g) => g.level === "state")!;
  const stateBudget = inForce(state.id);
  if (stateBudget && state.residents > 0) {
    const taxes =
      sum(stateBudget.revenueMinor, TAX_LINES) / 100 / state.residents;
    const spending = sum(stateBudget.spendingMinor) / 100 / state.residents;
    const actual = paidOut(state) / 100 / state.residents;
    within("state taxes (budget)", taxes, bounds("state", "taxes"));
    within("state spending (budget)", spending, bounds("state", "expenditure"));
    within(
      "state spending paid (journal)",
      actual,
      bounds("state", "expenditure"),
    );
    perResidentFigures.state = {
      taxesBudget: Math.round(taxes),
      spendingBudget: Math.round(spending),
      spendingPaidJournal: Math.round(actual),
      taxesRange: bounds("state", "taxes").map(Math.round),
      spendingRange: bounds("state", "expenditure").map(Math.round),
    };
  }
  const locals = govs.filter((g) => g.level === "county" || g.level === "city");
  if (locals.length) {
    // The county and the city overlap in residents, so their per-resident figures add to a local government's.
    let taxes = 0,
      spending = 0,
      actual = 0,
      all = true;
    for (const gov of locals) {
      const budget = inForce(gov.id);
      if (!budget || gov.residents <= 0) {
        all = false;
        continue;
      }
      taxes += sum(budget.revenueMinor, TAX_LINES) / 100 / gov.residents;
      spending += sum(budget.spendingMinor) / 100 / gov.residents;
      actual += paidOut(gov) / 100 / gov.residents;
    }
    const both = all && locals.length === 2;
    // With only one of the two local governments in the world, the other's share is not modeled: only the upper bound holds.
    within("local taxes (budget)", taxes, bounds("local", "taxes"), both);
    within(
      "local spending (budget)",
      spending,
      bounds("local", "expenditure"),
      both,
    );
    within(
      "local spending paid (journal)",
      actual,
      bounds("local", "expenditure"),
      false,
    );
    perResidentFigures.local = {
      governments: locals.map((g) => g.id),
      taxesBudget: Math.round(taxes),
      spendingBudget: Math.round(spending),
      spendingPaidJournal: Math.round(actual),
      lowerBoundHeld: both,
      taxesRange: bounds("local", "taxes").map(Math.round),
      spendingRange: bounds("local", "expenditure").map(Math.round),
    };
  }
}

console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: townId,
    seed: world.seed,
    start: world.start,
    state: stateKey,
    calendarSources: {
      federal: `fiscal year ends ${federalEnd}`,
      state: nasboStart
        ? "NASBO Budget Processes (2021)"
        : "public-budget-bases",
      local: "Census 2024 unit files, local-fiscal-years.json",
    },
    adopted,
    reach: Object.fromEntries(
      [...reach].map(([id, row]) => [
        id,
        {
          toNamedPeople: row.person.length,
          toTheTown: row.town.length,
          toCountedResidentGroups: row.counted,
          samplePersonEntries: row.person.slice(0, 3),
          sampleTownEntries: row.town.slice(0, 3),
        },
      ]),
    ),
    journalEntriesWatched: allEntries,
    journalEntriesThroughTreasuries: entries.length,
    journalEntriesNotNettingZero: unbalanced,
    treasuryBalanceChangeMinor: Object.fromEntries(
      govs.map((g) => [
        g.id,
        [
          openingBalance.get(g.organizationId),
          core.organizations.get(g.organizationId)?.liquidMinor,
          treasuryAccountDelta.get(g.organizationId) ?? 0,
        ],
      ]),
    ),
    perResident: perResidentFigures,
    unchecked,
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
