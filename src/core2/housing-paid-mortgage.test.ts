import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { bankView } from "../bench/bank";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { MortgageTerms } from "./housing-mortgages";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { setJournalTrace } from "./journal-state";
import type { CashJournalInput } from "./journal";
import { coreAPI, fillInPerson } from "./state";
import { corePlaceByKey } from "./place-lookup";

const drawReplay =
  process.env.PAID_MORTGAGE_SEED ?? randomBytes(8).toString("hex");
const cases = process.env.PAID_MORTGAGE_PLACE
  ? [
      {
        label: "reported regression",
        replay: drawReplay,
        placeKey: process.env.PAID_MORTGAGE_PLACE,
        requireShortfall: true,
        suffix: "",
      },
    ]
  : [
      {
        label: "drawn world",
        replay: drawReplay,
        placeKey: undefined,
        requireShortfall: false,
        suffix: "",
      },
      // The bug was reported at Echo, Utah, whose homes then opened at its
      // county's Census value, far above what its people earn, so a group
      // always fell short. Homes now open at what the town's own pay supports
      // (pins family 25, Nov 17), so the case is found by drawing places until
      // one has a group short on housing in a month another group pays in full.
      {
        label: "a counted group's shortfall beside a paid one",
        replay: `${drawReplay}:shortfall`,
        placeKey: undefined,
        requireShortfall: true,
        suffix: ".shortfall.json",
      },
    ];
/** Places a drawn case plays before it fails by name. */
const DRAWS = 4;
type Loan = MortgageTerms & {
  id: string;
  missedMonths?: number;
  foreclosedAt?: string;
};

/** One drawn or named world played for a year, checking every counted mortgage paid in full on its review day. */
function playYear(key: string, seed: string) {
  const name = corePlaceByKey(key)!.displayName;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const api = coreAPI(core);
  const table = api.moduleState("housing").table("mortgages");
  const rt = residentsRuntime(core)!;
  const reviewDay = api.parameter("housingReviewDay");
  const checks: Record<string, unknown>[] = [];
  const payments: Readonly<CashJournalInput>[] = [];
  setJournalTrace((row) => {
    if (row.sourceRef.id.startsWith("mortgage:")) payments.push(row);
  });
  let alongsideShortfall = 0;
  try {
    for (let day = 0; day < 365; day++) {
      const next = addDays(makeIsoDate(core.date), 1);
      const before =
        Number(next.slice(-2)) === reviewDay
          ? new Map(
              (table.rows() as unknown as Loan[]).map((row) => [
                row.id,
                { ...row },
              ]),
            )
          : undefined;
      advanceCore(core, next);
      if (!before) continue;
      for (const [id, prior] of before) {
        if (
          prior.monthsLeft <= 0 ||
          prior.foreclosedAt ||
          core.finance.contracts.has(id)
        )
          continue;
        const ix = rt.store.householdOf.get(prior.householdId);
        const household =
          ix === undefined ? undefined : rt.store.households[ix];
        if (!household || household.gone) continue;
        const payment = rt.housingMonth.get(household.group);
        if (
          !payment ||
          payment.month !== core.date.slice(0, 7) ||
          payment.asked <= 0 ||
          payment.paid < payment.asked
        )
          continue;
        const after = table.get(id) as unknown as Loan;
        if (!after || after.foreclosedAt) continue;
        const flow = [...rt.flows.values()].find(
          (row) => row.amountByContract?.[id] !== undefined,
        );
        if (!flow || flow.endedAt) continue;
        const expected = Math.max(
          0,
          prior.balanceMinor +
            Math.round(
              (prior.balanceMinor * prior.rate) /
                api.parameter("macroMonthsPerYear"),
            ) -
            prior.paymentMinor,
        );
        const shortfall = [...rt.housingMonth.values()].some(
          (row) => row.month === payment.month && row.paid < row.asked,
        );
        const fund = rt.funds.get(household.group);
        const receipts = payments.filter(
          (entry) =>
            entry.date.slice(0, 7) === payment.month &&
            entry.sourceRef.id.startsWith(`${flow.id}@`) &&
            entry.postings.some(
              (posting) => posting.accountId === fund && posting.deltaMinor < 0,
            ),
        );
        const witness = {
          place: name,
          key,
          seed,
          date: core.date,
          id,
          group: rt.store.groups[household.group]!.id,
          payment: { ...payment },
          flowId: flow.id,
          journalIds: receipts.map((entry) => entry.id),
          before: prior.balanceMinor,
          after: after.balanceMinor,
          expected,
          shortfall,
        };
        expect(receipts.length, JSON.stringify(witness)).toBeGreaterThan(0);
        expect(after.balanceMinor, JSON.stringify(witness)).toBe(expected);
        expect(after.monthsLeft, JSON.stringify(witness)).toBe(
          expected > 0 ? prior.monthsLeft - 1 : 0,
        );
        expect(after.missedMonths ?? 0, JSON.stringify(witness)).toBe(0);
        checks.push(witness);
        if (shortfall) alongsideShortfall++;
      }
    }
  } finally {
    setJournalTrace(null);
  }
  return {
    name,
    key,
    seed,
    core,
    api,
    table,
    rt,
    reviewDay,
    checks,
    payments,
    alongsideShortfall,
  };
}

it.each(cases)(
  "$label: credits the household's own payment before and after fill-in",
  ({ replay, placeKey, requireShortfall, suffix }) => {
    // A drawn case draws places until one has a paid counted mortgage (and,
    // for the shortfall case, a group short beside a paid one), naming each
    // place passed over (drawn-place-tests). A named place plays once.
    const tried: string[] = [];
    const draws = placeKey ? 1 : DRAWS;
    let world: ReturnType<typeof playYear> | undefined;
    for (let attempt = 0; attempt < draws; attempt++) {
      const place = drawPlace(
        attempt ? `${replay}:${attempt}` : replay,
        "paid-mortgage",
      );
      world = playYear(placeKey ?? place.key, placeKey ? replay : place.seed);
      const found =
        world.checks.length > 0 &&
        (!requireShortfall || world.alongsideShortfall > 0);
      if (found) break;
      tried.push(
        `${world.name} ${world.key} ${world.seed}: ${world.checks.length > 0 ? "no group short beside a paid one" : "no paid counted mortgage"}`,
      );
    }
    const {
      name,
      key,
      seed,
      core,
      api,
      table,
      rt,
      reviewDay,
      checks,
      payments,
      alongsideShortfall,
    } = world!;
    expect(
      checks.length,
      `${name} ${key} ${replay}: no paid counted mortgage in ${tried.length + 1} drawn places (passed over: ${tried.join("; ") || "none"})`,
    ).toBeGreaterThan(0);
    // The shortfall case must expose the cross-group bug. A fresh town may
    // pay every bill; its exact per-loan assertions still all run.
    if (requireShortfall)
      expect(
        alongsideShortfall,
        `${name} ${key} ${replay}: no paid household alongside another group's shortfall in ${tried.length + 1} drawn places (passed over: ${tried.join("; ") || "none"})`,
      ).toBeGreaterThan(0);
    const nextMonth = addDays(
      makeIsoDate(`${core.date.slice(0, 7)}-01`),
      32,
    ).slice(0, 7);
    advanceCore(core, makeIsoDate(`${nextMonth}-02`));
    // Meeting an actual borrower fills their existing household in; Money reads
    // the same amortized loan. No loan, cash or payment is supplied by the test.
    const checkedIds = new Set(checks.map((row) => row.id));
    const loan = (table.rows() as unknown as Loan[]).find((row) => {
      const ix = rt.store.householdOf.get(row.householdId);
      const household = ix === undefined ? undefined : rt.store.households[ix];
      return (
        checkedIds.has(row.id) &&
        core.organizations.get(row.holderId)?.outsideFlow !== undefined &&
        row.monthsLeft > 0 &&
        !row.foreclosedAt &&
        household &&
        !household.gone &&
        rt.store.countedCount(household) > 0
      );
    });
    expect(
      loan,
      `${name} ${replay}: no surviving paid borrower to meet`,
    ).toBeDefined();
    const household =
      rt.store.households[rt.store.householdOf.get(loan!.householdId)!]!;
    const groupReceipt = { ...rt.housingMonth.get(household.group)! };
    const personId = rt.store.ids[rt.store.countedMembers(household)[0]!]!;
    fillInPerson(core, personId);
    const person = core.people.get(personId)!;
    const money = bankView(core, personId);
    const debt = money?.debts.find((row) => row.id === loan!.id);
    expect(debt?.owedMinor, `${name} ${replay} Money ${personId}`).toBe(
      loan!.balanceMinor,
    );
    const ownFlow = [...rt.flows.values()].find(
      (flow) =>
        flow.financeKind === "household.mortgage" &&
        !flow.amountByContract &&
        core.people.get(flow.payerId)?.householdId === person.householdId &&
        !flow.endedAt,
    );
    expect(
      ownFlow,
      `${name} ${replay}: no personal mortgage flow`,
    ).toBeDefined();
    const carried = {
      month: ownFlow!.lastPaidMonth,
      asked: ownFlow!.lastRequestedMinor,
      paid: ownFlow!.lastPaidMinor,
    };
    expect(carried).toEqual({
      month: groupReceipt.month,
      asked: loan!.paymentMinor,
      paid: Math.round(
        loan!.paymentMinor *
          Math.min(1, groupReceipt.paid / groupReceipt.asked),
      ),
    });
    const followup: unknown[] = [];
    for (let month = 0; month < 2; month++) {
      const before = table.get(loan!.id) as unknown as Loan;
      const atMonth =
        month === 0
          ? nextMonth
          : addDays(makeIsoDate(`${nextMonth}-01`), 32).slice(0, 7);
      advanceCore(
        core,
        makeIsoDate(`${atMonth}-${String(reviewDay).padStart(2, "0")}`),
      );
      expect(ownFlow!.lastPaidMonth).toBe(atMonth);
      const share = Math.min(
        1,
        ownFlow!.lastPaidMinor! / ownFlow!.lastRequestedMinor!,
      );
      const expected = Math.max(
        0,
        before.balanceMinor +
          Math.round(
            (before.balanceMinor * before.rate) /
              api.parameter("macroMonthsPerYear"),
          ) -
          Math.round(before.paymentMinor * share),
      );
      const after = table.get(loan!.id) as unknown as Loan;
      expect(
        after.balanceMinor,
        `${name} ${replay}: filled-in ${loan!.id} ${atMonth}`,
      ).toBe(expected);
      followup.push({
        date: core.date,
        flowId: ownFlow!.id,
        asked: ownFlow!.lastRequestedMinor,
        paid: ownFlow!.lastPaidMinor,
        before: before.balanceMinor,
        after: after.balanceMinor,
      });
    }
    const reader = {
      personId,
      name: `${person.givenName} ${person.familyName}`,
      householdId: person.householdId,
      loanId: loan!.id,
      balanceMinor: loan!.balanceMinor,
      debt,
      carried,
      followup,
    };
    if (process.env.PAID_MORTGAGE_PROOF)
      writeFileSync(
        process.env.PAID_MORTGAGE_PROOF + suffix,
        JSON.stringify(
          { place: name, key, replay, seed, checks, payments, reader },
          null,
          2,
        ),
      );
  },
  300_000,
);
