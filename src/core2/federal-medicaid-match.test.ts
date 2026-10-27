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
import { nextDue, type AccountCadence, type TransferReceipt } from "./accounts";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { federalDebtOf } from "./budgets-treasury";
import { rowsOf } from "./law-reach/group-b-store";
import { coreAPI } from "./state";

const PLACES = 8;
const YEAR_DAYS = 365;
// Shares fall due monthly, so a week between readings sees every payment.
const WATCH_DAYS = 7;

interface ShareTerms {
  firstDueAt: string;
  cadence?: AccountCadence;
  endsAt?: string;
  endedAt?: string;
}

/** Every day a share fell due by its cadence, inside its active interval. */
function dueDates(terms: ShareTerms, through: string): string[] {
  const dates: string[] = [];
  const anchorDay = Number(terms.firstDueAt.slice(8, 10));
  const stop = [terms.endsAt, terms.endedAt].filter(
    (d): d is string => d !== undefined,
  );
  let at: string | undefined = terms.firstDueAt;
  while (at !== undefined && at <= through && !stop.some((d) => at! >= d)) {
    dates.push(at);
    at = terms.cadence
      ? nextDue(makeIsoDate(at), terms.cadence, anchorDay)
      : undefined;
  }
  return dates;
}

/**
 * Every federal share's payments, read against every day it fell due: the
 * due dates come from the share's cadence and active interval through the
 * last day watched, each needs a receipt dated that day, and every receipt
 * is paid in full. A missed first, middle or trailing payment fails.
 */
function missedPayments(
  receipts: ReadonlyMap<string, readonly TransferReceipt[]>,
  terms: ReadonlyMap<string, ShareTerms>,
  through: string,
): string[] {
  const problems: string[] = [];
  for (const [id, share] of terms) {
    const list = receipts.get(id) ?? [];
    const paidOn = new Set(list.map((r) => r.date));
    for (const date of dueDates(share, through))
      if (!paidOn.has(date)) problems.push(`${id}: due ${date}, no payment`);
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

it("reads every due date of a share against its payments", () => {
  const terms = new Map<string, ShareTerms>([
    [
      "share",
      {
        firstDueAt: "2025-01-20",
        cadence: { kind: "months", every: 1 },
      },
    ],
  ]);
  const paid = (dates: string[]) =>
    new Map([["share", dates.map((d) => receipt(d, 500, 500))]]);
  const through = "2025-04-20";
  // Every month paid.
  expect(
    missedPayments(
      paid(["2025-01-20", "2025-02-20", "2025-03-20", "2025-04-20"]),
      terms,
      through,
    ),
  ).toEqual([]);
  // First month missed, later ones paid.
  expect(
    missedPayments(
      paid(["2025-02-20", "2025-03-20", "2025-04-20"]),
      terms,
      through,
    ),
  ).toEqual(["share: due 2025-01-20, no payment"]);
  // A missing middle month.
  expect(
    missedPayments(
      paid(["2025-01-20", "2025-03-20", "2025-04-20"]),
      terms,
      through,
    ),
  ).toEqual(["share: due 2025-02-20, no payment"]);
  // Missing trailing months, with only the first receipt present.
  expect(missedPayments(paid(["2025-01-20"]), terms, through)).toEqual([
    "share: due 2025-02-20, no payment",
    "share: due 2025-03-20, no payment",
    "share: due 2025-04-20, no payment",
  ]);
  // Never paid at all.
  expect(missedPayments(new Map(), terms, through)).toHaveLength(4);
  // A first payment unpaid in full is flagged too.
  expect(
    missedPayments(
      new Map([
        [
          "share",
          [
            receipt("2025-01-20", 500, 0),
            receipt("2025-02-20", 500, 500),
            receipt("2025-03-20", 500, 500),
            receipt("2025-04-20", 500, 500),
          ],
        ],
      ]),
      terms,
      through,
    ),
  ).toEqual(["share: 2025-01-20 paid 0 of 500"]);
  // A share that ended before a date owes nothing on or after it.
  const ended = new Map(terms);
  ended.set("share", { ...terms.get("share")!, endsAt: "2025-03-20" });
  expect(
    missedPayments(paid(["2025-01-20", "2025-02-20"]), ended, through),
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
      const terms = new Map<string, ShareTerms>();
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
          if (!obligation) continue;
          terms.set(obligationId, {
            firstDueAt: obligation.firstDueAt,
            cadence: obligation.cadence,
            endsAt: obligation.endsAt,
            endedAt: obligation.endedAt,
          });
          const last = obligation.lastReceipt;
          if (!last) continue;
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
      const problems = missedPayments(receipts, terms, core.date);
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
