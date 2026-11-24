/**
 * Every other state keeps a budget in the one budget store (Nation, Nov 8),
 * and after the opening year each is a view of that state's ledger in the
 * country tier (core-country-tier-ledgers-replace-outside-budgets): its tax
 * lines are its share of what the tier's ledger took in under the state's own
 * law, its spending its share of the budget the ledger adopted, and the lines
 * the tier does not model stay at their published opening values.
 *
 * Twin worlds in a place drawn from all 56, on a seed nobody chose: in one,
 * another state raises its sales tax two points a month after the opening; at
 * that state's next fiscal year its sales tax line is higher than in the world
 * left alone, and the lines the tier does not model are the same in both.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, type BudgetRow } from "./modules/budgets";
import { enactLaw, lawChain, stateLawInForce } from "./modules/laws";
import { STATES } from "./modules/outside-budgets";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
/** Sales tax points the twin's state adds. */
const RAISE = 2;
/** Days played: past every July-to-June state's next fiscal year. */
const DAYS = 200;

const budgets = (core: CoreState) =>
  coreAPI(core)
    .moduleState(BUDGETS_MODULE_ID)
    .table("budgets")
    .rows() as unknown as BudgetRow[];

const play = (core: CoreState, days: number) => {
  let day = makeIsoDate(core.date);
  const end = addDays(day, days);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
};

it(`another state's budget reads its ledger in the country tier, and its own tax law moves it (seed ${seed})`, () => {
  const place = drawPlace(seed, "outside-budgets");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const build = () =>
    buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
  const alone = build();
  const raised = build();
  const api = coreAPI(raised);
  const town = lawChain(api).stateKey;
  // A state with a sales tax and a July fiscal year, outside the town's chain.
  const stateKey = Object.entries(STATES)
    .filter(
      ([key, base]) =>
        key !== town &&
        base.fiscalYearStart === "07-01" &&
        (stateLawInForce(api, key, "sales-tax").value ?? 0) > 0,
    )
    .map(([key]) => key)
    .sort()[0];
  expect(stateKey, `${where}: no July state with a sales tax`).toBeDefined();
  const rate = stateLawInForce(api, stateKey!, "sales-tax").value!;
  play(alone, 30);
  play(raised, 30);
  enactLaw(api, {
    // Another state's law is kept under its state key (stateLawInForce).
    jurisdiction: stateKey!,
    level: "state",
    series: "sales-tax",
    value: rate + RAISE,
    unit: "percent",
    effectiveDate: raised.date,
    measureId: "test:outside-budgets-raise",
    citation: "A controlled raise in a generated world.",
  });
  expect(stateLawInForce(api, stateKey!, "sales-tax").value).toBe(rate + RAISE);
  play(alone, DAYS - 30);
  play(raised, DAYS - 30);

  // Every other state keeps a budget, and every year after the opening's is
  // a view of its tier row, which dev mode's Trace opens by id.
  const outside = budgets(raised).filter(
    (r) => r.governmentId.startsWith("US-") && r.governmentId !== town,
  );
  expect(
    new Set(outside.map((r) => r.governmentId)).size,
    `${where}: other states with a budget`,
  ).toBeGreaterThan(40);
  const later = outside.filter((r) => r.ledgerId);
  expect(later.length, `${where}: no budget reads the tier`).toBeGreaterThan(0);
  for (const r of later) {
    expect(r.ledgerId).toBe(`country-state:${r.governmentId}`);
    expect(
      coreAPI(raised)
        .moduleState("macro")
        .table("countryStates")
        .get(r.ledgerId!),
      `${where}: ${r.id} names no tier row`,
    ).toBeDefined();
  }

  // The raise shows in the state's own sales tax line, and nowhere the tier
  // does not model.
  // The first fiscal year that starts after the raise.
  const raisedOn = addDays(makeIsoDate(gameStartDate()), 30);
  const row = (core: CoreState) =>
    budgets(core)
      .filter(
        (r) =>
          r.governmentId === stateKey && r.ledgerId && r.startsOn > raisedOn,
      )
      .sort((a, b) => a.fiscalYear - b.fiscalYear)[0];
  const before = row(alone);
  const after = row(raised);
  expect(
    after,
    `${where}: ${stateKey} has no budget from the tier`,
  ).toBeDefined();
  expect(after!.id).toBe(before!.id);
  const sales = (r: BudgetRow) => r.revenueMinor.generalSalesTax ?? 0;
  expect(
    sales(after!),
    `${where}: ${after!.id} sales tax ${sales(after!)} against ${sales(before!)} left alone`,
  ).toBeGreaterThan(sales(before!));
  for (const line of ["propertyTax", "chargesAndFees", "federalAid"])
    expect(after!.revenueMinor[line], `${where}: ${after!.id} ${line}`).toBe(
      before!.revenueMinor[line],
    );
  process.stdout.write(
    `OUTSIDE BUDGETS ${where}: ${stateKey} sales tax ${rate}% raised to ${rate + RAISE}%; ${after!.id} (${after!.ledgerId}) general sales tax ${sales(after!)} against ${sales(before!)} left alone; ${later.length} rows read the tier\n`,
  );
}, 1_800_000);
