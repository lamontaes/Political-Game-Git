/**
 * Checks that the starting-law table carries the law in force on the start
 * date (January 20, 2025) for every series a national 2025 table covers, at
 * that table's figures: federal income tax and the Social Security wage base
 * (IRS), state income and sales taxes (Tax Foundation, January 1, 2025),
 * SNAP maximums and the Medicaid match (FY2025) and unemployment weekly
 * bounds (DOL, January 2025). scripts/research/build-starting-law.py writes
 * these phases; this script exits 1 when a row is missing or differs, and
 * lists the series that are still carried back from a later phase.
 * Run: node --import tsx scripts/research/check-start-law-2025.ts
 */
import { readFileSync } from "node:fs";

const START = "2025-01-20";

interface LawRow {
  readonly level: string;
  readonly series: string;
  readonly tier: string;
  readonly value: number | null;
  readonly effectiveDate: string;
  readonly endDate: string | null;
  readonly terms?: Record<string, unknown>;
}

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const law = read<{ jurisdictions: Record<string, LawRow[]> }>(
  "src/core2/data/laws/starting-law.json",
).jurisdictions;
const federal = read<{
  incomeTax: {
    schedules: Record<
      string,
      {
        standardDeductionMinor: number;
        brackets: { overMinor: number; rateBasisPoints: number }[];
      }
    >;
  };
  socialSecurity: { ratePercent: number; wageBase: number };
}>("data/research/laws/irs-2025-federal-tax.json");
const income = read<{
  places: Record<
    string,
    {
      brackets: { ratePercent: number; overSingle: number }[];
      standardDeductionSingle: number | null;
    }
  >;
}>("data/research/laws/taxfoundation-2025-state-income-tax.json");
const sales = read<{
  places: Record<string, { stateRate: number; avgLocalRate: number }>;
}>("data/research/laws/taxfoundation-2025-sales-tax.json");
const snap = read<{
  places: Record<
    string,
    { area: string; maximumByHouseholdSize: Record<string, number> }[]
  >;
}>("data/research/laws/fns-2025-snap-maximums.json");
const fmap = read<{ places: Record<string, { value: number }> }>(
  "data/research/laws/hhs-2025-fmap.json",
);
const ui = read<{
  places: Record<string, { maximumPublished: number[] }>;
}>("data/research/laws/dol-2025-ui-weekly-bounds.json");

const errors: string[] = [];
const inForce = (row: LawRow) =>
  row.effectiveDate <= START && (row.endDate === null || row.endDate > START);

/** The row of a series in force on the start date, not a carried estimate. */
function atStart(
  jurisdiction: string,
  series: string,
  tier = "general",
): LawRow | null {
  const row = (law[jurisdiction] ?? []).find(
    (r) => r.series === series && r.tier === tier && inForce(r),
  );
  if (!row)
    errors.push(
      `${jurisdiction} ${series} ${tier}: no row in force on ${START}`,
    );
  return row ?? null;
}

function same(label: string, got: unknown, want: unknown): void {
  if (JSON.stringify(got) !== JSON.stringify(want))
    errors.push(
      `${label}: table has ${JSON.stringify(got)}, research has ${JSON.stringify(want)}`,
    );
}

const single = federal.incomeTax.schedules.single!;
const usTax = atStart("US", "income-tax");
same(
  "US income-tax single brackets",
  (usTax?.terms?.schedules as Record<string, { brackets: unknown }>)?.single
    ?.brackets,
  single.brackets.map((b) => ({
    over: b.overMinor / 100,
    rate: b.rateBasisPoints / 100,
  })),
);
same(
  "US social-security-tax wage base",
  atStart("US", "social-security-tax")?.terms?.wageBase,
  federal.socialSecurity.wageBase,
);
for (const [state, place] of Object.entries(income.places)) {
  const row = atStart(state, "income-tax");
  const schedule = (
    row?.terms?.schedules as Record<string, unknown> | undefined
  )?.single as { standardDeduction: number | null; brackets: unknown };
  same(
    `${state} income-tax brackets`,
    schedule?.brackets,
    place.brackets.map((b) => ({ over: b.overSingle, rate: b.ratePercent })),
  );
  same(
    `${state} income-tax standard deduction`,
    schedule?.standardDeduction,
    place.standardDeductionSingle,
  );
}
for (const [state, place] of Object.entries(sales.places)) {
  same(
    `${state} sales-tax`,
    atStart(state, "sales-tax")?.value,
    place.stateRate,
  );
  const local = (law[state] ?? []).find(
    (r) => r.series === "local-sales-tax-average" && inForce(r),
  );
  if (local)
    same(`${state} local-sales-tax-average`, local.value, place.avgLocalRate);
}
for (const [state, items] of Object.entries(snap.places))
  for (const item of items) {
    const tier = item.area.startsWith("rural") ? item.area : "general";
    same(
      `${state} snap-maximum ${item.area}`,
      atStart(state, "snap-maximum", tier)?.terms?.byHouseholdSize,
      item.maximumByHouseholdSize,
    );
  }
for (const [state, place] of Object.entries(fmap.places))
  same(
    `${state} medicaid-match`,
    atStart(state, "medicaid-match")?.value,
    place.value,
  );
for (const [state, place] of Object.entries(ui.places))
  same(
    `${state} unemployment-weekly-maximum`,
    atStart(state, "unemployment-weekly-maximum")?.terms?.maximum,
    place.maximumPublished,
  );

// What is still carried back from a later phase (laws.ts rowsCarriedToStart).
const carried = new Map<string, number>();
for (const [jurisdiction, rows] of Object.entries(law)) {
  const groups = new Map<string, LawRow[]>();
  for (const row of rows) {
    const key = `${row.level}|${row.series}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, group] of groups)
    if (!group.some(inForce) && group.some((r) => r.effectiveDate > START))
      carried.set(key, (carried.get(key) ?? 0) + 1);
  void jurisdiction;
}
console.log(`Still carried back to ${START} (level|series: jurisdictions):`);
for (const [key, count] of [...carried].sort((a, b) => b[1] - a[1]))
  console.log(`  ${key}: ${count}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `2025 phases match the research: federal income tax and wage base, ${Object.keys(income.places).length} state income taxes, ${Object.keys(sales.places).length} sales taxes, ${Object.keys(snap.places).length} SNAP places, ${Object.keys(fmap.places).length} Medicaid matches, ${Object.keys(ui.places).length} unemployment maximums.`,
);
