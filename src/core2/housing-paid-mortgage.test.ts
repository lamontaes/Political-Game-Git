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
      {
        label: "reported Echo shortfall",
        replay:
          "2d3cadf85fab3908af3e4cdbe95e98d5a45108549587024e8f762e4ba336c335",
        placeKey: "4921880",
        requireShortfall: true,
        suffix: ".echo.json",
      },
    ];
type Loan = MortgageTerms & {
  id: string;
  missedMonths?: number;
  foreclosedAt?: string;
};

it.each(cases)(
  "$label: credits the household's own payment before and after fill-in",
  ({ replay, placeKey, requireShortfall, suffix }) => {
    const place = drawPlace(replay, "paid-mortgage");
    const key = placeKey ?? place.key;
    const name = corePlaceByKey(key)!.displayName;
    const seed = placeKey ? replay : place.seed;
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
                (posting) =>
                  posting.accountId === fund && posting.deltaMinor < 0,
              ),
          );
          const witness = {
            place: name,
            key,
            replay,
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
    expect(
      checks.length,
      `${name} ${key} ${replay}: no paid counted mortgage`,
    ).toBeGreaterThan(0);
    // The reported Echo case must expose the cross-group bug. A fresh town
    // may pay every bill; its exact per-loan assertions still all run.
    if (requireShortfall)
      expect(
        alongsideShortfall,
        `${name} ${key} ${replay}: no paid household alongside another group's shortfall`,
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
