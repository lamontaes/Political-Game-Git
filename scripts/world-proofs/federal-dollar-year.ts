/**
 * Follow the federal dollar: two played worlds built the same way
 * (`buildBenchWorld`, two-level, every module the bench installs), run a game
 * year. In one world the player passes a federal budget line in dev mode —
 * Social Security up a twentieth, on the same writer the president's own
 * February request uses — and Congress votes it on the fiscal year's first day;
 * in the control no line is passed and the year's budget adopts at its base (a
 * no-action control, the register's standing rule for sensitivity tests). The
 * two differ in nothing else: same seed, same place.
 *
 * The report prints the chain by record id — the federal budget row, the
 * treasury's journal entries, the payees the dollars reached in town, their
 * spending on named sellers, the jobs and tax reads that moved, and the
 * national month rows before and after — and the calibration check: where the
 * one-year response (output moved per dollar of outlay change, both as shares
 * of output) falls against the researched band (macroFederalOutlayResponseBand
 * in the parameter table). The check prints; it does not fail the build when
 * the response sits outside the band.
 *
 * node --import tsx scripts/world-proofs/federal-dollar-year.ts [seed] [placeKey] [days]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
  setBudgetPriorities,
} from "../../src/core2/modules/budgets";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { MACRO_MODULE_ID } from "../../src/core2/modules/macro";
import { purchaseTaxes } from "../../src/core2/modules/purchase-tax";
import { drawPlace } from "../../tests/golden-path/place";
import bandData from "../../src/core2/data/macro/parameters.json" with { type: "json" };
import federalBase from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };

const seed = process.argv[2] ?? randomBytes(20).toString("hex");
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "federal-dollar").key;
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();
/** The federal line dev mode passes: Social Security, the line whose payments
 * in town the game already reads (awards follow the line, recipients and
 * counted households are paid and spend it). */
const LINE = "socialSecurity";
/** One line in twenty up: a change a player could pass, big enough to read. */
const RAISE_SHARE = 0.05;
const outlays = (federalBase as unknown as { outlays: Record<string, number> })
  .outlays;
const lineChangeMinor = Math.round(outlays[LINE]! * 100 * RAISE_SHARE);

type Row = Record<string, unknown>;
type Core = ReturnType<typeof buildBenchWorld>["core"];
const rows = (core: Core, name: string) =>
  coreAPI(core)
    .moduleState(BUDGETS_MODULE_ID)
    .table(name)
    .rows() as unknown as Row[];
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const total = (record: Readonly<Record<string, number>>) =>
  sum(Object.values(record));

/**
 * Build one played world and run it a game year. `changes` is the federal
 * budget line the player passes in dev mode (re-asserted daily until Congress
 * votes, so the president's own February request cannot overwrite it); `{}`
 * holds the year's budget at its base.
 */
function play(changes: Readonly<Record<string, number>>) {
  const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
  const core = world.core;
  const api = coreAPI(core);
  const federal = governments(api).find((row) => row.level === "federal")!;
  const voted = () =>
    budgetsOf(api, federal.id).some((row) => row.startsOn > start);
  const end = addDays(makeIsoDate(start), days);
  for (let day = start; day < end;) {
    const next = addDays(makeIsoDate(day), 1);
    advanceCore(core, next);
    if (!voted())
      setBudgetPriorities(api, {
        governmentId: federal.id,
        setBy: "dev-mode budget line",
        changes,
      });
    day = next;
  }
  return { world, core, api, federal };
}

const withChange = play({ [LINE]: lineChangeMinor });
const atBase = play({});
const placeId = withChange.world.placeId;

// The federal budget the year adopted, against its base and the control.
const adoptedRows = (run: ReturnType<typeof play>) =>
  budgetsOf(run.api, run.federal.id)
    .filter((row) => row.startsOn > start)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
const yearBudget = adoptedRows(withChange).at(-1)!;
const base = baseBudget(
  withChange.api,
  withChange.federal,
  yearBudget.fiscalYear,
);
const controlBudget = adoptedRows(atBase).at(-1)!;
const outlayChangeMinor =
  total(yearBudget.spendingMinor) - total(controlBudget.spendingMinor);

// The treasury's closes: where each month's twelfths actually landed.
interface TreasuryLine {
  inTownMinor: number;
  aidMinor: number;
  providersMinor: number;
  outsideMinor: number;
  shortMinor: number;
  dueMinor: number;
}
const landedIn = (run: ReturnType<typeof play>) => {
  const months = rows(run.core, "treasuryMonths")
    .filter((row) => row.governmentId === run.federal.id)
    .sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    ) as unknown as {
    id: string;
    date: string;
    lines: Record<string, TreasuryLine>;
    paymentIds: string[];
  }[];
  const bucket = (pick: (line: TreasuryLine) => number) =>
    sum(months.flatMap((row) => Object.values(row.lines).map(pick)));
  return {
    months: months.length,
    inTownMinor: bucket((line) => line.inTownMinor),
    providersMinor: bucket((line) => line.providersMinor),
    aidMinor: bucket((line) => line.aidMinor),
    outsideMinor: bucket((line) => line.outsideMinor),
    shortMinor: bucket((line) => line.shortMinor),
    // Each line's twelfth is fully accounted: paid in town, as aid, to the
    // town's businesses, to the outside account, or short (rounding to cents).
    balanced: months.every((row) =>
      Object.values(row.lines).every(
        (line) =>
          Math.abs(
            line.dueMinor -
              line.inTownMinor -
              line.aidMinor -
              line.providersMinor -
              line.outsideMinor -
              line.shortMinor,
          ) <= 2,
      ),
    ),
    paymentIds: months.flatMap((row) => row.paymentIds).slice(0, 6),
  };
};

// The Social Security line's change reached named recipients (full people)
// and counted households (their pooled income), by record id.
const landedPeople = rows(withChange.core, "landed")
  .slice(0, 4)
  .map((row) => ({
    personId: row.personId,
    obligationId: row.obligationId,
    landedId: row.id,
    share: row.share,
  }));
const townPaidIncome = (core: Core) => {
  const paid = core.finance.paidIncomeByPlaceMonth;
  const months = new Map<string, number>();
  for (const [key, minor] of paid)
    if (key.endsWith(`:${placeId}`)) {
      const month = key.slice(0, "YYYY-MM".length);
      months.set(month, (months.get(month) ?? 0) + minor);
    }
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
};

// Counted households' spending on named sellers: the purchase flows with a
// sales receipt, and the books, sales tax and staffing that read them.
function sellerReads(core: Core) {
  const rt = residentsRuntime(core);
  const purchases = rt
    ? [...rt.flows.values()]
        .filter(
          (flow) =>
            !flow.endedAt &&
            flow.kind === "purchase" &&
            flow.salesReceipt &&
            core.organizations.get(flow.payeeId)?.placeId === placeId,
        )
        .sort((a, b) => b.lastPaidMinor - a.lastPaidMinor)
        .slice(0, 3)
        .map((flow) => ({
          flowId: flow.id,
          sellerId: flow.payeeId,
          sellerName: core.organizations.get(flow.payeeId)?.name,
          paidLastMonthMinor: flow.lastPaidMinor,
        }))
    : [];
  const sellers = [...new Set(purchases.map((row) => row.sellerId))].slice(
    0,
    2,
  );
  const books = sellers.map((id) => ({
    sellerId: id,
    receivedMinor: core.finance.businesses.get(id)?.receivedMinor ?? 0,
    salesReceivedMinor:
      core.finance.businesses.get(id)?.salesReceivedMinor ?? 0,
    demandAnnualMinor: core.finance.businesses.get(id)?.annualDemandMinor ?? 0,
  }));
  const taxes = [...purchaseTaxes(core).values()]
    .filter((tax) => tax.placeId === placeId)
    .map((tax) => ({ taxId: tax.id, collectedMinor: tax.collectedMinor }));
  const openPositions = sellers.map((id) => ({
    sellerId: id,
    open: (
      coreAPI(core)
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .rows() as unknown as { organizationId: string; status: string }[]
    ).filter(
      (position) =>
        position.organizationId === id && position.status === "open",
    ).length,
  }));
  const groupIncome = rt
    ? [...rt.monthly.entries()]
        .filter(([key]) => key.startsWith("g:"))
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 4)
        .map(([key, row]) => ({ group: key, ...row }))
    : [];
  return { purchases, books, taxes, openPositions, groupIncome };
}

// The national month rows: what moved between the changed budget and the base.
const macroMonths = (core: Core) =>
  coreAPI(core)
    .moduleState(MACRO_MODULE_ID)
    .table("months")
    .rows() as unknown as Row[];
const finalWith = macroMonths(withChange.core)
  .filter((row) => row.kind === "simulated")
  .at(-1)!;
const finalBase = macroMonths(atBase.core)
  .filter((row) => row.kind === "simulated")
  .at(-1)!;
const output = Number(finalWith.realOutput);
const outputAtBase = Number(finalBase.realOutput);
const parameters = bandData as unknown as Record<
  string,
  { value: number; spread: { low: number; high: number; unit: string } }
>;
const band = parameters.macroFederalOutlayResponseBand!;
const nominalOutput = parameters.macroNominalOutputDollars!.value;
const outlayShare = outlayChangeMinor / nominalOutput;
const outputShare = (output - outputAtBase) / outputAtBase;
const response = outlayShare !== 0 ? outputShare / outlayShare : 0;

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      placeId,
      span: [start, withChange.core.date],
      control:
        "same seed and place; no federal line is passed, so Congress adopts the base",
      budget: {
        rowId: yearBudget.id,
        fiscalYear: yearBudget.fiscalYear,
        adoptedOn: yearBudget.adoptedOn,
        adoptedBy: yearBudget.adoptedBy,
        line: LINE,
        lineBaseMinor: base.spendingMinor[LINE] ?? 0,
        lineAdoptedMinor: yearBudget.spendingMinor[LINE] ?? 0,
        lineControlMinor: controlBudget.spendingMinor[LINE] ?? 0,
        baseTotalMinor: total(base.spendingMinor),
        adoptedTotalMinor: total(yearBudget.spendingMinor),
        controlTotalMinor: total(controlBudget.spendingMinor),
        outlayChangeMinor,
      },
      treasury: {
        withChange: landedIn(withChange),
        atBase: landedIn(atBase),
        outsidePayees: rows(withChange.core, "spendingPayments")
          .slice(0, 3)
          .map((row) => ({
            id: row.id,
            payeeName: row.payeeName,
            amountMinor: row.amountMinor,
          })),
      },
      payees: {
        // The line's change landed on named recipients (the landed rows);
        // counted households receive their share through the pooled awards.
        landedPeople,
      },
      countedSpending: {
        withChange: sellerReads(withChange.core),
        atBase: sellerReads(atBase.core),
      },
      townPaidIncomeByMonth: {
        withChange: townPaidIncome(withChange.core).slice(-13),
        atBase: townPaidIncome(atBase.core).slice(-13),
      },
      nationalOutput: {
        month: finalWith.month,
        realOutput: { withChange: output, atBase: outputAtBase },
        outputGapPct: {
          withChange: finalWith.outputGapPct,
          atBase: finalBase.outputGapPct,
        },
        townIncomeGrowthPct: {
          withChange: finalWith.townIncomeGrowthPct,
          atBase: finalBase.townIncomeGrowthPct,
        },
      },
      calibration: {
        outlayChangeShareOfOutput: outlayShare,
        outputMovedShareOfOutput: outputShare,
        response,
        band: {
          low: band.spread.low,
          high: band.spread.high,
          unit: band.spread.unit,
          centralPurchasesEstimate: band.value,
        },
        inside: response >= band.spread.low && response <= band.spread.high,
        note: "informational only: the response is what the played town's own dollars produced; the rest of the nation's outlays are paid to the outside account (SG-WORLD-macro-public-budget)",
      },
    },
    null,
    2,
  ),
);
