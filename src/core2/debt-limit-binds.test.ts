// @vitest-environment node
/** A law making a higher debt limit something to pay for holds the statutory limit: the Treasury borrows only the room under it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  debtBalanceMinor,
  debtBorrowedMinor,
  DEBT_SPLIT,
  federalDebtLimit,
  federalDebtOf,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { appliedOn } from "./law-reach/applied";
import { coreAPI } from "./state";

const QUESTION = "us-federal-positions:budget.pay-for-a-higher-debt-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "debt-limit-binds");
const borrowedSum = (core: Parameters<typeof coreAPI>[0]) =>
  federalDebtOf(coreAPI(core)).reduce((n, h) => n + debtBorrowedMinor(h), 0);
const owed = (core: Parameters<typeof coreAPI>[0]) =>
  federalDebtOf(coreAPI(core)).reduce((n, h) => n + debtBalanceMinor(h), 0);

it(
  `a pay-for law holds the debt limit and the Treasury borrows no further: ${place.name}, replay ${replay}`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const lawWorld = build();
      const control = build();
      const days = 365;
      const end = addDays(makeIsoDate(lawWorld.date), days);
      advanceCore(control, end);
      const wanted = borrowedSum(control);
      expect(
        wanted,
        "the control Treasury borrows over the year",
      ).toBeGreaterThan(0);
      // The debt stands just under the limit: room for a third of the year's borrowing.
      const api = coreAPI(lawWorld);
      const room = Math.round(wanted / 3);
      const rows = federalDebtOf(api);
      const gap = federalDebtLimit(api) - room - owed(lawWorld);
      const table = api
        .moduleState("core2-budgets-v1" as never)
        .table("federalDebt");
      // A sum written as whole units and a remainder, as the Treasury keeps it.
      const split = (total: number) => ({
        whole: Math.floor(total / DEBT_SPLIT),
        rest: total % DEBT_SPLIT,
      });
      rows.forEach((h, i) => {
        const balance = split(debtBalanceMinor(h) + (i === 0 ? gap : 0));
        // Borrowed earlier, so the world's opening debt (and the limit scaled by it) stands.
        const borrowed = split(debtBorrowedMinor(h) + (i === 0 ? gap : 0));
        table.put({
          ...h,
          balanceWhole: balance.whole,
          balanceRest: balance.rest,
          borrowedWhole: borrowed.whole,
          borrowedRest: borrowed.rest,
        } as never);
      });
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      enactLaw(api, {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: QUESTION,
        value: 1,
        effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
        measureId: "debt-limit-test",
        citation: "Test: a higher debt limit is paid for",
      });
      const borrowedBefore = borrowedSum(lawWorld);
      advanceCore(lawWorld, end);
      const limit = federalDebtLimit(api);
      const borrowed = borrowedSum(lawWorld) - borrowedBefore;
      process.stdout.write(
        `DEBT-LIMIT ${place.name} (${place.key}, seed ${place.seed}): in ${days} days the Treasury borrowed ${wanted} without the law; with it, ${borrowed} (the room under the limit was ${room}); debt ends ${owed(lawWorld)} against a limit of ${limit}\n`,
      );
      expect(owed(lawWorld)).toBeLessThanOrEqual(limit);
      expect(borrowed).toBeLessThan(wanted);
      // The law reached the Treasury: a law-reach row names it and the borrowing held back.
      const reached = appliedOn(api, QUESTION);
      expect(reached.length).toBeGreaterThan(0);
      expect(reached.reduce((n, r) => n + r.amountMinor, 0)).toBeLessThan(0);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
