/**
 * The federal treasury pays its share of Medicaid expansion each time it
 * falls due: a played year in Guymon, Oklahoma (where the shortfall was
 * found) and in places drawn from all 56 whose law in force expands
 * Medicaid. Each names its place and seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { TransferReceipt } from "./accounts";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { federalDebtOf } from "./budgets-treasury";
import { rowsOf } from "./law-reach/group-b-store";
import { coreAPI } from "./state";

const PLACES = 8;
const YEAR_DAYS = 365;
// Shares fall due monthly, so a week between readings sees every payment.
const WATCH_DAYS = 7;

/**
 * Every federal share's payments, read the day each fell due: the first
 * receipt is dated on the share's first due day, and every receipt paid in
 * full. A first payment missed and a later one paid fails on the first.
 */
function missedPayments(
  receipts: ReadonlyMap<string, readonly TransferReceipt[]>,
  firstDue: ReadonlyMap<string, string>,
): string[] {
  const problems: string[] = [];
  for (const [id, list] of receipts) {
    if (list[0]!.date !== firstDue.get(id))
      problems.push(
        `${id}: first payment on ${list[0]!.date}, due ${firstDue.get(id)}`,
      );
    for (const r of list)
      if (r.shortMinor > 0 || r.paidMinor !== r.requestedMinor)
        problems.push(
          `${id}: ${r.date} paid ${r.paidMinor} of ${r.requestedMinor}`,
        );
  }
  return problems;
}

const receipt = (date: string, requested: number, paid: number) =>
  ({
    id: `r@${date}`,
    date,
    from: "a",
    to: "b",
    requestedMinor: requested,
    paidMinor: paid,
    shortMinor: requested - paid,
    reasonKey: "x",
  }) as TransferReceipt;

it("flags a share whose first payment was missed even when a later one is paid", () => {
  const firstDue = new Map([["share", "2025-01-20"]]);
  expect(
    missedPayments(
      new Map([
        [
          "share",
          [receipt("2025-01-20", 500, 0), receipt("2025-02-20", 500, 500)],
        ],
      ]),
      firstDue,
    ),
  ).toHaveLength(1);
  expect(
    missedPayments(
      new Map([["share", [receipt("2025-02-20", 500, 500)]]]),
      firstDue,
    ),
  ).toHaveLength(1);
  expect(
    missedPayments(
      new Map([
        [
          "share",
          [receipt("2025-01-20", 500, 500), receipt("2025-02-20", 500, 500)],
        ],
      ]),
      firstDue,
    ),
  ).toEqual([]);
});
const WANTED = 3;

it(
  "pays the federal share of every covered adult's care each time it falls due",
  () => {
    const tried: string[] = [];
    let witnessed = 0;
    for (let n = 0; n < PLACES && witnessed < WANTED; n++) {
      const draw = n
        ? drawPlace(randomBytes(32).toString("hex"), `federal-medicaid:${n}`)
        : {
            name: "Guymon, Oklahoma",
            key: "4031750",
            seed: "f28d686032d0850a26acef3082270a78f69609b37910a396c2c07c5e2dd13196",
          };
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      const federal = governments(api).find((g) => g.level === "federal")!;
      const accounts = api.accounts();
      const treasury = accounts.main(federal.organizationId);
      const lent = () =>
        federalDebtOf(api).reduce((sum, row) => sum + row.borrowedMinor, 0);
      const lentBefore = lent();
      const balances: number[] = [];
      const start = core.date;
      // Watch the whole year week by week: each federal coverage share's
      // payment receipt (dated the day it fell due) is read as it is made,
      // not summed at the end.
      const receipts = new Map<string, TransferReceipt[]>();
      const firstDue = new Map<string, string>();
      let step = WATCH_DAYS;
      let known = -1;
      let ids: string[] = [];
      for (let day = 0; day < YEAR_DAYS; day += step) {
        step = Math.min(WATCH_DAYS, YEAR_DAYS - day);
        advanceCore(core, addDays(makeIsoDate(core.date), step));
        // New shares are found only when the table grows.
        const rows = rowsOf<{
          id: string;
          governmentId: string;
          obligationId: string;
        }>(api, "taken");
        if (rows.length !== known) {
          known = rows.length;
          ids = rows
            .filter(
              (row) =>
                row.id.startsWith("coverage|") &&
                row.governmentId === federal.id,
            )
            .map((row) => row.obligationId);
        }
        for (const obligationId of ids) {
          const obligation = accounts.obligation(obligationId);
          const last = obligation?.lastReceipt;
          if (!obligation || !last) continue;
          firstDue.set(obligationId, obligation.firstDueAt);
          const seen = receipts.get(obligationId) ?? [];
          if (seen.at(-1)?.id !== last.id) {
            seen.push(last);
            receipts.set(obligationId, seen);
          }
        }
        if (Math.floor((day + step) / 30) > Math.floor(day / 30))
          balances.push(accounts.balance(treasury));
      }
      expect(core.date, `${label}: the played year`).toBe(
        addDays(makeIsoDate(start), YEAR_DAYS),
      );
      const problems = missedPayments(receipts, firstDue);
      expect(problems, `${label}: federal shares not paid when due`).toEqual(
        [],
      );
      const due = receipts.size;
      const paid = [...receipts.values()]
        .flat()
        .reduce((sum, r) => sum + r.paidMinor, 0);
      const shares = [...receipts.keys()].map((obligationId) => ({
        obligationId,
      }));
      tried.push(
        `${label}: ${due} federal coverage shares came due, paid ${paid}; treasury low ${Math.min(...balances)}`,
      );
      if (!due) continue;
      witnessed += 1;
      process.stdout.write(
        `federal Medicaid share: ${label}; ${due} came due, paid ${paid}, e.g. ${shares[0]!.obligationId}; treasury balance by month ${balances.join(", ")}; borrowed in the year ${lent() - lentBefore}\n`,
      );
    }
    process.stdout.write(`federal medicaid draws: ${tried.join("; ")}\n`);
    expect(
      witnessed,
      `fewer than ${WANTED} places paid a federal Medicaid share: ${tried.join("; ")}`,
    ).toBe(WANTED);
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container; up to PLACES of them.
  },
  PLACES * 300_000,
);
