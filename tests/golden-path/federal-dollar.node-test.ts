/**
 * The federal dollar's chain, asserted in a played world: the town builds
 * exactly as the player gets it (`buildBenchWorld`, two-level, every module the
 * bench installs) and runs a game year. In one world the player passes a
 * federal budget line in dev mode — Social Security up a twentieth, on the same
 * writer the president's own February request uses — and Congress votes it on
 * the fiscal year's first day; in the control world no line is passed and the
 * year's budget adopts at its base. The test follows the dollars by record id
 * and fails when any link is missing:
 *
 *   the budget row → the treasury's journal entries (the payment ids of its
 *   monthly closes) → payees the dollars reached in town (the Social Security
 *   recipients whose awards the line changed, full people and counted
 *   households, and the businesses paid the town's share of purchases) →
 *   their spending on named sellers (the purchase flows with sales receipts,
 *   the sellers' books, the sales tax collected) → the jobs engine reading
 *   the sellers' demand → the town's paid income, which the national month
 *   row reads. National output no longer answers the budget through a
 *   coefficient: the change is read only through the dollars that landed,
 *   so the control world's last month is the "before".
 *
 * Run: node --max-old-space-size=8192 --import tsx --test tests/golden-path/federal-dollar.node-test.ts
 * (plain node:test under tsx, as the played-world suite runs). A random seed
 * when PLAYED_WORLD_SEED is unset; the place is drawn from all 56 by the seed.
 * A year whose Congress does not pass the line draws the next place (up to
 * ten); if none passes it, the test fails, never skips.
 */
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "./place";
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
import { purchaseTaxes } from "../../src/core2/modules/purchase-tax";
import federalBase from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };

const OPENING_DATE = gameStartDate();
const seed = process.env.PLAYED_WORLD_SEED ?? randomBytes(20).toString("hex");
let place = drawPlace(seed, "federal-dollar");
const start = OPENING_DATE;
// A year and a quarter: the national step hears the town's own growth only
// from the months that have a year-earlier month to compare with (its weight
// rises a twelfth for each), so the last link needs the first months of the
// second year after the opening (macro.ts, `townGrowthHeard`).
const end = addDays(makeIsoDate(start), 450);
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
const table = (
  core: ReturnType<typeof buildBenchWorld>["core"],
  name: string,
) =>
  coreAPI(core)
    .moduleState(BUDGETS_MODULE_ID)
    .table(name)
    .rows() as unknown as Row[];
const total = (record: Readonly<Record<string, number>>) =>
  Object.values(record).reduce((a, b) => a + b, 0);

/** One played world for a game year. `changes` is the federal budget line the
 * player passes in dev mode (re-asserted daily until Congress votes, so the
 * president's own February request cannot overwrite it); `{}` holds the year's
 * budget at its base. */
function play(
  changes: Readonly<Record<string, number>>,
  /** Stop at once (returning null) if Congress has voted the base budget in. */
  bailUnlessChanged = false,
) {
  const world = buildBenchWorld(seed, OPENING_DATE, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const federal = governments(api).find((row) => row.level === "federal")!;
  const voted = () =>
    budgetsOf(api, federal.id).some((row) => row.startsOn > OPENING_DATE);
  const began = performance.now();
  for (let day = start; day < end;) {
    const next = addDays(makeIsoDate(day), 1);
    advanceCore(core, next);
    if (!voted()) {
      // Dev mode's federal budget line, on the writer the president's own
      // request uses, until the fiscal year's vote takes it.
      setBudgetPriorities(api, {
        governmentId: federal.id,
        setBy: "dev-mode budget line",
        changes,
      });
    }
    day = next;
    // The fiscal year's vote has come in by the middle of October; a budget
    // that did not take the line makes the rest of this year pointless.
    if (bailUnlessChanged && day === addDays(makeIsoDate(start), 280)) {
      const row = budgetsOf(api, federal.id)
        .filter((b) => b.startsOn > OPENING_DATE)
        .at(0);
      const base = row && baseBudget(api, federal, Number(row.fiscalYear));
      if (
        !row ||
        !base ||
        total(row.spendingMinor as Record<string, number>) ===
          total(base.spendingMinor)
      )
        return null;
    }
  }
  return {
    world,
    core,
    api,
    federal,
    seconds: Math.round((performance.now() - began) / 1000),
  };
}

interface Chain {
  budgetRow: Row | undefined;
  paymentIds: string[];
  businessPayees: { paymentId: string; organizationId: string }[];
  landedPeople: Row[];
  countedFlows: { flowId: string; sellerId: string }[];
  sellers: { sellerId: string; receivedMinor: number }[];
  salesTaxCollectedMinor: number;
  /** The highest sales-tax rate the law in force put on the town's sales. */
  salesTaxRatePercent: number;
  townPaidIncomeByMonth: [string, number][];
  realOutput: number;
}

/** The chain's links, read from one played world's own records. */
function chainOf(run: NonNullable<ReturnType<typeof play>>): Chain {
  const { core, api, federal, world } = run;
  const budgetRow = budgetsOf(api, federal.id)
    .filter((row) => row.startsOn > start)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .at(-1) as unknown as Row | undefined;
  const months = table(core, "treasuryMonths")
    .filter((row) => row.governmentId === federal.id)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const paymentIds = months.flatMap(
    (row) => row.paymentIds as unknown as string[],
  );
  // Purchase payments name the town business they paid:
  // `treasury:{govId}:{line}:{organizationId}:{date}`.
  const businessPayees = [
    ...new Set(
      paymentIds.flatMap((id) => {
        const matched = /^treasury:[^:]+:[^:]+:(.+):\d{4}-\d{2}-\d{2}$/.exec(
          id,
        );
        return matched ? [{ paymentId: id, organizationId: matched[1]! }] : [];
      }),
    ),
  ];
  // The Social Security line's change landed on named recipients by record id.
  const landedPeople = table(core, "landed").filter(
    (row) => row.personId !== undefined,
  );
  const rt = residentsRuntime(core);
  const countedFlows = rt
    ? [...rt.flows.values()]
        .filter(
          (flow) =>
            !flow.endedAt &&
            flow.kind === "purchase" &&
            flow.salesReceipt &&
            core.organizations.get(flow.payeeId)?.placeId === world.placeId,
        )
        .sort((a, b) => b.lastPaidMinor - a.lastPaidMinor)
        .slice(0, 5)
        .map((flow) => ({ flowId: flow.id, sellerId: flow.payeeId }))
    : [];
  const sellers = [...new Set(countedFlows.map((row) => row.sellerId))]
    .slice(0, 3)
    .map((sellerId) => ({
      sellerId,
      receivedMinor: core.finance.businesses.get(sellerId)?.receivedMinor ?? 0,
    }));
  const salesTaxCollectedMinor = [...purchaseTaxes(core).values()].reduce(
    (sum, tax) => sum + tax.collectedMinor,
    0,
  );
  const salesTaxRatePercent = Math.max(
    0,
    ...[...purchaseTaxes(core).values()].map((tax) => tax.ratePercent),
  );
  const paidIncome = new Map<string, number>();
  for (const [key, minor] of core.finance.paidIncomeByPlaceMonth)
    if (key.endsWith(`:${world.placeId}`)) {
      const month = key.slice(0, "YYYY-MM".length);
      paidIncome.set(month, (paidIncome.get(month) ?? 0) + minor);
    }
  const finalMacro = (
    coreAPI(core)
      .moduleState("macro")
      .table("months")
      .rows() as unknown as Row[]
  )
    .filter((row) => row.kind === "simulated")
    .at(-1)!;
  return {
    budgetRow,
    paymentIds,
    businessPayees,
    landedPeople,
    countedFlows,
    sellers,
    salesTaxCollectedMinor,
    salesTaxRatePercent,
    townPaidIncomeByMonth: [...paidIncome.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    realOutput: Number(finalMacro.realOutput),
  };
}

describe(`the federal dollar's chain (seed ${seed})`, () => {
  let withChange: NonNullable<ReturnType<typeof play>>;
  let atBase: NonNullable<ReturnType<typeof play>>;
  let chain: Chain;
  let control: Chain;
  let passed = false;

  before(() => {
    // Congress votes the line or not by its members' own reasons, so a given
    // place may not pass it; the next drawn place is tried, up to ten.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 10 && !passed; attempt += 1) {
      place = drawPlace(`${seed}:${attempt}`, "federal-dollar");
      const run = play({ [LINE]: lineChangeMinor }, true);
      tried.push(`${place.key}: ${run ? "passed" : "not passed"}`);
      if (!run) continue;
      withChange = run;
      chain = chainOf(withChange);
      passed = true;
    }
    assert.ok(
      passed,
      `Congress passed the line in none of: ${tried.join("; ")}`,
    );
    atBase = play({});
    control = chainOf(atBase);
    console.log(
      JSON.stringify({
        federalDollar: {
          seed,
          place: `${withChange.world.place.displayName} (${place.key})`,
          line: LINE,
          lineChangeMinor,
          passedByCongress: passed,
          withChangeSeconds: withChange.seconds,
          atBaseSeconds: atBase.seconds,
          budgetRow: chain.budgetRow?.id,
          realOutput: {
            withChange: chain.realOutput,
            atBase: control.realOutput,
          },
        },
      }),
    );
  });

  it("Congress adopts the passed federal budget line", () => {
    assert.ok(
      (chain.budgetRow!.spendingMinor as Record<string, number>)[LINE]! >
        (control.budgetRow?.spendingMinor as Record<string, number>)[LINE]!,
      `the adopted budget's ${LINE} line did not take the passed change`,
    );
  });

  it("the treasury's closes paid named recipients by journal entry", () => {
    assert.ok(
      chain.paymentIds.length,
      "the federal treasury closed months but recorded no payment ids",
    );
    const inTown = table(withChange.core, "treasuryMonths")
      .filter((row) => row.governmentId === withChange.federal.id)
      .flatMap((row) =>
        Object.values(row.lines as unknown as Record<string, Row>),
      )
      .reduce(
        (sum, line) =>
          sum +
          Number(line.inTownMinor ?? 0) +
          Number(line.providersMinor ?? 0),
        0,
      );
    assert.ok(
      inTown > 0,
      "the federal treasury paid nothing in town: no dollar reaches a payee to follow",
    );
  });

  it("named payees received the dollars and spent them at named sellers", () => {
    // Full people: the Social Security line's change landed on recipients by
    // record id. Counted households: the purchase flows with sales receipts.
    assert.ok(
      chain.landedPeople.length,
      "the Social Security line changed but no named recipient's award landed",
    );
    assert.ok(
      chain.countedFlows.length,
      "no counted household group spent at a town seller this year",
    );
    assert.ok(
      chain.sellers.length,
      "no seller received the counted households' spending",
    );
  });

  it("the jobs and tax engines read the sellers' sales", () => {
    // The law in force decides: a place whose laws put no sales tax on its
    // sales collects none, and any rate above zero must collect something.
    assert.ok(
      chain.salesTaxRatePercent > 0
        ? chain.salesTaxCollectedMinor > 0
        : chain.salesTaxCollectedMinor === 0,
      `sales tax rate ${chain.salesTaxRatePercent}% but ${chain.salesTaxCollectedMinor} collected on the town's sales`,
    );
    assert.ok(
      chain.sellers.some((row) => row.receivedMinor > 0),
      "the sellers' books recorded no receipts the jobs engine could read",
    );
  });

  it("the town's paid income moved and the national month row heard it", () => {
    // The macro read: the town's paid income is the only route the budget's
    // dollars move national output now.
    assert.ok(
      chain.townPaidIncomeByMonth.length >= 3,
      "the town has no paid-income months for the national step to read",
    );
    const lastWith = chain.townPaidIncomeByMonth.at(-1)![1];
    const lastBase = control.townPaidIncomeByMonth.at(-1)![1];
    // One town is its share of the nation: the move can be small, but a year
    // of a changed federal budget must not leave the town's paid income
    // exactly where the base-budget control left it.
    assert.ok(
      lastWith > lastBase,
      `the town's last paid-income month did not rise with the passed line (${lastWith} at base ${lastBase}): the dollars landed on no read`,
    );
    assert.notEqual(
      chain.realOutput,
      control.realOutput,
      "national output is identical with the changed budget and at its base: the town's paid-income read moved nothing",
    );
  });
});
