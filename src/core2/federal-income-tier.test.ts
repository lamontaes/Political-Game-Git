// @vitest-environment node
/**
 * The federal treasury's individual income tax from the rest of the country, read from the
 * country tier's own withholding (pinned to Roy, Montana, draw meet-a1:1). The law
 * changes are controlled fixtures through `enactLaw`; the tier, the withholding reader and the
 * treasury's close run as in play.
 *
 * Why it plays about five months: the treasury closes once a month and reads the tier's last
 * month, and a law enacted tomorrow reaches the tier at its next month step and the treasury at
 * the close after that. So the world plays 40 days (two closes, the first sets the base), then
 * 62 days after each of the two law changes (two month starts each). A smaller place (Roy,
 * Montana, about 28 seconds a year) keeps those days to about 25 seconds.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { aidedLines, outsideRevenueMonthly } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetInForce, governments, taxPaymentsOf } from "./modules/budgets";
import { enactLaw, lawChain } from "./modules/laws";
import { countryStateParts, countryStates } from "./modules/macro";
import { coreAPI } from "./state";

const place = drawPlace("meet-a1:1", "meetings-floor");
const LINE = "individualIncomeTax";

it("the federal income tax follows the tier's withholding, once, under the law in force", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  const api = coreAPI(world.core);
  const chain = lawChain(api);
  const federal = governments(api).find((g) => g.level === "federal")!;
  const rows = () =>
    taxPaymentsOf(api, federal.id)
      .filter((p) => p.line === LINE && p.payerId === "country-workers")
      .sort((a, b) => a.date.localeCompare(b.date));
  const tierIncome = (key: string) =>
    countryStates(api)
      .find((s) => s.key === key)!
      .whatMoved.at(-1)!.incomeTaxRevenue;
  const run = (days: number) =>
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), days));

  run(40);
  const first = rows();
  expect(first.length).toBeGreaterThanOrEqual(2);
  const base = first.at(-1)!;
  expect(base.amountMinor).toBeGreaterThan(0);
  expect((base as unknown as { tierMonth: number }).tierMonth).toBeGreaterThan(
    0,
  );

  // The plug no longer pays this line: the monthly twelfth falls by the line's own
  // monthly figure for the rest of the country, which the tier's payment replaces.
  const budget = budgetInForce(api, federal.id)!;
  const aided = aidedLines(api, governments(api));
  const withPlug = outsideRevenueMonthly(api, federal, budget, aided);
  const withoutPlug = outsideRevenueMonthly(
    api,
    federal,
    budget,
    aided,
    new Set([LINE]),
  );
  expect(withPlug - withoutPlug).toBeGreaterThan(0);
  expect(
    Math.abs((withPlug - withoutPlug) * base.baseIndex - base.installmentMinor),
  ).toBeLessThanOrEqual(2 + base.installmentMinor * 1e-6);

  // Counted once: the state's tier steps its rest (the town's part is out of it), and the
  // town's own people pay their federal tax through their own paychecks, not here.
  const parts = countryStateParts(api, chain.stateKey)!;
  expect(parts.part.jobs).toBeGreaterThan(0);
  expect(parts.rest.jobs + parts.part.jobs).toBeCloseTo(parts.total.jobs, 6);
  expect(parts.rest.jobs).toBeLessThan(parts.total.jobs);

  // A state's income tax change moves that state's collection and not the federal line.
  const otherKey = countryStates(api).find(
    (s) => s.key !== chain.stateKey && tierIncome(s.key) > 0,
  )!.key;
  const otherBefore = tierIncome(otherKey);
  const stateBefore = tierIncome(chain.stateKey);
  expect(stateBefore).toBeGreaterThan(0);
  const fixture = (
    level: "state" | "federal",
    jurisdiction: string,
    measure: string,
  ) =>
    enactLaw(api, {
      jurisdiction,
      level,
      series: "income-tax",
      value: 0,
      unit: "percent",
      effectiveDate: addDays(makeIsoDate(api.state.date), 1),
      measureId: measure,
      citation:
        "Controlled fixture: an income tax set to nothing; not a played vote",
    });
  fixture("state", chain.stateKey, "tier-state-zero");
  run(62);
  expect(tierIncome(chain.stateKey)).toBeLessThan(stateBefore * 0.05);
  expect(tierIncome(otherKey)).toBeGreaterThan(otherBefore * 0.9);
  const afterState = rows().at(-1)!;
  expect(afterState.date > base.date).toBe(true);
  expect(afterState.baseIndex / base.baseIndex).toBeGreaterThan(0.97);
  expect(afterState.baseIndex / base.baseIndex).toBeLessThan(1.03);

  // A federal change moves the federal line the next month.
  fixture("federal", "US", "tier-federal-zero");
  run(62);
  const afterFederal = rows().at(-1)!;
  expect(afterFederal.date > afterState.date).toBe(true);
  expect(afterFederal.baseIndex).toBeLessThan(afterState.baseIndex * 0.05);
  expect(afterFederal.amountMinor).toBeLessThan(afterState.amountMinor * 0.05);
}, 60_000);
